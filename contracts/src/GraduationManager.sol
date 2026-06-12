// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20Minimal} from "./interfaces/ILaunchpad.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

library GraduationPlanner {
    function encodeMintPosition(
        PoolKey memory poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint128 amount0Max,
        uint128 amount1Max,
        address owner,
        address sweepRecipient
    ) internal pure returns (bytes memory) {
        bytes memory actions = new bytes(4);
        actions[0] = bytes1(uint8(Actions.MINT_POSITION));
        actions[1] = bytes1(uint8(Actions.CLOSE_CURRENCY));
        actions[2] = bytes1(uint8(Actions.CLOSE_CURRENCY));
        actions[3] = bytes1(uint8(Actions.SWEEP));

        bytes[] memory params = new bytes[](4);
        params[0] = abi.encode(poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, owner, bytes(""));
        params[1] = abi.encode(poolKey.currency0);
        params[2] = abi.encode(poolKey.currency1);
        params[3] = abi.encode(poolKey.currency0, sweepRecipient);

        return abi.encode(actions, params);
    }
}

/// @notice Migrates graduated bonding-curve liquidity to ZugSwap / Uniswap V4.
/// @dev Uses the deployed ZugSwap PositionManager and native ZUG (`address(0)`) pool leg.
contract GraduationManager {
    using PoolIdLibrary for PoolKey;

    address public owner;
    address public bondingCurveManager;
    address public poolManager;
    address public positionManager;
    address public permit2;
    address public wzug;
    address public liquiditySink;

    uint24 public defaultFee = 3_000; // 0.30%
    int24 public defaultTickSpacing = 60;
    uint48 public permit2Expiration = type(uint48).max;
    uint256 public deadlineBuffer = 15 minutes;

    mapping(address => bool) public graduated;

    event GraduationStarted(address indexed token, address indexed creator, uint256 zugAmount, uint256 tokenAmount);
    event LiquidityMigrated(address indexed token, bytes32 indexed poolId, uint256 zugAmount, uint256 tokenAmount);
    event Graduated(address indexed token, bytes32 indexed poolId, uint256 positionTokenId);
    event ConfigUpdated(address poolManager, address positionManager, address permit2, address wzug, address liquiditySink);
    event PoolParamsUpdated(uint24 fee, int24 tickSpacing);
    event DeadlineBufferUpdated(uint256 deadlineBuffer);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotBondingCurveManager();
    error ZeroAddress();
    error AlreadyGraduated();
    error InvalidAmount();
    error InvalidPoolParams();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyBondingCurveManager() {
        if (msg.sender != bondingCurveManager) revert NotBondingCurveManager();
        _;
    }

    constructor(
        address owner_,
        address poolManager_,
        address positionManager_,
        address permit2_,
        address wzug_,
        address liquiditySink_
    ) {
        if (
            owner_ == address(0) ||
            poolManager_ == address(0) ||
            positionManager_ == address(0) ||
            permit2_ == address(0) ||
            wzug_ == address(0) ||
            liquiditySink_ == address(0)
        ) revert ZeroAddress();

        owner = owner_;
        poolManager = poolManager_;
        positionManager = positionManager_;
        permit2 = permit2_;
        wzug = wzug_;
        liquiditySink = liquiditySink_;
        emit OwnershipTransferred(address(0), owner_);
        emit ConfigUpdated(poolManager_, positionManager_, permit2_, wzug_, liquiditySink_);
    }

    receive() external payable {}

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setBondingCurveManager(address bondingCurveManager_) external onlyOwner {
        if (bondingCurveManager_ == address(0)) revert ZeroAddress();
        bondingCurveManager = bondingCurveManager_;
    }

    function setV4Config(
        address poolManager_,
        address positionManager_,
        address permit2_,
        address wzug_,
        address liquiditySink_
    ) external onlyOwner {
        if (
            poolManager_ == address(0) ||
            positionManager_ == address(0) ||
            permit2_ == address(0) ||
            wzug_ == address(0) ||
            liquiditySink_ == address(0)
        ) revert ZeroAddress();

        poolManager = poolManager_;
        positionManager = positionManager_;
        permit2 = permit2_;
        wzug = wzug_;
        liquiditySink = liquiditySink_;
        emit ConfigUpdated(poolManager_, positionManager_, permit2_, wzug_, liquiditySink_);
    }

    function setPoolParams(uint24 fee, int24 tickSpacing) external onlyOwner {
        if (fee == 0 || fee >= 1_000_000 || tickSpacing <= 0 || tickSpacing > TickMath.MAX_TICK_SPACING) {
            revert InvalidPoolParams();
        }
        defaultFee = fee;
        defaultTickSpacing = tickSpacing;
        emit PoolParamsUpdated(fee, tickSpacing);
    }

    function setDeadlineBuffer(uint256 deadlineBuffer_) external onlyOwner {
        if (deadlineBuffer_ < 1 minutes || deadlineBuffer_ > 1 days) revert InvalidAmount();
        deadlineBuffer = deadlineBuffer_;
        emit DeadlineBufferUpdated(deadlineBuffer_);
    }

    function graduate(
        address token,
        address creator,
        uint256 zugAmount,
        uint256 tokenAmount
    ) external payable onlyBondingCurveManager returns (bytes32 poolId, uint256 positionTokenId) {
        if (token == address(0) || creator == address(0)) revert ZeroAddress();
        if (graduated[token]) revert AlreadyGraduated();
        if (msg.value != zugAmount || zugAmount == 0 || tokenAmount == 0) revert InvalidAmount();

        graduated[token] = true;

        if (!IERC20Minimal(token).transferFrom(msg.sender, address(this), tokenAmount)) {
            revert TransferFailed();
        }

        emit GraduationStarted(token, creator, zugAmount, tokenAmount);

        (poolId, positionTokenId) = _initializeAndMintV4Liquidity(token, zugAmount, tokenAmount);

        emit LiquidityMigrated(token, poolId, zugAmount, tokenAmount);
        emit Graduated(token, poolId, positionTokenId);
    }

    function _initializeAndMintV4Liquidity(
        address token,
        uint256 zugAmount,
        uint256 tokenAmount
    ) internal returns (bytes32 poolId, uint256 positionTokenId) {
        PoolKey memory poolKey = _nativeZugPoolKey(token);
        uint160 sqrtPriceX96 = _encodeSqrtPriceX96(zugAmount, tokenAmount);

        int24 tickLower = TickMath.minUsableTick(defaultTickSpacing);
        int24 tickUpper = TickMath.maxUsableTick(defaultTickSpacing);
        uint128 amount0Max = _toUint128(zugAmount);
        uint128 amount1Max = _toUint128(tokenAmount);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            zugAmount,
            tokenAmount
        );
        if (liquidity == 0) revert InvalidAmount();

        positionTokenId = IPositionManager(positionManager).nextTokenId();

        if (!IERC20Minimal(token).approve(permit2, tokenAmount)) revert TransferFailed();
        IAllowanceTransfer(permit2).approve(token, positionManager, _toUint160(tokenAmount), permit2Expiration);

        IPositionManager(positionManager).initializePool(poolKey, sqrtPriceX96);

        bytes memory unlockData = GraduationPlanner.encodeMintPosition(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            liquiditySink,
            address(this)
        );
        IPositionManager(positionManager).modifyLiquidities{value: zugAmount}(unlockData, block.timestamp + deadlineBuffer);

        _lockDust(token);

        PoolId id = poolKey.toId();
        poolId = PoolId.unwrap(id);
    }

    function _nativeZugPoolKey(address token) internal view returns (PoolKey memory poolKey) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: defaultFee,
            tickSpacing: defaultTickSpacing,
            hooks: IHooks(address(0))
        });
    }

    function _encodeSqrtPriceX96(uint256 amount0, uint256 amount1) internal pure returns (uint160) {
        if (amount0 == 0 || amount1 == 0) revert InvalidAmount();
        uint256 ratioX192 = FullMath.mulDiv(amount1, 1 << 192, amount0);
        return _toUint160(_sqrt(ratioX192));
    }

    function _lockDust(address token) internal {
        uint256 tokenDust = IERC20Minimal(token).balanceOf(address(this));
        if (tokenDust > 0 && !IERC20Minimal(token).transfer(liquiditySink, tokenDust)) revert TransferFailed();

        uint256 nativeDust = address(this).balance;
        if (nativeDust > 0) {
            (bool ok, ) = payable(liquiditySink).call{value: nativeDust}("");
            if (!ok) revert TransferFailed();
        }
    }

    function _toUint128(uint256 value) internal pure returns (uint128) {
        if (value > type(uint128).max) revert InvalidAmount();
        return uint128(value);
    }

    function _toUint160(uint256 value) internal pure returns (uint160) {
        if (value > type(uint160).max) revert InvalidAmount();
        return uint160(value);
    }

    function _sqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;

        uint256 y = x;
        z = 1;
        if (y >= 1 << 128) {
            y >>= 128;
            z <<= 64;
        }
        if (y >= 1 << 64) {
            y >>= 64;
            z <<= 32;
        }
        if (y >= 1 << 32) {
            y >>= 32;
            z <<= 16;
        }
        if (y >= 1 << 16) {
            y >>= 16;
            z <<= 8;
        }
        if (y >= 1 << 8) {
            y >>= 8;
            z <<= 4;
        }
        if (y >= 1 << 4) {
            y >>= 4;
            z <<= 2;
        }
        if (y >= 1 << 2) {
            z <<= 1;
        }

        unchecked {
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            z = (z + x / z) >> 1;
            uint256 zRoundDown = x / z;
            return z < zRoundDown ? z : zRoundDown;
        }
    }
}

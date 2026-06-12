// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20Minimal, IGraduationManager} from "./interfaces/ILaunchpad.sol";

/// @notice Pre-graduation native ZUG <-> meme token bonding-curve trading.
/// @dev MVP skeleton with virtual-reserve constant-product pricing.
contract BondingCurveManager {
    struct CurveState {
        address token;
        address creator;
        uint256 reserveZug;
        uint256 soldTokens;
        uint256 targetZug;
        uint256 virtualZugReserve;
        uint256 virtualTokenReserve;
        bool graduationTriggered;
        bool graduated;
        bool paused;
    }

    address public owner;
    address public factory;
    address public treasury;
    IGraduationManager public graduationManager;

    uint256 public protocolFeeBps = 100; // 1%
    uint256 public creatorFeeShareBps = 2_000; // 20% of collected protocol fee
    uint256 public constant BPS = 10_000;

    mapping(address => CurveState) public curves;
    mapping(address => uint256) public pendingCreatorFees;

    bool private locked;

    event TokenRegistered(
        address indexed token,
        address indexed creator,
        uint256 totalSupply,
        uint256 targetZug,
        uint256 virtualZugReserve,
        uint256 virtualTokenReserve
    );
    event Trade(
        address indexed token,
        address indexed trader,
        bool indexed isBuy,
        uint256 zugAmount,
        uint256 tokenAmount,
        uint256 feeZug,
        uint256 reserveZug,
        uint256 soldTokens
    );
    event GraduationReady(address indexed token, uint256 reserveZug, uint256 soldTokens);
    event GraduationReset(address indexed token, uint256 reserveZug, uint256 soldTokens);
    event CurveGraduated(address indexed token, bytes32 indexed poolId, uint256 positionTokenId);
    event FeeSplit(address indexed token, address indexed creator, uint256 creatorFee, uint256 treasuryFee);
    event CreatorFeeClaimed(address indexed creator, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotFactory();
    error Reentrancy();
    error ZeroAddress();
    error InvalidConfig();
    error UnknownToken();
    error PausedOrGraduated();
    error Slippage();
    error TransferFailed();
    error InsufficientOutput();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyFactory() {
        if (msg.sender != factory) revert NotFactory();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    constructor(address owner_, address treasury_) {
        if (owner_ == address(0) || treasury_ == address(0)) revert ZeroAddress();
        owner = owner_;
        treasury = treasury_;
        emit OwnershipTransferred(address(0), owner_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setFactory(address factory_) external onlyOwner {
        if (factory_ == address(0)) revert ZeroAddress();
        factory = factory_;
    }

    function setGraduationManager(address graduationManager_) external onlyOwner {
        if (graduationManager_ == address(0)) revert ZeroAddress();
        graduationManager = IGraduationManager(graduationManager_);
    }

    function setProtocolFeeBps(uint256 feeBps) external onlyOwner {
        if (feeBps > 1_000) revert InvalidConfig(); // max 10%
        protocolFeeBps = feeBps;
    }

    function setCreatorFeeShareBps(uint256 shareBps) external onlyOwner {
        if (shareBps > 5_000) revert InvalidConfig(); // creator can receive max 50% of protocol fee
        creatorFeeShareBps = shareBps;
    }

    function registerToken(
        address token,
        address creator,
        uint256 totalSupply,
        uint256 targetZug,
        uint256 virtualZugReserve,
        uint256 virtualTokenReserve
    ) external onlyFactory {
        if (token == address(0) || creator == address(0)) revert ZeroAddress();
        if (curves[token].token != address(0)) revert InvalidConfig();
        if (totalSupply == 0 || targetZug == 0 || virtualZugReserve == 0 || virtualTokenReserve == 0) {
            revert InvalidConfig();
        }
        if (virtualTokenReserve != totalSupply) revert InvalidConfig();
        if (IERC20Minimal(token).balanceOf(address(this)) < totalSupply) revert InvalidConfig();

        curves[token] = CurveState({
            token: token,
            creator: creator,
            reserveZug: 0,
            soldTokens: 0,
            targetZug: targetZug,
            virtualZugReserve: virtualZugReserve,
            virtualTokenReserve: virtualTokenReserve,
            graduationTriggered: false,
            graduated: false,
            paused: false
        });

        emit TokenRegistered(token, creator, totalSupply, targetZug, virtualZugReserve, virtualTokenReserve);
    }

    function quoteBuy(address token, uint256 zugIn) public view returns (uint256 tokenOut, uint256 feeZug) {
        CurveState memory c = curves[token];
        if (c.token == address(0)) revert UnknownToken();

        feeZug = (zugIn * protocolFeeBps) / BPS;
        uint256 netZug = zugIn - feeZug;

        uint256 x0 = c.virtualZugReserve + c.reserveZug;
        uint256 y0 = c.virtualTokenReserve - c.soldTokens;
        uint256 k = x0 * y0;
        uint256 y1 = k / (x0 + netZug);
        tokenOut = y0 - y1;
    }

    function quoteSell(address token, uint256 tokenIn) public view returns (uint256 zugOut, uint256 feeZug) {
        CurveState memory c = curves[token];
        if (c.token == address(0)) revert UnknownToken();

        uint256 x0 = c.virtualZugReserve + c.reserveZug;
        uint256 y0 = c.virtualTokenReserve - c.soldTokens;
        uint256 k = x0 * y0;
        uint256 x1 = k / (y0 + tokenIn);
        uint256 grossZugOut = x0 - x1;

        if (grossZugOut > c.reserveZug) grossZugOut = c.reserveZug;
        feeZug = (grossZugOut * protocolFeeBps) / BPS;
        zugOut = grossZugOut - feeZug;
    }

    function buy(address token, uint256 minTokenOut) external payable nonReentrant returns (uint256 tokenOut) {
        tokenOut = _buy(token, msg.sender, minTokenOut);
    }

    function buyFor(
        address token,
        address recipient,
        uint256 minTokenOut
    ) external payable nonReentrant returns (uint256 tokenOut) {
        if (recipient == address(0)) revert ZeroAddress();
        tokenOut = _buy(token, recipient, minTokenOut);
    }

    function _buy(address token, address recipient, uint256 minTokenOut) internal returns (uint256 tokenOut) {
        CurveState storage c = curves[token];
        if (c.token == address(0)) revert UnknownToken();
        if (c.paused || c.graduated) revert PausedOrGraduated();

        uint256 feeZug;
        (tokenOut, feeZug) = quoteBuy(token, msg.value);
        if (tokenOut < minTokenOut) revert Slippage();
        if (tokenOut == 0) revert InsufficientOutput();

        c.reserveZug += (msg.value - feeZug);
        c.soldTokens += tokenOut;

        if (!IERC20Minimal(token).transfer(recipient, tokenOut)) revert TransferFailed();
        _distributeFee(token, c.creator, feeZug);

        emit Trade(token, recipient, true, msg.value, tokenOut, feeZug, c.reserveZug, c.soldTokens);

        if (c.reserveZug >= c.targetZug && !c.graduationTriggered) {
            c.graduationTriggered = true;
            c.paused = true;
            emit GraduationReady(token, c.reserveZug, c.soldTokens);
        }
    }

    function sell(address token, uint256 tokenIn, uint256 minZugOut) external nonReentrant returns (uint256 zugOut) {
        CurveState storage c = curves[token];
        if (c.token == address(0)) revert UnknownToken();
        if (c.paused || c.graduated || c.graduationTriggered) revert PausedOrGraduated();

        uint256 feeZug;
        (zugOut, feeZug) = quoteSell(token, tokenIn);
        if (zugOut < minZugOut) revert Slippage();
        if (zugOut == 0) revert InsufficientOutput();

        if (!IERC20Minimal(token).transferFrom(msg.sender, address(this), tokenIn)) revert TransferFailed();

        c.reserveZug -= (zugOut + feeZug);
        c.soldTokens -= tokenIn;

        _sendNative(payable(msg.sender), zugOut);
        _distributeFee(token, c.creator, feeZug);

        emit Trade(token, msg.sender, false, zugOut + feeZug, tokenIn, feeZug, c.reserveZug, c.soldTokens);
    }

    function graduate(address token) external nonReentrant returns (bytes32 poolId, uint256 positionTokenId) {
        CurveState storage c = curves[token];
        if (c.token == address(0)) revert UnknownToken();
        if (c.graduated) revert PausedOrGraduated();
        if (c.reserveZug < c.targetZug) revert InvalidConfig();
        if (address(graduationManager) == address(0)) revert ZeroAddress();

        c.paused = true;
        c.graduationTriggered = true;

        uint256 tokenAmount = IERC20Minimal(token).balanceOf(address(this));
        if (!IERC20Minimal(token).approve(address(graduationManager), tokenAmount)) revert TransferFailed();

        (poolId, positionTokenId) = graduationManager.graduate{value: c.reserveZug}(
            token,
            c.creator,
            c.reserveZug,
            tokenAmount
        );

        c.graduated = true;
        c.reserveZug = 0;
        emit CurveGraduated(token, poolId, positionTokenId);
    }

    /// @notice Owner-controlled recovery if the keeper cannot graduate after threshold.
    /// @dev Allows sells to reopen and reduce reserve below target; the next buy can trigger graduation again.
    function resetGraduationTrigger(address token) external onlyOwner {
        CurveState storage c = curves[token];
        if (c.token == address(0)) revert UnknownToken();
        if (c.graduated) revert PausedOrGraduated();

        c.graduationTriggered = false;
        c.paused = false;
        emit GraduationReset(token, c.reserveZug, c.soldTokens);
    }

    function pauseToken(address token, bool paused) external onlyOwner {
        if (curves[token].token == address(0)) revert UnknownToken();
        curves[token].paused = paused;
    }

    function claimCreatorFees() external nonReentrant returns (uint256 amount) {
        amount = pendingCreatorFees[msg.sender];
        pendingCreatorFees[msg.sender] = 0;
        _sendNative(payable(msg.sender), amount);
        emit CreatorFeeClaimed(msg.sender, amount);
    }

    function _sendNative(address payable to, uint256 amount) internal {
        if (amount == 0) return;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _distributeFee(address token, address creator, uint256 feeZug) internal {
        if (feeZug == 0) return;

        uint256 creatorFee = (feeZug * creatorFeeShareBps) / BPS;
        uint256 treasuryFee = feeZug - creatorFee;

        pendingCreatorFees[creator] += creatorFee;
        _sendNative(payable(treasury), treasuryFee);

        emit FeeSplit(token, creator, creatorFee, treasuryFee);
    }
}

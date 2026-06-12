// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IBondingCurveManager} from "./interfaces/ILaunchpad.sol";
import {MemeTokenImplementation} from "./MemeTokenImplementation.sol";

/// @notice Creates meme tokens and auto-lists them in BondingCurveManager.
contract MemeFactory {
    address public owner;
    address public treasury;
    IBondingCurveManager public bondingCurveManager;

    uint256 public createFee;
    uint256 public defaultTotalSupply = 1_000_000_000 ether;
    uint256 public defaultTargetZug = 20_000 ether;
    uint256 public defaultVirtualZugReserve = 5_000 ether;
    uint256 public defaultVirtualTokenReserve = 1_000_000_000 ether;

    uint256 public constant MAX_NAME_LENGTH = 64;
    uint256 public constant MAX_SYMBOL_LENGTH = 16;
    uint256 public constant MAX_METADATA_URI_LENGTH = 256;

    mapping(address => address[]) public creatorTokens;
    mapping(address => bool) public isLaunchpadToken;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        string metadataURI,
        uint256 totalSupply,
        uint256 targetZug,
        uint256 createdAt
    );
    event ConfigUpdated(
        address indexed treasury,
        address indexed bondingCurveManager,
        uint256 createFee,
        uint256 defaultTargetZug
    );
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error ZeroAddress();
    error InvalidInput();
    error FeeTooLow();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_, address treasury_, address bondingCurveManager_) {
        if (owner_ == address(0) || treasury_ == address(0) || bondingCurveManager_ == address(0)) {
            revert ZeroAddress();
        }

        owner = owner_;
        treasury = treasury_;
        bondingCurveManager = IBondingCurveManager(bondingCurveManager_);
        emit OwnershipTransferred(address(0), owner_);
        emit ConfigUpdated(treasury_, bondingCurveManager_, createFee, defaultTargetZug);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function createMeme(
        string calldata name,
        string calldata symbol,
        string calldata metadataURI,
        uint256 minInitialBuyTokens
    ) external payable returns (address token) {
        if (
            bytes(name).length == 0 ||
            bytes(name).length > MAX_NAME_LENGTH ||
            bytes(symbol).length == 0 ||
            bytes(symbol).length > MAX_SYMBOL_LENGTH ||
            bytes(metadataURI).length > MAX_METADATA_URI_LENGTH
        ) revert InvalidInput();
        if (msg.value < createFee) revert FeeTooLow();

        uint256 initialBuyValue = msg.value - createFee;
        if (initialBuyValue > 0 && minInitialBuyTokens == 0) revert InvalidInput();
        if (createFee > 0) _sendNative(payable(treasury), createFee);

        MemeTokenImplementation meme = new MemeTokenImplementation();
        token = address(meme);

        meme.initialize(name, symbol, msg.sender, address(bondingCurveManager), defaultTotalSupply);

        bondingCurveManager.registerToken(
            token,
            msg.sender,
            defaultTotalSupply,
            defaultTargetZug,
            defaultVirtualZugReserve,
            defaultVirtualTokenReserve
        );

        creatorTokens[msg.sender].push(token);
        isLaunchpadToken[token] = true;

        emit TokenCreated(
            token,
            msg.sender,
            name,
            symbol,
            metadataURI,
            defaultTotalSupply,
            defaultTargetZug,
            block.timestamp
        );

        if (initialBuyValue > 0) {
            bondingCurveManager.buyFor{value: initialBuyValue}(token, msg.sender, minInitialBuyTokens);
        }
    }

    function setConfig(
        address treasury_,
        address bondingCurveManager_,
        uint256 createFee_,
        uint256 defaultTotalSupply_,
        uint256 defaultTargetZug_,
        uint256 defaultVirtualZugReserve_,
        uint256 defaultVirtualTokenReserve_
    ) external onlyOwner {
        if (treasury_ == address(0) || bondingCurveManager_ == address(0)) revert ZeroAddress();
        if (
            defaultTotalSupply_ == 0 ||
            defaultTargetZug_ == 0 ||
            defaultVirtualZugReserve_ == 0 ||
            defaultVirtualTokenReserve_ == 0 ||
            defaultVirtualTokenReserve_ != defaultTotalSupply_
        ) revert InvalidInput();

        treasury = treasury_;
        bondingCurveManager = IBondingCurveManager(bondingCurveManager_);
        createFee = createFee_;
        defaultTotalSupply = defaultTotalSupply_;
        defaultTargetZug = defaultTargetZug_;
        defaultVirtualZugReserve = defaultVirtualZugReserve_;
        defaultVirtualTokenReserve = defaultVirtualTokenReserve_;

        emit ConfigUpdated(treasury_, bondingCurveManager_, createFee_, defaultTargetZug_);
    }

    function creatorTokenCount(address creator) external view returns (uint256) {
        return creatorTokens[creator].length;
    }

    function _sendNative(address payable to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

import {IERC20Minimal} from "./interfaces/ILaunchpad.sol";

/// @notice UUPS-upgradeable treasury for launchpad fees.
contract LaunchpadTreasury is Initializable, UUPSUpgradeable, Ownable2StepUpgradeable {
    event FeeReceived(address indexed payer, address indexed token, uint256 amount, bytes32 indexed reason);
    event TreasuryWithdraw(address indexed to, address indexed token, uint256 amount);

    error ZeroAddress();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) external initializer {
        if (owner_ == address(0)) revert ZeroAddress();
        __Ownable2Step_init();
        __UUPSUpgradeable_init();
        _transferOwnership(owner_);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    receive() external payable {
        emit FeeReceived(msg.sender, address(0), msg.value, keccak256("NATIVE_RECEIVE"));
    }

    function recordNativeFee(bytes32 reason) external payable {
        emit FeeReceived(msg.sender, address(0), msg.value, reason);
    }

    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit TreasuryWithdraw(to, address(0), amount);
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (!IERC20Minimal(token).transfer(to, amount)) revert TransferFailed();
        emit TreasuryWithdraw(to, token, amount);
    }

    uint256[45] private __gap;
}

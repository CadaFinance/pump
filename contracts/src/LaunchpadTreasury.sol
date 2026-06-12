// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Minimal} from "./interfaces/ILaunchpad.sol";

/// @notice Receives launchpad creation and trade fees.
contract LaunchpadTreasury {
    address public owner;
    address public pendingOwner;

    event FeeReceived(address indexed payer, address indexed token, uint256 amount, bytes32 indexed reason);
    event TreasuryWithdraw(address indexed to, address indexed token, uint256 amount);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
    }

    receive() external payable {
        emit FeeReceived(msg.sender, address(0), msg.value, keccak256("NATIVE_RECEIVE"));
    }

    function recordNativeFee(bytes32 reason) external payable {
        emit FeeReceived(msg.sender, address(0), msg.value, reason);
    }

    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit TreasuryWithdraw(to, address(0), amount);
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        if (token == address(0) || to == address(0)) revert ZeroAddress();
        if (!IERC20Minimal(token).transfer(to, amount)) revert TransferFailed();
        emit TreasuryWithdraw(to, token, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previous = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previous, owner);
    }
}

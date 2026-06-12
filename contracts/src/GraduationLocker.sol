// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Non-upgradeable sink for graduated Uniswap V4 position NFTs and dust.
/// @dev There is intentionally no withdrawal path; this contract is the anti-rug liquidity lock.
contract GraduationLocker {
    address public immutable positionManager;

    event PositionLocked(address indexed operator, address indexed from, uint256 indexed tokenId, bytes data);
    event NativeLocked(address indexed sender, uint256 amount);

    error NotPositionManager();

    constructor(address positionManager_) {
        positionManager = positionManager_;
    }

    receive() external payable {
        emit NativeLocked(msg.sender, msg.value);
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        if (msg.sender != positionManager) revert NotPositionManager();
        emit PositionLocked(operator, from, tokenId, data);
        return this.onERC721Received.selector;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IMemeFactory {
    function isLaunchpadToken(address token) external view returns (bool);
}

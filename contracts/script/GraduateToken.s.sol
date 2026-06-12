// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {BondingCurveManager} from "../src/BondingCurveManager.sol";

/// @notice Manually graduate a token after bonding target is reached (reserve >= target).
/// @dev There is no launchpad keeper yet — run this once per token when status is GRADUATING.
contract GraduateToken is Script {
    uint256 internal constant ZUGCHAIN_ID = 824642;

    function run() external {
        require(block.chainid == ZUGCHAIN_ID, "Wrong chainId, expected 824642");

        address bondingCurve = vm.envAddress("BONDING_CURVE_MANAGER");
        address token = vm.envAddress("GRADUATE_TOKEN_ADDRESS");
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        BondingCurveManager curve = BondingCurveManager(bondingCurve);

        (
            ,
            ,
            uint256 reserveZug,
            ,
            uint256 targetZug,
            ,
            ,
            bool graduationTriggered,
            bool graduated,
            bool paused
        ) = curve.curves(token);

        console2.log("Token:", token);
        console2.log("Reserve ZUG (wei):", reserveZug);
        console2.log("Target ZUG (wei):", targetZug);
        console2.log("graduationTriggered:", graduationTriggered);
        console2.log("graduated:", graduated);
        console2.log("paused:", paused);

        require(!graduated, "Already graduated");
        require(reserveZug >= targetZug, "Target not reached");

        vm.startBroadcast(privateKey);

        (bytes32 poolId, uint256 positionTokenId) = curve.graduate(token);

        vm.stopBroadcast();

        console2.log("Graduated. poolId:");
        console2.logBytes32(poolId);
        console2.log("positionTokenId:", positionTokenId);
    }
}

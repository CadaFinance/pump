// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {LaunchpadLens} from "../src/LaunchpadLens.sol";
import {LaunchpadTreasury} from "../src/LaunchpadTreasury.sol";
import {MemeFactory} from "../src/MemeFactory.sol";
import {PumpAirdropManager} from "../src/PumpAirdropManager.sol";

/// @dev Owner signs upgrade. Env: PROXY_ADDRESS (user-facing proxy, not impl).
/// Example: forge script script/UpgradeBondingCurve.s.sol --rpc-url $RPC --broadcast
contract UpgradeBondingCurve is Script {
    function run() external {
        address proxy = vm.envAddress("PROXY_ADDRESS");
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        BondingCurveManager newImpl = new BondingCurveManager();
        BondingCurveManager(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();

        console2.log("Upgraded BondingCurveManager proxy:", proxy);
        console2.log("New implementation:", address(newImpl));
    }
}

/// @dev Generic UUPS upgrade helpers for other core contracts.
contract UpgradeMemeFactory is Script {
    function run() external {
        address proxy = vm.envAddress("PROXY_ADDRESS");
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        MemeFactory newImpl = new MemeFactory();
        MemeFactory(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();

        console2.log("Upgraded MemeFactory proxy:", proxy);
        console2.log("New implementation:", address(newImpl));
    }
}

contract UpgradePumpAirdropManager is Script {
    function run() external {
        address proxy = vm.envAddress("PROXY_ADDRESS");
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        PumpAirdropManager newImpl = new PumpAirdropManager();
        PumpAirdropManager(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();

        console2.log("Upgraded PumpAirdropManager proxy:", proxy);
        console2.log("New implementation:", address(newImpl));
    }
}

contract UpgradeLaunchpadTreasury is Script {
    function run() external {
        address proxy = vm.envAddress("PROXY_ADDRESS");
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        LaunchpadTreasury newImpl = new LaunchpadTreasury();
        LaunchpadTreasury(payable(proxy)).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();

        console2.log("Upgraded LaunchpadTreasury proxy:", proxy);
        console2.log("New implementation:", address(newImpl));
    }
}

contract UpgradeLaunchpadLens is Script {
    function run() external {
        address proxy = vm.envAddress("PROXY_ADDRESS");
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(privateKey);
        LaunchpadLens newImpl = new LaunchpadLens();
        LaunchpadLens(proxy).upgradeToAndCall(address(newImpl), "");
        vm.stopBroadcast();

        console2.log("Upgraded LaunchpadLens proxy:", proxy);
        console2.log("New implementation:", address(newImpl));
    }
}

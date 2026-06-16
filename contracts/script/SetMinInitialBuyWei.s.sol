// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {MemeFactory} from "../src/MemeFactory.sol";

/// @dev Signer must be MemeFactory owner (LAUNCHPAD_OWNER_ADDRESS at deploy time).
/// Env: MEME_FACTORY_ADDRESS, MIN_INITIAL_BUY_BNB (e.g. "0.01")
contract SetMinInitialBuyWei is Script {
    function run() external {
        address factoryAddr = vm.envAddress("MEME_FACTORY_ADDRESS");
        uint256 minWei = vm.envUint("MIN_INITIAL_BUY_WEI");

        MemeFactory factory = MemeFactory(factoryAddr);
        console2.log("Factory:", factoryAddr);
        console2.log("Owner:", factory.owner());
        console2.log("Current minInitialBuyWei:", factory.minInitialBuyWei());
        console2.log("New minInitialBuyWei:", minWei);

        vm.startBroadcast();
        factory.setMinInitialBuyWei(minWei);
        vm.stopBroadcast();

        console2.log("Updated minInitialBuyWei:", factory.minInitialBuyWei());
    }
}

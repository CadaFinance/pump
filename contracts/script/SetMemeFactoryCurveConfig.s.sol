// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {MemeFactory} from "../src/MemeFactory.sol";

/// @notice Updates MemeFactory bonding curve defaults (virtual reserve + graduation target).
/// @dev Only affects newly created tokens. Signer must be MemeFactory owner.
///      Env overrides: VIRTUAL_ZUG_RESERVE_WEI (default 5000 ether), TARGET_ZUG_WEI (default 20000 ether).
contract SetMemeFactoryCurveConfig is Script {
    uint256 internal constant ZUGCHAIN_ID = 824642;
    uint256 internal constant DEFAULT_VIRTUAL_ZUG_RESERVE = 5_000 ether;
    uint256 internal constant DEFAULT_TARGET_ZUG = 20_000 ether;

    function run() external {
        require(block.chainid == ZUGCHAIN_ID, "Wrong chainId, expected 824642");

        address factoryAddress = vm.envAddress("MEME_FACTORY_ADDRESS");
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        uint256 newVirtualZug = vm.envOr("VIRTUAL_ZUG_RESERVE_WEI", DEFAULT_VIRTUAL_ZUG_RESERVE);
        uint256 newTargetZug = vm.envOr("TARGET_ZUG_WEI", DEFAULT_TARGET_ZUG);

        MemeFactory factory = MemeFactory(factoryAddress);

        address treasury = factory.treasury();
        address bondingCurveManager = address(factory.bondingCurveManager());
        uint256 createFee = factory.createFee();
        uint256 defaultTotalSupply = factory.defaultTotalSupply();
        uint256 defaultVirtualTokenReserve = factory.defaultVirtualTokenReserve();

        console2.log("MemeFactory:", factoryAddress);
        console2.log("Current virtualZug (wei):", factory.defaultVirtualZugReserve());
        console2.log("New virtualZug (wei):", newVirtualZug);
        console2.log("Current targetZug (wei):", factory.defaultTargetZug());
        console2.log("New targetZug (wei):", newTargetZug);
        console2.log("Total supply (wei):", defaultTotalSupply);

        vm.startBroadcast(privateKey);

        factory.setConfig(
            treasury,
            bondingCurveManager,
            createFee,
            defaultTotalSupply,
            newTargetZug,
            newVirtualZug,
            defaultVirtualTokenReserve
        );

        vm.stopBroadcast();

        console2.log("Done.");
        console2.log("defaultVirtualZugReserve:", factory.defaultVirtualZugReserve());
        console2.log("defaultTargetZug:", factory.defaultTargetZug());
    }
}

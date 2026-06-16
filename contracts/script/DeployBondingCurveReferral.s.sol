// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {LaunchpadLens} from "../src/LaunchpadLens.sol";
import {MemeFactory} from "../src/MemeFactory.sol";

/// @notice Upgrade BondingCurveManager UUPS proxy and refresh LaunchpadLens pointer.
/// @dev Signer must be MemeFactory owner. Reads deployments/bsc-testnet-pump.json.
contract DeployBondingCurveReferral is Script {
    using stdJson for string;

    uint256 internal constant BSC_TESTNET_ID = 97;
    string internal constant PUMP_DEPLOY_FILE = "deployments/bsc-testnet-pump.json";

    function run() external {
        require(block.chainid == BSC_TESTNET_ID, "Wrong chainId, expected BSC testnet 97");
        require(vm.exists(PUMP_DEPLOY_FILE), "Missing bsc-testnet-pump.json");

        string memory json = vm.readFile(PUMP_DEPLOY_FILE);
        address owner = json.readAddress(".owner");
        address memeFactoryAddr = json.readAddress(".memeFactory");
        address bondingProxy = json.readAddress(".bondingCurveManager");

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address signer = vm.addr(privateKey);

        MemeFactory factory = MemeFactory(memeFactoryAddr);
        require(factory.owner() == signer, "Signer must be MemeFactory owner");

        vm.startBroadcast(privateKey);

        BondingCurveManager newImpl = new BondingCurveManager();
        BondingCurveManager(payable(bondingProxy)).upgradeToAndCall(address(newImpl), "");

        LaunchpadLens lensImpl = new LaunchpadLens();
        address lensProxy = address(
            new ERC1967Proxy(
                address(lensImpl),
                abi.encodeCall(LaunchpadLens.initialize, (owner, bondingProxy))
            )
        );

        vm.stopBroadcast();

        console2.log("Upgraded BondingCurveManager proxy:", bondingProxy);
        console2.log("New implementation:", address(newImpl));
        console2.log("New LaunchpadLens proxy:", lensProxy);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {LaunchpadLens} from "../src/LaunchpadLens.sol";
import {MemeFactory} from "../src/MemeFactory.sol";

/// @notice Redeploy BondingCurveManager (referral fee support) and wire MemeFactory to it.
/// @dev Does NOT redeploy MemeFactory or Treasury. Signer must be MemeFactory owner.
///      Reads existing addresses from deployments/bsc-testnet-pump.json.
contract DeployBondingCurveReferral is Script {
    using stdJson for string;

    uint256 internal constant BSC_TESTNET_ID = 97;
    string internal constant PUMP_DEPLOY_FILE = "deployments/bsc-testnet-pump.json";

    function run() external {
        require(block.chainid == BSC_TESTNET_ID, "Wrong chainId, expected BSC testnet 97");
        require(vm.exists(PUMP_DEPLOY_FILE), "Missing bsc-testnet-pump.json");

        string memory json = vm.readFile(PUMP_DEPLOY_FILE);
        address owner = json.readAddress(".owner");
        address treasury = json.readAddress(".launchpadTreasury");
        address memeFactoryAddr = json.readAddress(".memeFactory");
        address oldBonding = json.readAddress(".bondingCurveManager");

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address signer = vm.addr(privateKey);

        MemeFactory factory = MemeFactory(memeFactoryAddr);
        require(factory.owner() == signer, "Signer must be MemeFactory owner");

        console2.log("Old BondingCurveManager:", oldBonding);
        console2.log("MemeFactory:", memeFactoryAddr);
        console2.log("Treasury:", treasury);
        console2.log("Owner:", owner);
        console2.log("Signer:", signer);

        vm.startBroadcast(privateKey);

        BondingCurveManager newBonding = new BondingCurveManager(signer, treasury);
        newBonding.setFactory(memeFactoryAddr);

        factory.setConfig(
            treasury,
            address(newBonding),
            factory.createFee(),
            factory.defaultTotalSupply(),
            factory.defaultTargetZug(),
            factory.defaultVirtualZugReserve(),
            factory.defaultVirtualTokenReserve()
        );

        LaunchpadLens newLens = new LaunchpadLens(address(newBonding));

        if (newBonding.owner() != owner) {
            newBonding.transferOwnership(owner);
        }

        vm.stopBroadcast();

        uint256 deploymentBlock = block.number;

        string memory key = "pump";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeString(key, "rpcUrl", "https://data-seed-prebsc-1-s1.bnbchain.org:8545");
        vm.serializeString(key, "abiVersion", "pump-bsc-v1");
        vm.serializeAddress(key, "owner", owner);
        vm.serializeAddress(key, "deployer", json.readAddress(".deployer"));
        vm.serializeUint(key, "deploymentBlock", deploymentBlock);
        vm.serializeAddress(key, "launchpadTreasury", treasury);
        vm.serializeAddress(
            key,
            "memeTokenImplementation",
            json.readAddress(".memeTokenImplementation")
        );
        vm.serializeAddress(key, "memeFactory", memeFactoryAddr);
        string memory out = vm.serializeAddress(key, "launchpadLens", address(newLens));
        out = vm.serializeAddress(key, "bondingCurveManager", address(newBonding));
        vm.writeJson(out, PUMP_DEPLOY_FILE);

        console2.log("========================================");
        console2.log(" REFERRAL BONDING REDEPLOY");
        console2.log(" new BondingCurveManager:", address(newBonding));
        console2.log(" new LaunchpadLens:", address(newLens));
        console2.log(" deploymentBlock:", deploymentBlock);
        console2.log(" Updated:", PUMP_DEPLOY_FILE);
        console2.log("========================================");
        console2.log("Next: push json, VM .env + migration + contract_registry + indexer");
        console2.log("Existing tokens remain on OLD bonding:", oldBonding);
    }
}

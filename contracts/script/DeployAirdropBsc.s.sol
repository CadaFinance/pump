// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {PumpAirdropManager} from "../src/PumpAirdropManager.sol";

/// @notice Additive BSC testnet deploy — only PumpAirdropManager; does not redeploy pump core.
contract DeployAirdropBsc is Script {
    uint256 internal constant BSC_TESTNET_ID = 97;
    uint256 internal constant CREATE_FEE = 0.001 ether;

    string internal constant PUMP_DEPLOY_FILE = "deployments/bsc-testnet-pump.json";
    string internal constant AIRDROP_DEPLOY_FILE = "deployments/bsc-testnet-airdrop.json";
    string internal constant ABI_VERSION = "pump-airdrop-v1";

    struct Deployed {
        address owner;
        address deployer;
        address keeper;
        address launchpadTreasury;
        address memeFactory;
        address pumpAirdropManager;
        uint256 deploymentBlock;
    }

    function run() external returns (Deployed memory d) {
        require(block.chainid == BSC_TESTNET_ID, "Wrong chainId, expected BSC testnet 97");
        require(vm.exists(PUMP_DEPLOY_FILE), "Missing bsc-testnet-pump.json - deploy pump first");

        string memory pumpJson = vm.readFile(PUMP_DEPLOY_FILE);
        d.launchpadTreasury = vm.parseJsonAddress(pumpJson, ".launchpadTreasury");
        d.memeFactory = vm.parseJsonAddress(pumpJson, ".memeFactory");

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        d.owner = vm.envAddress("LAUNCHPAD_OWNER_ADDRESS");
        d.deployer = vm.addr(privateKey);
        d.keeper = vm.envOr("AIRDROP_KEEPER_ADDRESS", d.deployer);

        require(d.owner != address(0), "LAUNCHPAD_OWNER_ADDRESS is zero");
        require(d.launchpadTreasury != address(0), "launchpadTreasury missing in pump deploy json");
        require(d.memeFactory != address(0), "memeFactory missing in pump deploy json");

        vm.startBroadcast(privateKey);

        d.pumpAirdropManager = address(
            new PumpAirdropManager(d.owner, d.launchpadTreasury, d.memeFactory, d.keeper, CREATE_FEE)
        );

        vm.stopBroadcast();

        d.deploymentBlock = block.number;
        _save(d);
        _printSummary(d);
    }

    function _save(Deployed memory d) internal {
        if (!vm.exists("deployments")) vm.createDir("deployments", true);

        string memory key = "airdrop";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeString(key, "rpcUrl", "https://data-seed-prebsc-1-s1.bnbchain.org:8545");
        vm.serializeString(key, "abiVersion", ABI_VERSION);
        vm.serializeAddress(key, "owner", d.owner);
        vm.serializeAddress(key, "deployer", d.deployer);
        vm.serializeAddress(key, "keeper", d.keeper);
        vm.serializeUint(key, "deploymentBlock", d.deploymentBlock);
        vm.serializeAddress(key, "launchpadTreasury", d.launchpadTreasury);
        vm.serializeAddress(key, "memeFactory", d.memeFactory);
        string memory out = vm.serializeAddress(key, "pumpAirdropManager", d.pumpAirdropManager);
        vm.writeJson(out, AIRDROP_DEPLOY_FILE);
    }

    function _printSummary(Deployed memory d) internal view {
        console2.log("========================================");
        console2.log(" BSC TESTNET AIRDROP DEPLOY");
        console2.log(" chainId:", block.chainid);
        console2.log(" deployer:", d.deployer);
        console2.log(" owner/admin:", d.owner);
        console2.log(" keeper:", d.keeper);
        console2.log(" deploymentBlock:", d.deploymentBlock);
        console2.log("========================================");
        console2.log(" MemeFactory:", d.memeFactory);
        console2.log(" LaunchpadTreasury:", d.launchpadTreasury);
        console2.log(" PumpAirdropManager:", d.pumpAirdropManager);
        console2.log(" Create fee:", CREATE_FEE);
        console2.log("========================================");
    }
}

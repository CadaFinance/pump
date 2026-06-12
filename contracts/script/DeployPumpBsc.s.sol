// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {LaunchpadLens} from "../src/LaunchpadLens.sol";
import {LaunchpadTreasury} from "../src/LaunchpadTreasury.sol";
import {MemeFactory} from "../src/MemeFactory.sol";
import {MemeTokenImplementation} from "../src/MemeTokenImplementation.sol";

/// @notice BSC Testnet pump deploy — no GraduationManager, targetZug = max (never graduates).
contract DeployPumpBsc is Script {
    uint256 internal constant BSC_TESTNET_ID = 97;
    uint256 internal constant MAX_TARGET_ZUG = type(uint256).max;
    uint256 internal constant VIRTUAL_ZUG_RESERVE = 5 ether;
    uint256 internal constant CREATE_FEE = 0.001 ether;

    string internal constant DEPLOY_FILE = "deployments/bsc-testnet-pump.json";
    string internal constant ABI_VERSION = "pump-bsc-v1";

    struct Deployed {
        address owner;
        address deployer;
        address launchpadTreasury;
        address memeTokenImplementation;
        address bondingCurveManager;
        address memeFactory;
        address launchpadLens;
        uint256 deploymentBlock;
    }

    function run() external returns (Deployed memory d) {
        require(block.chainid == BSC_TESTNET_ID, "Wrong chainId, expected BSC testnet 97");

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("LAUNCHPAD_OWNER_ADDRESS");
        require(owner != address(0), "LAUNCHPAD_OWNER_ADDRESS is zero");

        d.owner = owner;
        d.deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);

        d.launchpadTreasury = address(new LaunchpadTreasury(owner));
        d.memeTokenImplementation = address(new MemeTokenImplementation());
        d.bondingCurveManager = address(new BondingCurveManager(d.deployer, d.launchpadTreasury));
        d.memeFactory = address(new MemeFactory(d.deployer, d.launchpadTreasury, d.bondingCurveManager));
        d.launchpadLens = address(new LaunchpadLens(d.bondingCurveManager));

        BondingCurveManager(d.bondingCurveManager).setFactory(d.memeFactory);

        MemeFactory factory = MemeFactory(d.memeFactory);
        factory.setConfig(
            d.launchpadTreasury,
            d.bondingCurveManager,
            CREATE_FEE,
            factory.defaultTotalSupply(),
            MAX_TARGET_ZUG,
            VIRTUAL_ZUG_RESERVE,
            factory.defaultVirtualTokenReserve()
        );

        BondingCurveManager(d.bondingCurveManager).transferOwnership(owner);
        factory.transferOwnership(owner);

        vm.stopBroadcast();

        d.deploymentBlock = block.number;
        _save(d);
        _printSummary(d);
    }

    function _save(Deployed memory d) internal {
        if (!vm.exists("deployments")) vm.createDir("deployments", true);

        string memory key = "pump";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeString(key, "rpcUrl", "https://data-seed-prebsc-1-s1.bnbchain.org:8545");
        vm.serializeString(key, "abiVersion", ABI_VERSION);
        vm.serializeAddress(key, "owner", d.owner);
        vm.serializeAddress(key, "deployer", d.deployer);
        vm.serializeUint(key, "deploymentBlock", d.deploymentBlock);
        vm.serializeAddress(key, "launchpadTreasury", d.launchpadTreasury);
        vm.serializeAddress(key, "memeTokenImplementation", d.memeTokenImplementation);
        vm.serializeAddress(key, "bondingCurveManager", d.bondingCurveManager);
        vm.serializeAddress(key, "memeFactory", d.memeFactory);
        string memory out = vm.serializeAddress(key, "launchpadLens", d.launchpadLens);
        vm.writeJson(out, DEPLOY_FILE);
    }

    function _printSummary(Deployed memory d) internal view {
        console2.log("========================================");
        console2.log(" BSC TESTNET PUMP DEPLOY");
        console2.log(" chainId:", block.chainid);
        console2.log(" deployer:", d.deployer);
        console2.log(" owner:", d.owner);
        console2.log(" deploymentBlock:", d.deploymentBlock);
        console2.log("========================================");
        console2.log(" MemeFactory:", d.memeFactory);
        console2.log(" BondingCurveManager:", d.bondingCurveManager);
        console2.log(" LaunchpadLens:", d.launchpadLens);
        console2.log(" Create fee:", CREATE_FEE);
        console2.log(" Target ZUG: MAX (no graduation)");
        console2.log("========================================");
    }
}

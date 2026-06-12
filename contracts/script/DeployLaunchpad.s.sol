// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {GraduationLocker} from "../src/GraduationLocker.sol";
import {GraduationManager} from "../src/GraduationManager.sol";
import {LaunchpadLens} from "../src/LaunchpadLens.sol";
import {LaunchpadTreasury} from "../src/LaunchpadTreasury.sol";
import {MemeFactory} from "../src/MemeFactory.sol";
import {MemeTokenImplementation} from "../src/MemeTokenImplementation.sol";

contract DeployLaunchpad is Script {
    uint256 internal constant ZUGCHAIN_ID = 824642;

    address internal constant WZUG = 0xe22702a1fbFCefF9967Fe60F09cBE3F54D6c41a2;
    address internal constant PERMIT2 = 0x8665ae3119b9eb9D76Bd614D7132d0706A6A5a05;
    address internal constant POOL_MANAGER = 0x6458AA52dF5970Eb0154C1E30e81A362daEa8B81;
    address internal constant POSITION_MANAGER = 0x0496B7a65231A39776D71ADb48F4ce35d484f689;
    address internal constant V4_QUOTER = 0x4771228b99A225AF38c435E468Ff59f5CcFdCe8E;
    address internal constant STATE_VIEW = 0x3dB287506877D9FDD05E998a117531aCBef2e5e5;
    address internal constant V4_SWAP_ROUTER = 0x06779a1fE8DDEbaDc368d147d0f22A882E750E1e;

    string internal constant DEPLOY_DIR = "deployments";
    string internal constant DEPLOY_FILE = "deployments/zugchain-launchpad.json";
    string internal constant ABI_VERSION = "launchpad-v1";

    struct Deployed {
        address owner;
        address deployer;
        address launchpadTreasury;
        address memeTokenImplementation;
        address bondingCurveManager;
        address graduationLocker;
        address graduationManager;
        address memeFactory;
        address launchpadLens;
        uint256 deploymentBlock;
    }

    function run() external returns (Deployed memory d) {
        require(block.chainid == ZUGCHAIN_ID, "Wrong chainId, expected ZugChain");

        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("LAUNCHPAD_OWNER_ADDRESS");
        require(owner != address(0), "LAUNCHPAD_OWNER_ADDRESS is zero");

        d.owner = owner;
        d.deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);

        d.launchpadTreasury = address(new LaunchpadTreasury(owner));
        d.memeTokenImplementation = address(new MemeTokenImplementation());
        d.bondingCurveManager = address(new BondingCurveManager(d.deployer, d.launchpadTreasury));
        d.graduationLocker = address(new GraduationLocker(POSITION_MANAGER));
        d.graduationManager =
            address(new GraduationManager(d.deployer, POOL_MANAGER, POSITION_MANAGER, PERMIT2, WZUG, d.graduationLocker));
        d.memeFactory = address(new MemeFactory(d.deployer, d.launchpadTreasury, d.bondingCurveManager));
        d.launchpadLens = address(new LaunchpadLens(d.bondingCurveManager));

        BondingCurveManager(d.bondingCurveManager).setFactory(d.memeFactory);
        BondingCurveManager(d.bondingCurveManager).setGraduationManager(d.graduationManager);
        GraduationManager(payable(d.graduationManager)).setBondingCurveManager(d.bondingCurveManager);

        BondingCurveManager(d.bondingCurveManager).transferOwnership(owner);
        GraduationManager(payable(d.graduationManager)).transferOwnership(owner);
        MemeFactory(d.memeFactory).transferOwnership(owner);

        vm.stopBroadcast();

        d.deploymentBlock = block.number;
        _save(d);
        _printSummary(d);
    }

    function _save(Deployed memory d) internal {
        if (!vm.exists(DEPLOY_DIR)) vm.createDir(DEPLOY_DIR, true);

        string memory key = "launchpad";
        vm.serializeUint(key, "chainId", block.chainid);
        vm.serializeString(key, "rpcUrl", "https://rpc.zugchain.org");
        vm.serializeString(key, "abiVersion", ABI_VERSION);
        vm.serializeAddress(key, "owner", d.owner);
        vm.serializeAddress(key, "deployer", d.deployer);
        vm.serializeUint(key, "deploymentBlock", d.deploymentBlock);

        vm.serializeAddress(key, "wzug", WZUG);
        vm.serializeAddress(key, "permit2", PERMIT2);
        vm.serializeAddress(key, "poolManager", POOL_MANAGER);
        vm.serializeAddress(key, "positionManager", POSITION_MANAGER);
        vm.serializeAddress(key, "v4Quoter", V4_QUOTER);
        vm.serializeAddress(key, "stateView", STATE_VIEW);
        vm.serializeAddress(key, "v4SwapRouter", V4_SWAP_ROUTER);

        vm.serializeAddress(key, "launchpadTreasury", d.launchpadTreasury);
        vm.serializeAddress(key, "memeTokenImplementation", d.memeTokenImplementation);
        vm.serializeAddress(key, "bondingCurveManager", d.bondingCurveManager);
        vm.serializeAddress(key, "graduationLocker", d.graduationLocker);
        vm.serializeAddress(key, "graduationManager", d.graduationManager);
        vm.serializeAddress(key, "memeFactory", d.memeFactory);
        string memory out = vm.serializeAddress(key, "launchpadLens", d.launchpadLens);

        vm.writeJson(out, DEPLOY_FILE);
    }

    function _printSummary(Deployed memory d) internal view {
        console2.log("========================================");
        console2.log(" ZUGCHAIN LAUNCHPAD DEPLOY SUMMARY");
        console2.log(" chainId:", block.chainid);
        console2.log(" deployer:", d.deployer);
        console2.log(" owner:", d.owner);
        console2.log(" deploymentBlock:", d.deploymentBlock);
        console2.log("========================================");
        console2.log(" LaunchpadTreasury:", d.launchpadTreasury);
        console2.log(" MemeTokenImplementation:", d.memeTokenImplementation);
        console2.log(" BondingCurveManager:", d.bondingCurveManager);
        console2.log(" GraduationLocker:", d.graduationLocker);
        console2.log(" GraduationManager:", d.graduationManager);
        console2.log(" MemeFactory:", d.memeFactory);
        console2.log(" LaunchpadLens:", d.launchpadLens);
        console2.log("========================================");
        console2.log(" Deployment JSON:", DEPLOY_FILE);
    }
}

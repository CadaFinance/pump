// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {LaunchpadLens} from "../src/LaunchpadLens.sol";
import {LaunchpadTreasury} from "../src/LaunchpadTreasury.sol";
import {MemeFactory} from "../src/MemeFactory.sol";
import {MemeTokenImplementation} from "../src/MemeTokenImplementation.sol";
import {PumpAirdropManager} from "../src/PumpAirdropManager.sol";

/// @notice Shared UUPS proxy deploy helpers for scripts and tests.
library UUPSDeploy {
    function deployTreasury(address owner) internal returns (LaunchpadTreasury treasury) {
        LaunchpadTreasury impl = new LaunchpadTreasury();
        bytes memory init = abi.encodeCall(LaunchpadTreasury.initialize, (owner));
        treasury = LaunchpadTreasury(payable(address(new ERC1967Proxy(address(impl), init))));
    }

    function deployBondingCurve(address owner, address treasury) internal returns (BondingCurveManager bonding) {
        BondingCurveManager impl = new BondingCurveManager();
        bytes memory init = abi.encodeCall(BondingCurveManager.initialize, (owner, treasury));
        bonding = BondingCurveManager(payable(address(new ERC1967Proxy(address(impl), init))));
    }

    function deployMemeFactory(
        address owner,
        address treasury,
        address bonding,
        address memeTokenImplementation
    ) internal returns (MemeFactory factory) {
        MemeFactory impl = new MemeFactory();
        bytes memory init = abi.encodeCall(MemeFactory.initialize, (owner, treasury, bonding, memeTokenImplementation));
        factory = MemeFactory(address(new ERC1967Proxy(address(impl), init)));
    }

    function deployLaunchpadLens(address owner, address bonding) internal returns (LaunchpadLens lens) {
        LaunchpadLens impl = new LaunchpadLens();
        bytes memory init = abi.encodeCall(LaunchpadLens.initialize, (owner, bonding));
        lens = LaunchpadLens(address(new ERC1967Proxy(address(impl), init)));
    }

    function deployAirdropManager(
        address admin,
        address treasury,
        address memeFactory,
        address keeper,
        uint256 createFee
    ) internal returns (PumpAirdropManager manager) {
        PumpAirdropManager impl = new PumpAirdropManager();
        bytes memory init = abi.encodeCall(PumpAirdropManager.initialize, (admin, treasury, memeFactory, keeper, createFee));
        manager = PumpAirdropManager(payable(address(new ERC1967Proxy(address(impl), init))));
    }

    function deployMemeTokenImplementation() internal returns (address) {
        return address(new MemeTokenImplementation());
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {GraduationLocker} from "../src/GraduationLocker.sol";
import {GraduationManager} from "../src/GraduationManager.sol";
import {LaunchpadTreasury} from "../src/LaunchpadTreasury.sol";
import {MemeFactory} from "../src/MemeFactory.sol";

interface IERC721OwnerOf {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract GraduationForkTest is Test {
    address internal constant POOL_MANAGER = 0x6458AA52dF5970Eb0154C1E30e81A362daEa8B81;
    address internal constant POSITION_MANAGER = 0x0496B7a65231A39776D71ADb48F4ce35d484f689;
    address internal constant PERMIT2 = 0x8665ae3119b9eb9D76Bd614D7132d0706A6A5a05;
    address internal constant WZUG = 0xe22702a1fbFCefF9967Fe60F09cBE3F54D6c41a2;

    address internal owner = address(0xA11CE);
    address internal creator = address(0xC0FFEE);
    address internal trader = address(0xB0B);

    function testForkGraduatesToLiveZugSwapV4PositionManager() public {
        string memory rpcUrl = vm.envOr("ZUGCHAIN_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) vm.skip(true);
        vm.createSelectFork(rpcUrl);

        LaunchpadTreasury treasury = new LaunchpadTreasury(owner);
        GraduationLocker locker = new GraduationLocker(POSITION_MANAGER);
        GraduationManager graduation =
            new GraduationManager(owner, POOL_MANAGER, POSITION_MANAGER, PERMIT2, WZUG, address(locker));
        BondingCurveManager bonding = new BondingCurveManager(owner, address(treasury));
        MemeFactory factory = new MemeFactory(owner, address(treasury), address(bonding));

        vm.startPrank(owner);
        bonding.setFactory(address(factory));
        bonding.setGraduationManager(address(graduation));
        graduation.setBondingCurveManager(address(bonding));
        factory.setConfig(address(treasury), address(bonding), 0, 1_000_000 ether, 10 ether, 10 ether, 1_000_000 ether);
        vm.stopPrank();

        vm.deal(creator, 100 ether);
        vm.deal(trader, 100 ether);

        vm.prank(creator);
        address token = factory.createMeme("Fork Zug", "FZUG", "ipfs://fork-zug", 0);

        vm.prank(trader);
        bonding.buy{value: 11 ether}(token, 1);

        (bytes32 poolId, uint256 positionTokenId) = bonding.graduate(token);

        assertTrue(poolId != bytes32(0));
        assertGt(positionTokenId, 0);
        assertEq(IERC721OwnerOf(POSITION_MANAGER).ownerOf(positionTokenId), address(locker));
    }
}

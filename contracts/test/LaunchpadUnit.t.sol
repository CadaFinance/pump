// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {BondingCurveManager} from "../src/BondingCurveManager.sol";
import {GraduationLocker} from "../src/GraduationLocker.sol";
import {LaunchpadTreasury} from "../src/LaunchpadTreasury.sol";
import {MemeFactory} from "../src/MemeFactory.sol";
import {MemeTokenImplementation} from "../src/MemeTokenImplementation.sol";
import {IERC20Minimal} from "../src/interfaces/ILaunchpad.sol";

contract MockGraduationManager {
    event MockGraduated(address indexed token, address indexed creator, uint256 zugAmount, uint256 tokenAmount);

    function graduate(
        address token,
        address creator,
        uint256 zugAmount,
        uint256 tokenAmount
    ) external payable returns (bytes32 poolId, uint256 positionTokenId) {
        require(msg.value == zugAmount, "bad value");
        require(IERC20Minimal(token).transferFrom(msg.sender, address(this), tokenAmount), "transfer failed");
        emit MockGraduated(token, creator, zugAmount, tokenAmount);
        return (bytes32(uint256(0x1234)), 77);
    }
}

contract LaunchpadUnitTest is Test {
    address internal owner = address(0xA11CE);
    address internal creator = address(0xC0FFEE);
    address internal trader = address(0xB0B);
    address internal treasuryOwner = address(0x7A);

    LaunchpadTreasury internal treasury;
    BondingCurveManager internal bonding;
    MemeFactory internal factory;
    MockGraduationManager internal graduation;

    function setUp() public {
        treasury = new LaunchpadTreasury(treasuryOwner);
        bonding = new BondingCurveManager(owner, address(treasury));
        factory = new MemeFactory(owner, address(treasury), address(bonding));
        graduation = new MockGraduationManager();

        vm.startPrank(owner);
        bonding.setFactory(address(factory));
        bonding.setGraduationManager(address(graduation));
        factory.setConfig(address(treasury), address(bonding), 0, 1_000_000 ether, 10 ether, 10 ether, 1_000_000 ether);
        vm.stopPrank();

        vm.deal(creator, 100 ether);
        vm.deal(trader, 100 ether);
    }

    function testCreateMemeDeploysFullTokenAndRegistersCurve() public {
        vm.prank(creator);
        address token = factory.createMeme("Zug Dog", "ZDOG", "ipfs://zug-dog", 0);

        assertTrue(factory.isLaunchpadToken(token));
        assertEq(factory.creatorTokenCount(creator), 1);
        assertEq(MemeTokenImplementation(token).creator(), creator);
        assertEq(MemeTokenImplementation(token).balanceOf(address(bonding)), 1_000_000 ether);

        (address curveToken, address curveCreator,,,,,, bool graduationTriggered, bool graduated, bool paused) =
            bonding.curves(token);
        assertEq(curveToken, token);
        assertEq(curveCreator, creator);
        assertFalse(graduationTriggered);
        assertFalse(graduated);
        assertFalse(paused);
    }

    function testBuySellAndCreatorFeeClaim() public {
        vm.prank(creator);
        address token = factory.createMeme("Zug Cat", "ZCAT", "ipfs://zug-cat", 0);

        vm.prank(trader);
        uint256 bought = bonding.buy{value: 1 ether}(token, 1);
        assertGt(bought, 0);
        assertGt(bonding.pendingCreatorFees(creator), 0);

        vm.startPrank(trader);
        MemeTokenImplementation(token).approve(address(bonding), bought / 2);
        uint256 zugOut = bonding.sell(token, bought / 2, 1);
        vm.stopPrank();
        assertGt(zugOut, 0);

        uint256 creatorBalanceBefore = creator.balance;
        vm.prank(creator);
        uint256 claimed = bonding.claimCreatorFees();
        assertGt(claimed, 0);
        assertEq(creator.balance, creatorBalanceBefore + claimed);
    }

    function testGraduationThresholdAndRecoveryReset() public {
        vm.prank(creator);
        address token = factory.createMeme("Zug Bull", "ZBULL", "ipfs://zug-bull", 0);

        vm.prank(trader);
        bonding.buy{value: 11 ether}(token, 1);

        (,,,,,,, bool graduationTriggered,, bool paused) = bonding.curves(token);
        assertTrue(graduationTriggered);
        assertTrue(paused);

        vm.prank(owner);
        bonding.resetGraduationTrigger(token);

        (,,,,,,, graduationTriggered,, paused) = bonding.curves(token);
        assertFalse(graduationTriggered);
        assertFalse(paused);
    }

    function testGraduateMovesStateAfterSuccessfulMigration() public {
        vm.prank(creator);
        address token = factory.createMeme("Zug Moon", "ZMOON", "ipfs://zug-moon", 0);

        vm.prank(trader);
        bonding.buy{value: 11 ether}(token, 1);

        (, uint256 positionTokenId) = bonding.graduate(token);
        assertEq(positionTokenId, 77);

        (,, uint256 reserveZug,,,,,, bool graduated, bool paused) = bonding.curves(token);
        assertEq(reserveZug, 0);
        assertTrue(graduated);
        assertTrue(paused);
    }

    function testFactoryRequiresInitialBuySlippage() public {
        vm.expectRevert(MemeFactory.InvalidInput.selector);
        vm.prank(creator);
        factory.createMeme{value: 1 ether}("No Slippage", "NOSLIP", "ipfs://noslip", 0);
    }

    function testLockerOnlyAcceptsPositionManagerNft() public {
        address positionManager = address(0xBEEF);
        GraduationLocker locker = new GraduationLocker(positionManager);

        vm.prank(address(0xBAD));
        vm.expectRevert(GraduationLocker.NotPositionManager.selector);
        locker.onERC721Received(address(this), address(this), 1, "");

        vm.prank(positionManager);
        bytes4 selector = locker.onERC721Received(address(this), address(this), 1, "locked");
        assertEq(selector, locker.onERC721Received.selector);
    }

    function testOwnershipTransferLocksOldAdmin() public {
        address newOwner = address(0xFEED);

        vm.prank(owner);
        bonding.transferOwnership(newOwner);
        assertEq(bonding.owner(), newOwner);

        vm.prank(owner);
        vm.expectRevert(BondingCurveManager.NotOwner.selector);
        bonding.setProtocolFeeBps(50);

        vm.prank(newOwner);
        bonding.setProtocolFeeBps(50);
        assertEq(bonding.protocolFeeBps(), 50);

        vm.prank(owner);
        factory.transferOwnership(newOwner);
        assertEq(factory.owner(), newOwner);

        vm.prank(newOwner);
        factory.setConfig(address(treasury), address(bonding), 0, 1_000_000 ether, 10 ether, 10 ether, 1_000_000 ether);
    }
}

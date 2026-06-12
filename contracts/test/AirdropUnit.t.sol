// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PumpAirdropManager} from "../src/PumpAirdropManager.sol";
import {MemeTokenImplementation} from "../src/MemeTokenImplementation.sol";
import {IERC20Minimal} from "../src/interfaces/ILaunchpad.sol";

contract MockMemeFactory {
    mapping(address => bool) public isLaunchpadToken;

    function setLaunchpadToken(address token, bool allowed) external {
        isLaunchpadToken[token] = allowed;
    }
}

contract AirdropUnitTest is Test {
    PumpAirdropManager internal manager;
    MockMemeFactory internal factory;
    MemeTokenImplementation internal linkedToken;
    MemeTokenImplementation internal rewardToken;

    address internal admin = address(0xA11CE);
    address internal treasury = address(0x7A);
    address internal keeper = address(0xBEEF);
    address internal creator = address(0xC0FFEE);
    address internal winner = address(0xB0B);
    address internal loser = address(0xBAD);

    uint256 internal constant CREATE_FEE = 0.001 ether;

    function setUp() public {
        factory = new MockMemeFactory();
        linkedToken = new MemeTokenImplementation();
        rewardToken = new MemeTokenImplementation();

        factory.setLaunchpadToken(address(linkedToken), true);
        factory.setLaunchpadToken(address(rewardToken), true);

        manager = new PumpAirdropManager(admin, treasury, address(factory), keeper, CREATE_FEE);

        vm.deal(creator, 100 ether);
        vm.deal(winner, 1 ether);
        vm.deal(loser, 1 ether);
    }

    function testRewardAmountForRankMatchesFixedFormula() public view {
        uint256 total = 10 ether;
        assertEq(manager.rewardAmountForRank(total, 1), (total * 1500) / 10_000);
        assertEq(manager.rewardAmountForRank(total, 2), (total * 1000) / 10_000);
        assertEq(manager.rewardAmountForRank(total, 3), (total * 500) / 10_000);
        assertEq(manager.rewardAmountForRank(total, 4), (total * 7000) / 10_000 / 97);
        assertEq(manager.rewardAmountForRank(total, 100), (total * 7000) / 10_000 / 97);
    }

    function testCreateFinalizeClaimBnbReward() public {
        uint256 reward = 1 ether;
        uint64 start = uint64(block.timestamp + 1 hours);
        uint64 end = uint64(block.timestamp + 2 days);
        bytes32 rulesHash = keccak256("rules");

        vm.prank(creator);
        uint256 id = manager.createAirdrop{value: reward + CREATE_FEE}(
            address(linkedToken), address(0), reward, rulesHash, start, end
        );

        (,,, uint256 totalFunded,,,,,, uint64 qualifyEnd, uint64 claimStart, uint64 claimEnd,,) = manager.airdrops(id);
        assertEq(totalFunded, reward);
        assertEq(claimStart, qualifyEnd);
        assertEq(claimEnd, qualifyEnd + manager.CLAIM_DURATION());

        vm.warp(end + 1);

        bytes32[] memory proof = _singleLeafProof(winner, reward);
        vm.prank(keeper);
        manager.finalizeAirdrop(id, _root(winner, reward), reward);

        vm.warp(claimStart);
        vm.prank(winner);
        manager.claim(id, reward, proof);

        assertEq(winner.balance, 1 ether + reward);
        assertTrue(manager.hasClaimed(id, winner));
    }

    function testSweepRemainderOnlyAdminAfterClaimEnd() public {
        uint256 reward = 2 ether;
        uint64 start = uint64(block.timestamp + 1);
        uint64 end = uint64(block.timestamp + 1 days);

        vm.prank(creator);
        uint256 id = manager.createAirdrop{value: reward + CREATE_FEE}(
            address(linkedToken), address(0), reward, keccak256("rules"), start, end
        );

        vm.warp(end + 1);
        vm.prank(keeper);
        manager.finalizeAirdrop(id, _root(winner, 1 ether), 1 ether);

        uint64 claimEnd = end + uint64(manager.CLAIM_DURATION());
        vm.warp(uint256(claimEnd) + 1);
        vm.prank(creator);
        vm.expectRevert(PumpAirdropManager.NotAdmin.selector);
        manager.sweepRemainder(id);

        uint256 adminBefore = admin.balance;
        vm.prank(admin);
        manager.sweepRemainder(id);
        assertEq(admin.balance, adminBefore + 2 ether);
    }

    function testRejectNonLaunchpadRewardToken() public {
        address randomToken = address(0x1234);
        vm.prank(creator);
        vm.expectRevert(PumpAirdropManager.InvalidToken.selector);
        manager.createAirdrop{value: CREATE_FEE}(
            address(linkedToken), randomToken, 1 ether, keccak256("rules"), uint64(block.timestamp + 1),
            uint64(block.timestamp + 2 days)
        );
    }

    function testClaimFailsBeforeFinalize() public {
        uint256 reward = 1 ether;
        uint64 end = uint64(block.timestamp + 1 days);

        vm.prank(creator);
        uint256 id = manager.createAirdrop{value: reward + CREATE_FEE}(
            address(linkedToken), address(0), reward, keccak256("rules"), uint64(block.timestamp + 1), end
        );

        vm.warp(end + 1);
        vm.prank(winner);
        vm.expectRevert(PumpAirdropManager.AirdropNotFinalized.selector);
        manager.claim(id, reward, new bytes32[](0));
    }

    function _leaf(address account, uint256 amount) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }

    function _root(address account, uint256 amount) internal pure returns (bytes32) {
        return _leaf(account, amount);
    }

    function _singleLeafProof(address account, uint256 amount) internal pure returns (bytes32[] memory) {
        bytes32[] memory proof = new bytes32[](0);
        proof;
        account;
        amount;
        return proof;
    }
}

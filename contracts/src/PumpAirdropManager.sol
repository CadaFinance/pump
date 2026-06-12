// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20Minimal} from "./interfaces/ILaunchpad.sol";
import {IMemeFactory} from "./interfaces/IMemeFactory.sol";

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @notice On-chain escrow + Merkle claim airdrops for the BSC pump launchpad.
contract PumpAirdropManager {
    uint256 public constant CLAIM_DURATION = 24 hours;
    uint256 public constant BPS = 10_000;

    // Distribution slots (must match off-chain keeper math).
    uint256 public constant RANK1_BPS = 1500;
    uint256 public constant RANK2_BPS = 1000;
    uint256 public constant RANK3_BPS = 500;
    uint256 public constant RANK4_100_BPS = 7000;
    uint256 public constant RANK4_100_COUNT = 97;

    enum AirdropStatus {
        Active,
        Finalized,
        Closed
    }

    struct Airdrop {
        address creator;
        address linkedToken;
        address rewardToken;
        uint256 totalFunded;
        uint256 totalAllocated;
        uint256 totalClaimed;
        bytes32 rulesHash;
        bytes32 merkleRoot;
        uint64 qualifyStart;
        uint64 qualifyEnd;
        uint64 claimStart;
        uint64 claimEnd;
        AirdropStatus status;
        bool remainderSwept;
    }

    address public immutable admin;
    address public immutable treasury;
    IMemeFactory public immutable memeFactory;

    address public keeper;
    uint256 public createFee;
    uint256 public nextAirdropId;

    mapping(uint256 => Airdrop) public airdrops;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event KeeperUpdated(address indexed previousKeeper, address indexed newKeeper);
    event CreateFeeUpdated(uint256 previousFee, uint256 newFee);
    event AirdropCreated(
        uint256 indexed airdropId,
        address indexed creator,
        address indexed linkedToken,
        address rewardToken,
        uint256 totalFunded,
        bytes32 rulesHash,
        uint64 qualifyStart,
        uint64 qualifyEnd,
        uint64 claimStart,
        uint64 claimEnd
    );
    event AirdropFinalized(uint256 indexed airdropId, bytes32 merkleRoot, uint256 totalAllocated);
    event AirdropClaimed(uint256 indexed airdropId, address indexed claimant, uint256 amount);
    event AirdropRemainderSwept(uint256 indexed airdropId, address indexed admin, uint256 amount);

    error NotAdmin();
    error NotKeeper();
    error ZeroAddress();
    error InvalidConfig();
    error InvalidToken();
    error InvalidAmount();
    error InvalidTiming();
    error TransferFailed();
    error AirdropNotFinalized();
    error ClaimWindowClosed();
    error ClaimWindowNotOpen();
    error AlreadyClaimed();
    error InvalidProof();
    error AlreadyFinalized();
    error NotReadyToFinalize();
    error SweepTooEarly();
    error AlreadySwept();
    error NothingToSweep();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    constructor(address admin_, address treasury_, address memeFactory_, address keeper_, uint256 createFee_) {
        if (admin_ == address(0) || treasury_ == address(0) || memeFactory_ == address(0) || keeper_ == address(0)) {
            revert ZeroAddress();
        }
        admin = admin_;
        treasury = treasury_;
        memeFactory = IMemeFactory(memeFactory_);
        keeper = keeper_;
        createFee = createFee_;
    }

    function setKeeper(address keeper_) external onlyAdmin {
        if (keeper_ == address(0)) revert ZeroAddress();
        address previous = keeper;
        keeper = keeper_;
        emit KeeperUpdated(previous, keeper_);
    }

    function setCreateFee(uint256 createFee_) external onlyAdmin {
        uint256 previous = createFee;
        createFee = createFee_;
        emit CreateFeeUpdated(previous, createFee_);
    }

    /// @notice Distribution preview for a rank (1-based). Used by UI; keeper must match.
    function rewardAmountForRank(uint256 totalReward, uint256 rank) external pure returns (uint256) {
        if (rank == 0 || rank > 100 || totalReward == 0) revert InvalidConfig();
        if (rank == 1) return (totalReward * RANK1_BPS) / BPS;
        if (rank == 2) return (totalReward * RANK2_BPS) / BPS;
        if (rank == 3) return (totalReward * RANK3_BPS) / BPS;
        return (totalReward * RANK4_100_BPS) / BPS / RANK4_100_COUNT;
    }

    function createAirdrop(
        address linkedToken,
        address rewardToken,
        uint256 rewardAmount,
        bytes32 rulesHash,
        uint64 qualifyStart,
        uint64 qualifyEnd
    ) external payable returns (uint256 airdropId) {
        if (linkedToken == address(0)) revert ZeroAddress();
        if (!memeFactory.isLaunchpadToken(linkedToken)) revert InvalidToken();
        if (rewardAmount == 0) revert InvalidAmount();
        if (rewardToken != address(0) && !memeFactory.isLaunchpadToken(rewardToken)) revert InvalidToken();
        if (qualifyEnd <= qualifyStart || qualifyEnd <= block.timestamp) revert InvalidTiming();
        if (rulesHash == bytes32(0)) revert InvalidConfig();

        uint64 claimStart_ = qualifyEnd;
        uint64 claimEnd_ = qualifyEnd + uint64(CLAIM_DURATION);

        if (rewardToken == address(0)) {
            if (msg.value != rewardAmount + createFee) revert InvalidAmount();
        } else {
            if (msg.value != createFee) revert InvalidAmount();
            if (!IERC20Minimal(rewardToken).transferFrom(msg.sender, address(this), rewardAmount)) {
                revert TransferFailed();
            }
        }

        if (createFee > 0) {
            _sendNative(payable(treasury), createFee);
        }

        airdropId = nextAirdropId++;
        airdrops[airdropId] = Airdrop({
            creator: msg.sender,
            linkedToken: linkedToken,
            rewardToken: rewardToken,
            totalFunded: rewardAmount,
            totalAllocated: 0,
            totalClaimed: 0,
            rulesHash: rulesHash,
            merkleRoot: bytes32(0),
            qualifyStart: qualifyStart,
            qualifyEnd: qualifyEnd,
            claimStart: claimStart_,
            claimEnd: claimEnd_,
            status: AirdropStatus.Active,
            remainderSwept: false
        });

        emit AirdropCreated(
            airdropId,
            msg.sender,
            linkedToken,
            rewardToken,
            rewardAmount,
            rulesHash,
            qualifyStart,
            qualifyEnd,
            claimStart_,
            claimEnd_
        );
    }

    function finalizeAirdrop(uint256 airdropId, bytes32 merkleRoot, uint256 totalAllocated) external onlyKeeper {
        Airdrop storage a = airdrops[airdropId];
        if (a.creator == address(0)) revert InvalidConfig();
        if (a.status != AirdropStatus.Active) revert AlreadyFinalized();
        if (block.timestamp < a.qualifyEnd) revert NotReadyToFinalize();
        if (merkleRoot == bytes32(0)) revert InvalidConfig();
        if (totalAllocated == 0 || totalAllocated > a.totalFunded) revert InvalidAmount();

        a.merkleRoot = merkleRoot;
        a.totalAllocated = totalAllocated;
        a.status = AirdropStatus.Finalized;

        emit AirdropFinalized(airdropId, merkleRoot, totalAllocated);
    }

    function claim(uint256 airdropId, uint256 amount, bytes32[] calldata proof) external {
        Airdrop storage a = airdrops[airdropId];
        if (a.status != AirdropStatus.Finalized) revert AirdropNotFinalized();
        if (block.timestamp < a.claimStart) revert ClaimWindowNotOpen();
        if (block.timestamp > a.claimEnd) revert ClaimWindowClosed();
        if (hasClaimed[airdropId][msg.sender]) revert AlreadyClaimed();

        bytes32 leaf = _leaf(msg.sender, amount);
        if (!MerkleProof.verify(proof, a.merkleRoot, leaf)) revert InvalidProof();

        hasClaimed[airdropId][msg.sender] = true;
        a.totalClaimed += amount;

        _payout(a.rewardToken, msg.sender, amount);

        emit AirdropClaimed(airdropId, msg.sender, amount);
    }

    function sweepRemainder(uint256 airdropId) external onlyAdmin {
        Airdrop storage a = airdrops[airdropId];
        if (a.creator == address(0)) revert InvalidConfig();
        if (a.remainderSwept) revert AlreadySwept();
        if (block.timestamp <= a.claimEnd) revert SweepTooEarly();

        uint256 remainder = a.totalFunded - a.totalClaimed;
        if (remainder == 0) revert NothingToSweep();

        a.remainderSwept = true;
        a.status = AirdropStatus.Closed;

        _payout(a.rewardToken, admin, remainder);

        emit AirdropRemainderSwept(airdropId, admin, remainder);
    }

    function remainingBalance(uint256 airdropId) external view returns (uint256) {
        Airdrop storage a = airdrops[airdropId];
        if (a.totalFunded < a.totalClaimed) return 0;
        return a.totalFunded - a.totalClaimed;
    }

    function _leaf(address account, uint256 amount) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
    }

    function _payout(address rewardToken, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (rewardToken == address(0)) {
            _sendNative(payable(to), amount);
        } else {
            if (!IERC20Minimal(rewardToken).transfer(to, amount)) revert TransferFailed();
        }
    }

    function _sendNative(address payable to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import {IERC20Minimal} from "./interfaces/ILaunchpad.sol";
import {IMemeFactory} from "./interfaces/IMemeFactory.sol";

/// @notice UUPS-upgradeable Merkle airdrop escrow for the pump launchpad.
contract PumpAirdropManager is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    uint256 public constant CLAIM_DURATION = 24 hours;
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_CLAIM_BATCH = 25;

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

    struct ClaimInput {
        uint256 airdropId;
        uint256 amount;
        bytes32[] proof;
    }

    address public treasury;
    IMemeFactory public memeFactory;

    address public keeper;
    uint256 public createFee;
    uint256 public nextAirdropId;

    mapping(uint256 => Airdrop) public airdrops;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(address => bool) public feeExempt;

    event KeeperUpdated(address indexed previousKeeper, address indexed newKeeper);
    event CreateFeeUpdated(uint256 previousFee, uint256 newFee);
    event FeeExemptUpdated(address indexed account, bool exempt);
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

    modifier onlyKeeper() {
        if (msg.sender != keeper) revert NotKeeper();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin_,
        address treasury_,
        address memeFactory_,
        address keeper_,
        uint256 createFee_
    ) external initializer {
        if (admin_ == address(0) || treasury_ == address(0) || memeFactory_ == address(0) || keeper_ == address(0)) {
            revert ZeroAddress();
        }

        __Ownable_init(admin_);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        treasury = treasury_;
        memeFactory = IMemeFactory(memeFactory_);
        keeper = keeper_;
        createFee = createFee_;
        feeExempt[admin_] = true;
        emit FeeExemptUpdated(admin_, true);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Backward-compatible alias for admin reads in the app.
    function admin() external view returns (address) {
        return owner();
    }

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
    }

    function setMemeFactory(address memeFactory_) external onlyOwner {
        if (memeFactory_ == address(0)) revert ZeroAddress();
        memeFactory = IMemeFactory(memeFactory_);
    }

    function setKeeper(address keeper_) external onlyOwner {
        if (keeper_ == address(0)) revert ZeroAddress();
        address previous = keeper;
        keeper = keeper_;
        emit KeeperUpdated(previous, keeper_);
    }

    function setCreateFee(uint256 createFee_) external onlyOwner {
        uint256 previous = createFee;
        createFee = createFee_;
        emit CreateFeeUpdated(previous, createFee_);
    }

    function setFeeExempt(address account, bool exempt) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        feeExempt[account] = exempt;
        emit FeeExemptUpdated(account, exempt);
    }

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
        uint256 feeDue = _createFeeFor(msg.sender);

        if (rewardToken == address(0)) {
            if (msg.value != rewardAmount + feeDue) revert InvalidAmount();
        } else {
            if (msg.value != feeDue) revert InvalidAmount();
            if (!IERC20Minimal(rewardToken).transferFrom(msg.sender, address(this), rewardAmount)) {
                revert TransferFailed();
            }
        }

        if (feeDue > 0) {
            _sendNative(payable(treasury), feeDue);
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

    function claim(uint256 airdropId, uint256 amount, bytes32[] calldata proof) external nonReentrant {
        _claim(airdropId, msg.sender, amount, proof);
    }

    function claimBatch(ClaimInput[] calldata claims) external nonReentrant {
        uint256 length = claims.length;
        if (length == 0 || length > MAX_CLAIM_BATCH) revert InvalidAmount();

        address claimant = msg.sender;
        for (uint256 i = 0; i < length; i++) {
            ClaimInput calldata input = claims[i];
            _claim(input.airdropId, claimant, input.amount, input.proof);
        }
    }

    function sweepRemainder(uint256 airdropId) external onlyOwner {
        Airdrop storage a = airdrops[airdropId];
        if (a.creator == address(0)) revert InvalidConfig();
        if (a.remainderSwept) revert AlreadySwept();
        if (block.timestamp <= a.claimEnd) revert SweepTooEarly();

        uint256 remainder = a.totalFunded - a.totalClaimed;
        if (remainder == 0) revert NothingToSweep();

        a.remainderSwept = true;
        a.status = AirdropStatus.Closed;

        address admin_ = owner();
        _payout(a.rewardToken, admin_, remainder);

        emit AirdropRemainderSwept(airdropId, admin_, remainder);
    }

    function remainingBalance(uint256 airdropId) external view returns (uint256) {
        Airdrop storage a = airdrops[airdropId];
        if (a.totalFunded < a.totalClaimed) return 0;
        return a.totalFunded - a.totalClaimed;
    }

    function _claim(uint256 airdropId, address claimant, uint256 amount, bytes32[] calldata proof) internal {
        Airdrop storage a = airdrops[airdropId];
        if (a.status != AirdropStatus.Finalized) revert AirdropNotFinalized();
        if (block.timestamp < a.claimStart) revert ClaimWindowNotOpen();
        if (block.timestamp > a.claimEnd) revert ClaimWindowClosed();
        if (hasClaimed[airdropId][claimant]) revert AlreadyClaimed();

        bytes32 leaf = _leaf(claimant, amount);
        if (!MerkleProof.verify(proof, a.merkleRoot, leaf)) revert InvalidProof();

        hasClaimed[airdropId][claimant] = true;
        a.totalClaimed += amount;

        _payout(a.rewardToken, claimant, amount);

        emit AirdropClaimed(airdropId, claimant, amount);
    }

    function _createFeeFor(address account) internal view returns (uint256) {
        if (account == owner() || feeExempt[account]) return 0;
        return createFee;
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

    uint256[40] private __gap;
}

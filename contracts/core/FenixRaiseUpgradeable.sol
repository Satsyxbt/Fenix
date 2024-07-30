// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {MerkleProofUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IFenixRaise} from "./interfaces/IFenixRaise.sol";
import {IVotingEscrow} from "../core/interfaces/IVotingEscrow.sol";

/**
 * @title FenixRaiseUpgradeable
 * @dev This contract manages a token raise with both whitelist and public phases.
 *  It utilizes Merkle proof verification for whitelist management and ensures various caps
 *  and limits are adhered to during the raise.
 */
contract FenixRaiseUpgradeable is IFenixRaise, BlastGovernorClaimableSetup, Ownable2StepUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @dev The duration for which NFT tokens will be locked.
     */
    uint256 internal constant _LOCK_DURATION = 182 days;

    /**
     * @dev Precision used for percentage calculations to ensure accurate arithmetic operations.
     */
    uint256 internal constant _PRECISION = 1e18;

    /**
     * @notice The address of the reward token.
     * @dev This is the token that users will receive as a reward for their deposits.
     */
    address public override rewardToken;

    /**
     * @notice The address of the token being raised
     */
    address public override token;

    /**
     * @notice The address of the voting escrow contract.
     * @dev This contract manages the locking of reward tokens into veNFTs.
     */
    address public override votingEscrow;

    /**
     * @notice The address that will receive the deposits
     */
    address public override depositsReciever;

    /**
     * @notice The Merkle root for the whitelist verification
     */
    bytes32 public override whitelistMerklRoot;

    /**
     * @notice The timestamp for the start of the whitelist phase
     */
    uint256 public override startWhitelistPhaseTimestamp;

    /**
     * @notice The timestamp for the start of the public phase
     */
    uint256 public override startPublicPhaseTimestamp;

    /**
     * @notice The timestamp for the end of the public phase
     */
    uint256 public override endPublicPhaseTimestamp;

    /**
     * @notice The maximum amount a user can deposit during the whitelist phase
     */
    uint256 public override whitelistPhaseUserCap;

    /**
     * @notice The timestamp for the start of the claim phase
     */
    uint256 public override startClaimPhaseTimestamp;

    /**
     * @notice The maximum amount a user can deposit during the public phase
     */
    uint256 public override publicPhaseUserCap;

    /**
     * @notice The amount of reward tokens per deposit token.
     * @dev Specifies the conversion rate between deposit tokens and reward tokens.
     */
    uint256 public override amountOfRewardTokenPerDepositToken;

    /**
     * @dev Percentage of the claimed amount to be locked as veNFT.
     * This value should be set as a fraction of 1e18 (e.g., 0.5 * 1e18 represents 50%).
     */
    uint256 public override toVeNftPercentage;

    /**
     * @notice The total cap for deposits
     */
    uint256 public override totalDepositCap;

    /**
     * @notice The total amount deposited so far
     */
    uint256 public override totalDeposited;

    /**
     * @notice The total amount reward claimed so far
     */
    uint256 public override totalClaimed;

    /**
     * @notice The amount each user has deposited
     * @dev Mapping from user address to the amount deposited
     */
    mapping(address => uint256) public override userDeposited;

    /**
     * @notice The amount each user has deposited during whitelist phase
     * @dev Mapping from user address to the amount deposited
     */
    mapping(address => uint256) public override userDepositsWhitelistPhase;

    /**
     * @notice Mapping to track whether a user has claimed their tokens.
     * @dev Maps user address to a boolean indicating claim status.
     *      True if the user has claimed, false otherwise.
     */
    mapping(address => bool) public override isUserClaimed;

    /**
     * @dev Error thrown when the `toVeNftPercentage` is incorrect (i.e., greater than 1e18).
     */
    error IncorrectToVeNftPercentage();

    /**
     * @dev Error thrown when timestamps are incorrect
     */
    error IncorrectTimestamps();

    /**
     * @dev Error thrown when a non-whitelisted user attempts to deposit during the whitelist phase
     */
    error OnlyForWhitelistedUser();

    /**
     * @dev Error thrown when claim phase not started at the moment
     */
    error ClaimPhaseNotStarted();

    /**
     * @dev Error thrown when deposits are closed
     */
    error DepositClosed();

    /**
     * @dev Error thrown when a user attempts to deposit more than the user cap
     */
    error UserDepositCap();

    /**
     * @dev Error thrown when the total deposit cap is exceeded
     */
    error TotalDepositCap();

    /**
     * @dev Error thrown when trying to withdraw deposits before the raise is finished
     */
    error RaiseNotFinished();

    /**
     * @dev Error thrown when a zero amount is involved in a transaction
     */
    error ZeroAmount();

    /**
     * @dev Error thrown when a user tries to claim more than once
     */
    error AlreadyClaimed();

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract
     * @param blastGovernor_ The address of the BlastGovernor
     * @param token_ The address of the token being raised
     * @param rewardToken_ The address of the reward token
     * @param depositsReciever_ The address that will receive the deposits
     * @param amountOfRewardTokenPerDepositToken_ The amount of reward tokens per deposit token
     * @param votingEscrow_ The address of the voting escrow
     * @param toVeNftPercentage_ The percentage of the claimed amount to be locked as veNFT

     */
    function initialize(
        address blastGovernor_,
        address token_,
        address rewardToken_,
        address depositsReciever_,
        uint256 amountOfRewardTokenPerDepositToken_,
        address votingEscrow_,
        uint256 toVeNftPercentage_
    ) external initializer {
        _checkAddressZero(token_);
        _checkAddressZero(rewardToken_);
        _checkAddressZero(depositsReciever_);

        if (toVeNftPercentage_ > 0) {
            if (toVeNftPercentage_ > _PRECISION) {
                revert IncorrectToVeNftPercentage();
            }
            _checkAddressZero(votingEscrow_);
        }

        __Ownable2Step_init();
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        rewardToken = rewardToken_;
        token = token_;
        depositsReciever = depositsReciever_;
        amountOfRewardTokenPerDepositToken = amountOfRewardTokenPerDepositToken_;
        votingEscrow = votingEscrow_;
        toVeNftPercentage = toVeNftPercentage_;
    }

    /**
     * @notice Deposit tokens during the raise
     * @param amount_ The amount of tokens to deposit
     * @param userCap_ The cap for the user (used for whitelist verification)
     * @param proof_ The Merkle proof for verifying the user is whitelisted
     */
    function deposit(uint256 amount_, uint256 userCap_, bytes32[] memory proof_) external virtual override {
        _checkAmountZero(amount_);

        bool isWhitelistPhaseCache = isWhitelistPhase();
        uint256 phaseCap;

        if (!isPublicPhase()) {
            if (isWhitelistPhaseCache) {
                if (!isWhitelisted(_msgSender(), userCap_, proof_)) {
                    revert OnlyForWhitelistedUser();
                }
                phaseCap = userCap_ > 0 ? userCap_ : whitelistPhaseUserCap;
            } else {
                revert DepositClosed();
            }
        } else {
            phaseCap = publicPhaseUserCap;
        }

        uint256 userDepositedCache = isWhitelistPhaseCache
            ? userDeposited[_msgSender()]
            : userDeposited[_msgSender()] - userDepositsWhitelistPhase[_msgSender()];

        if (userDepositedCache + amount_ > phaseCap) {
            revert UserDepositCap();
        }

        if (totalDeposited + amount_ > totalDepositCap) {
            revert TotalDepositCap();
        }

        IERC20Upgradeable(token).safeTransferFrom(_msgSender(), address(this), amount_);

        if (isWhitelistPhaseCache) {
            userDepositsWhitelistPhase[_msgSender()] += amount_;
        }

        userDeposited[_msgSender()] += amount_;

        totalDeposited += amount_;

        emit Deposit(_msgSender(), amount_);
    }

    /**
     * @notice Claim tokens after the raise
     * @dev Users can claim their reward tokens and veNFTs based on their deposited amount.
     *      If the user has already claimed, it reverts with `AlreadyClaimed`.
     *      If the deposited amount is zero, it reverts with `ZeroAmount`.
     *      If the claim phase not started, it reverts with `ClaimPhaseNotStarted`.
     */
    function claim() external virtual override {
        if (!isClaimPhase()) {
            revert ClaimPhaseNotStarted();
        }

        if (isUserClaimed[_msgSender()]) {
            revert AlreadyClaimed();
        }

        uint256 depositAmount = userDeposited[_msgSender()];
        _checkAmountZero(depositAmount);

        (uint256 toRewardTokenAmount, uint256 toVeNftAmount) = getRewardsAmountOut(depositAmount);

        totalClaimed += toVeNftAmount + toRewardTokenAmount;
        isUserClaimed[_msgSender()] = true;

        uint256 tokenId;
        IERC20Upgradeable rewardTokenCache = IERC20Upgradeable(rewardToken);
        if (toVeNftAmount > 0) {
            IVotingEscrow veCache = IVotingEscrow(votingEscrow);
            rewardTokenCache.safeApprove(address(veCache), toVeNftAmount);
            tokenId = veCache.create_lock_for_without_boost(toVeNftAmount, _LOCK_DURATION, _msgSender());
        }

        if (toRewardTokenAmount > 0) {
            rewardTokenCache.safeTransfer(_msgSender(), toRewardTokenAmount);
        }

        emit Claim(_msgSender(), toVeNftAmount + toRewardTokenAmount, toRewardTokenAmount, toVeNftAmount, tokenId);
    }

    /**
     * @notice Withdraws the deposits after the raise is finished
     */
    function whithdrawDeposits() external virtual override onlyOwner {
        if (block.timestamp <= endPublicPhaseTimestamp || endPublicPhaseTimestamp == 0) {
            revert RaiseNotFinished();
        }
        IERC20Upgradeable tokenCache = IERC20Upgradeable(token);
        uint256 balanace = tokenCache.balanceOf(address(this));

        _checkAmountZero(balanace);

        tokenCache.safeTransfer(depositsReciever, tokenCache.balanceOf(address(this)));
        emit WithdrawDeposits(_msgSender(), depositsReciever, balanace);
    }

    /**
     * @notice Withdraws the unclaimed rewards after the raise is finished
     */
    function withdrawExcessiveRewardTokens() external virtual override onlyOwner {
        if (block.timestamp <= endPublicPhaseTimestamp || endPublicPhaseTimestamp == 0) {
            revert RaiseNotFinished();
        }
        IERC20Upgradeable rewardTokenCache = IERC20Upgradeable(rewardToken);

        (uint256 toRewardTokenAmount, uint256 toVeNftAmount) = getRewardsAmountOut(IERC20Upgradeable(token).balanceOf(address(this)));

        uint256 balanace = rewardTokenCache.balanceOf(address(this));

        uint256 unclaimedRewards = balanace - (toRewardTokenAmount + toVeNftAmount - totalClaimed);

        _checkAmountZero(unclaimedRewards);

        rewardTokenCache.safeTransfer(depositsReciever, unclaimedRewards);

        emit WithdrawExcessiveRewardTokens(_msgSender(), depositsReciever, unclaimedRewards);
    }

    /**
     * @notice Sets the deposit caps
     * @param totalDepositCap_ The total deposit cap
     * @param whitelistPhaseUserCap_ The user cap for the whitelist phase
     * @param publicPhaseUserCap_ The user cap for the public phase
     */
    function setDepositCaps(
        uint256 totalDepositCap_,
        uint256 whitelistPhaseUserCap_,
        uint256 publicPhaseUserCap_
    ) external virtual override onlyOwner {
        totalDepositCap = totalDepositCap_;
        whitelistPhaseUserCap = whitelistPhaseUserCap_;
        publicPhaseUserCap = publicPhaseUserCap_;

        emit UpdateDepositCaps(totalDepositCap_, whitelistPhaseUserCap_, publicPhaseUserCap_);
    }

    /**
     * @notice Sets the whitelist root
     * @param root_ The new whitelist root
     */
    function setWhitelistRoot(bytes32 root_) external virtual override onlyOwner {
        whitelistMerklRoot = root_;
        emit UpdateWhitelistRoot(root_);
    }

    /**
     * @notice Sets the timestamps for the phases
     * @param startWhitelistPhaseTimestamp_ The timestamp for the start of the whitelist phase
     * @param startPublicPhaseTimestamp_ The timestamp for the start of the public phase
     * @param endPublicPhaseTimestamp_ The timestamp for the end of the public phase
     * @param startClaimPhaseTimestamp_ The timestamp for the start of the claim phase
     */
    function setTimestamps(
        uint256 startWhitelistPhaseTimestamp_,
        uint256 startPublicPhaseTimestamp_,
        uint256 endPublicPhaseTimestamp_,
        uint256 startClaimPhaseTimestamp_
    ) external virtual override onlyOwner {
        if (
            startWhitelistPhaseTimestamp_ >= startPublicPhaseTimestamp_ ||
            startWhitelistPhaseTimestamp_ >= endPublicPhaseTimestamp_ ||
            startPublicPhaseTimestamp_ >= endPublicPhaseTimestamp_ ||
            endPublicPhaseTimestamp_ >= startClaimPhaseTimestamp_
        ) {
            revert IncorrectTimestamps();
        }

        startWhitelistPhaseTimestamp = startWhitelistPhaseTimestamp_;
        startPublicPhaseTimestamp = startPublicPhaseTimestamp_;
        endPublicPhaseTimestamp = endPublicPhaseTimestamp_;
        startClaimPhaseTimestamp = startClaimPhaseTimestamp_;

        emit UpdateTimestamps(
            startWhitelistPhaseTimestamp_,
            startPublicPhaseTimestamp_,
            endPublicPhaseTimestamp_,
            startClaimPhaseTimestamp_
        );
    }

    /**
     * @notice Checks if a user is whitelisted
     * @param user_ The address of the user
     * @param userCap_ The cap for the user
     * @param proof_ The Merkle proof for verifying the user
     * @return True if the user is whitelisted, false otherwise
     */
    function isWhitelisted(address user_, uint256 userCap_, bytes32[] memory proof_) public view virtual override returns (bool) {
        bytes32 root = whitelistMerklRoot;
        if (proof_.length == 0 || root == bytes32(0)) {
            return false;
        }

        return MerkleProofUpgradeable.verify(proof_, root, keccak256(bytes.concat(keccak256(abi.encode(user_, userCap_)))));
    }

    /**
     * @notice Checks if the whitelist phase is active
     * @return True if the whitelist phase is active, false otherwise
     */
    function isWhitelistPhase() public view virtual override returns (bool) {
        return (block.timestamp >= startWhitelistPhaseTimestamp && block.timestamp < startPublicPhaseTimestamp);
    }

    /**
     * @notice Checks if the public phase is active
     * @return True if the public phase is active, false otherwise
     */
    function isPublicPhase() public view virtual override returns (bool) {
        return (block.timestamp >= startPublicPhaseTimestamp && block.timestamp <= endPublicPhaseTimestamp);
    }

    /**
     * @notice Checks if the claim phase is active
     * @return True if the claim phase is active, false otherwise
     */
    function isClaimPhase() public view virtual override returns (bool) {
        uint256 timestamp = startClaimPhaseTimestamp;
        return (block.timestamp > timestamp && timestamp != 0);
    }

    /**
     * @notice Gets the reward amounts out based on the deposit amount
     * @param depositAmount_ The amount of tokens deposited
     * @return toRewardTokenAmount The amount of reward tokens
     * @return toVeNftAmount The amount to veNFT
     */
    function getRewardsAmountOut(
        uint256 depositAmount_
    ) public view virtual override returns (uint256 toRewardTokenAmount, uint256 toVeNftAmount) {
        uint256 totalAmount = (depositAmount_ * amountOfRewardTokenPerDepositToken) / (10 ** IERC20MetadataUpgradeable(token).decimals());
        toVeNftAmount = (totalAmount * toVeNftPercentage) / _PRECISION;
        toRewardTokenAmount = totalAmount - toVeNftAmount;
    }

    /**
     * @dev Checks if the amount is zero
     * @param amount_ The amount to check
     * @notice Reverts with `ZeroAmount` if the amount is zero
     */
    function _checkAmountZero(uint256 amount_) internal pure virtual {
        if (amount_ == 0) {
            revert ZeroAmount();
        }
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure virtual {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {ISingelTokenVirtualRewarder} from "./interfaces/ISingelTokenVirtualRewarder.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {VirtualRewarderCheckpoints} from "./libraries/VirtualRewarderCheckpoints.sol";
import {UpgradeCall} from "../integration/UpgradeCall.sol";

/**
 * @title Single Token Virtual Rewarder Upgradeable
 * @dev An upgradeable contract for managing token rewards based on virtual balances and epochs. It supports functionalities
 * like deposits, withdrawals, and reward calculations based on checkpoints.
 */
contract SingelTokenVirtualRewarderUpgradeable is ISingelTokenVirtualRewarder, BlastGovernorClaimableSetup, Initializable, UpgradeCall {
    /**
     * @title Struct for managing token information within a virtual reward system
     * @notice Holds all pertinent data related to individual tokens within the reward system.
     * @dev The structure stores balances, checkpoint indices, and a mapping of balance checkpoints.
     */
    struct TokenInfo {
        uint256 balance; // Current balance of the token
        uint256 checkpointLastIndex; // Index of the last checkpoint for the token
        uint256 lastEarnEpoch; // The last epoch during which rewards were calculated for the token
        mapping(uint256 index => VirtualRewarderCheckpoints.Checkpoint) balanceCheckpoints; // Mapping of index to balance checkpoints
    }

    /**
     * @notice Address of the strategy contract that interacts with this reward system
     * @dev This should be set to the address of the strategy managing the tokens and their rewards.
     */
    address public override strategy;

    /**
     * @notice Total supply of all tokens managed by the reward system
     * @dev This total supply is used in reward calculations across different epochs.
     */
    uint256 public override totalSupply;

    /**
     * @notice Index of the last checkpoint for the total supply
     * @dev Used to track changes in total supply at each checkpoint.
     */
    uint256 public totalSupplyCheckpointLastIndex;

    /**
     * @notice Mapping of total supply checkpoints
     * @dev This stores checkpoints of the total supply which are referenced in reward calculations.
     */
    mapping(uint256 index => VirtualRewarderCheckpoints.Checkpoint) public totalSupplyCheckpoints;

    /**
     * @notice Mapping from token ID to its associated TokenInfo
     * @dev Keeps track of all relevant token information, including balances and checkpoints.
     */
    mapping(uint256 tokenId => TokenInfo tokenInfo) public tokensInfo;

    /**
     * @notice Mapping from epoch to the total rewards allocated for that epoch
     * @dev Used to determine the amount of rewards available per epoch, which influences reward calculations.
     */
    mapping(uint256 epoch => uint256 rewards) public rewardsPerEpoch;

    /**
     * @notice Constant defining the length of a week in seconds
     * @dev Used for time-related calculations, particularly in determining epoch boundaries.
     */
    uint256 internal constant _WEEK = 86400 * 7;

    /**
     * @dev Custom error for unauthorized access attempts
     * @notice Thrown when an operation is attempted by an unauthorized address, typically checked against the strategy.
     */
    error AccessDenied();

    /**
     * @dev Custom error indicating operation involving zero amount which is not permitted
     * @notice Used primarily in deposit, withdrawal, and reward distribution to prevent erroneous zero value transactions.
     */
    error ZeroAmount();

    /**
     * @dev Modifier to restrict function calls to the strategy address
     * @notice Ensures that only the designated strategy can call certain functions.
     */
    modifier onlyStrategy() {
        if (msg.sender != strategy) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Constructor that disables initialization on implementation.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with necessary governance and operational addresses
     * @dev Sets up blast governance and operational aspects of the contract. This function can only be called once.
     *
     * @param blastGovernor_ The governance address capable of claiming the contract
     * @param strategy_ The strategy address that will interact with this contract
     */
    function initialize(address blastGovernor_, address strategy_) external override initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        _checkAddressZero(strategy_);

        strategy = strategy_;
    }

    /**
     * @notice Deposits a specific amount of tokens for a given tokenId
     * @dev This function updates the token's balance and total supply and writes a new checkpoint.
     *
     * @param tokenId_ The ID of the token to deposit
     * @param amount_ The amount of tokens to deposit
     */
    function deposit(uint256 tokenId_, uint256 amount_) external onlyStrategy {
        if (amount_ == 0) {
            revert ZeroAmount();
        }

        TokenInfo storage info = tokensInfo[tokenId_];
        info.balance += amount_;
        totalSupply += amount_;

        uint256 currentEpoch = _currentEpoch();
        _writeCheckpoints(info, currentEpoch);

        emit Deposit(tokenId_, amount_, currentEpoch);
    }

    /**
     * @notice Withdraws a specific amount of tokens for a given tokenId
     * @dev This function updates the token's balance and total supply and writes a new checkpoint.
     *
     * @param tokenId_ The ID of the token from which to withdraw
     * @param amount_ The amount of tokens to withdraw
     */
    function withdraw(uint256 tokenId_, uint256 amount_) external onlyStrategy {
        TokenInfo storage info = tokensInfo[tokenId_];
        if (info.balance == 0 || amount_ == 0) {
            revert ZeroAmount();
        }

        info.balance -= amount_;
        totalSupply -= amount_;

        uint256 currentEpoch = _currentEpoch();
        _writeCheckpoints(info, currentEpoch);

        emit Withdraw(tokenId_, amount_, currentEpoch);
    }

    /**
     * @notice Harvests rewards for a specific tokenId
     * @dev Calculates the available rewards for the token and updates the last earned epoch.
     *
     * IMPORTANT: If the reward was issued after the harvest summon in an epoch,
     *  you will not be able to claim it. Wait for the distribution of rewards for the past era
     *
     * @param tokenId_ The ID of the token for which to harvest rewards
     * @return reward The amount of rewards harvested
     */
    function harvest(uint256 tokenId_) external onlyStrategy returns (uint256 reward) {
        reward = _calculateAvailableRewardsAmount(tokenId_);

        uint256 currentEpoch = _currentEpoch();
        tokensInfo[tokenId_].lastEarnEpoch = currentEpoch;

        emit Harvest(tokenId_, reward, currentEpoch);
        return reward;
    }

    /**
     * @notice Notifies the contract of a new reward amount to be distributed in the current epoch
     * @dev Updates the rewards for the current epoch and emits a notification event.
     *
     * @param amount_ The amount of rewards to distribute
     */
    function notifyRewardAmount(uint256 amount_) external onlyStrategy {
        if (amount_ == 0) {
            revert ZeroAmount();
        }

        uint256 currentEpoch = _currentEpoch();
        rewardsPerEpoch[currentEpoch] += amount_;

        emit NotifyReward(amount_, currentEpoch);
    }

    /**
     * @notice Calculates the available rewards amount for a given tokenId
     *
     * @param tokenId_ The ID of the token to calculate rewards for
     * @return reward The calculated reward amount
     */
    function calculateAvailableRewardsAmount(uint256 tokenId_) external view returns (uint256 reward) {
        return _calculateAvailableRewardsAmount(tokenId_);
    }

    /**
     * @notice Provides the current balance of a specific tokenId
     *
     * @param tokenId_ The ID of the token to check
     * @return The current balance of the token
     */
    function balanceOf(uint256 tokenId_) external view returns (uint256) {
        return tokensInfo[tokenId_].balance;
    }

    /**
     * @notice Provides the balance of a specific tokenId at a given timestamp
     *
     * @param tokenId_ The ID of the token to check
     * @param timestamp_ The specific timestamp to check the balance at
     * @return The balance of the token at the given timestamp
     */
    function balanceOfAt(uint256 tokenId_, uint256 timestamp_) external view returns (uint256) {
        return
            VirtualRewarderCheckpoints.getAmount(
                tokensInfo[tokenId_].balanceCheckpoints,
                tokensInfo[tokenId_].checkpointLastIndex,
                timestamp_
            );
    }

    /**
     * @notice Provides the total supply of tokens at a given timestamp
     *
     * @param timestamp_ The timestamp to check the total supply at
     * @return The total supply of tokens at the specified timestamp
     */
    function totalSupplyAt(uint256 timestamp_) external view returns (uint256) {
        return VirtualRewarderCheckpoints.getAmount(totalSupplyCheckpoints, totalSupplyCheckpointLastIndex, timestamp_);
    }

    /**
     * @notice Returns the checkpoint data for a specific token and index
     *
     * @param tokenId_ The ID of the token to check
     * @param index The index of the checkpoint to retrieve
     * @return A checkpoint struct containing the timestamp and amount at that index
     */
    function balanceCheckpoints(uint256 tokenId_, uint256 index) external view returns (VirtualRewarderCheckpoints.Checkpoint memory) {
        return tokensInfo[tokenId_].balanceCheckpoints[index];
    }

    /**
     * @dev Writes checkpoints for token balance and total supply at a given epoch.
     * @notice This function updates both the token's individual balance checkpoint and the total supply checkpoint.
     *
     * @param info_ The storage reference to the token's information which includes balance and checkpoint index.
     * @param epoch_ The epoch for which the checkpoint is being written.
     */
    function _writeCheckpoints(TokenInfo storage info_, uint256 epoch_) internal {
        info_.checkpointLastIndex = VirtualRewarderCheckpoints.writeCheckpoint(
            info_.balanceCheckpoints,
            info_.checkpointLastIndex,
            epoch_,
            info_.balance
        );

        totalSupplyCheckpointLastIndex = VirtualRewarderCheckpoints.writeCheckpoint(
            totalSupplyCheckpoints,
            totalSupplyCheckpointLastIndex,
            epoch_,
            totalSupply
        );
    }

    /**
     * @notice This function accumulates rewards over each epoch since last claimed to present.
     * @dev Calculates the total available rewards for a given tokenId since the last earned epoch.
     *
     * @param tokenId_ The identifier of the token for which rewards are being calculated.
     * @return reward The total accumulated reward since the last claim.
     */
    function _calculateAvailableRewardsAmount(uint256 tokenId_) internal view returns (uint256 reward) {
        uint256 checkpointLastIndex = tokensInfo[tokenId_].checkpointLastIndex;
        if (checkpointLastIndex == 0) {
            return 0;
        }

        uint256 startEpoch = tokensInfo[tokenId_].lastEarnEpoch;

        uint256 index = startEpoch == 0
            ? 1
            : VirtualRewarderCheckpoints.getCheckpointIndex(
                tokensInfo[tokenId_].balanceCheckpoints,
                tokensInfo[tokenId_].checkpointLastIndex,
                startEpoch
            );

        uint256 epochTimestamp = tokensInfo[tokenId_].balanceCheckpoints[index].timestamp;

        if (epochTimestamp > startEpoch) {
            startEpoch = epochTimestamp;
        }

        uint256 currentEpoch = _currentEpoch();
        uint256 notHarvestedEpochCount = (currentEpoch - startEpoch) / _WEEK;

        for (uint256 i; i < notHarvestedEpochCount; ) {
            reward += _calculateRewardPerEpoch(tokenId_, startEpoch);

            startEpoch += _WEEK;
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice This method uses the reward per epoch and the token's proportion of the total supply to determine the reward amount.
     * @dev Calculates the reward for a specific tokenId for a single epoch based on the token's balance and total supply.
     *
     * @param tokenId_ The identifier of the token.
     * @param epoch_ The epoch for which to calculate the reward.
     * @return The calculated reward for the epoch.
     */
    function _calculateRewardPerEpoch(uint256 tokenId_, uint256 epoch_) internal view returns (uint256) {
        uint256 balance = VirtualRewarderCheckpoints.getAmount(
            tokensInfo[tokenId_].balanceCheckpoints,
            tokensInfo[tokenId_].checkpointLastIndex,
            epoch_
        );

        uint256 supply = VirtualRewarderCheckpoints.getAmount(totalSupplyCheckpoints, totalSupplyCheckpointLastIndex, epoch_);

        if (supply == 0) {
            return 0;
        }

        return (balance * rewardsPerEpoch[epoch_ + _WEEK]) / supply;
    }

    /**
     * @notice This function return current epoch
     * @dev Retrieves the current epoch
     *
     * @return The current epoch
     */
    function _currentEpoch() internal view returns (uint256) {
        return _roundToEpoch(block.timestamp);
    }

    /**
     * @notice This function is used to align timestamps with epoch boundaries.
     * @dev Rounds down the timestamp to the start of the epoch.
     *
     * @param timestamp_ The timestamp to round down.
     * @return The timestamp rounded down to the nearest epoch start.
     */
    function _roundToEpoch(uint256 timestamp_) internal pure returns (uint256) {
        return (timestamp_ / _WEEK) * _WEEK;
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

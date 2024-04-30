// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Interface for Single Token Virtual Rewarder
 * @dev Defines the basic interface for a reward system that handles deposits, withdrawals, and rewards based on token staking over different epochs.
 */
interface ISingelTokenVirtualRewarder {
    /**
     * @dev Emitted when a deposit is made.
     * @param tokenId The identifier of the token being deposited.
     * @param amount The amount of tokens deposited.
     * @param epoch The epoch during which the deposit occurs.
     */
    event Deposit(uint256 indexed tokenId, uint256 indexed amount, uint256 indexed epoch);

    /**
     * @dev Emitted when a withdrawal is made.
     * @param tokenId The identifier of the token being withdrawn.
     * @param amount The amount of tokens withdrawn.
     * @param epoch The epoch during which the withdrawal occurs.
     */
    event Withdraw(uint256 indexed tokenId, uint256 indexed amount, uint256 indexed epoch);

    /**
     * @dev Emitted when rewards are harvested.
     * @param tokenId The identifier of the token for which rewards are harvested.
     * @param rewardAmount The amount of rewards harvested.
     * @param epochCount The epoch during which the harvest occurs.
     */
    event Harvest(uint256 indexed tokenId, uint256 indexed rewardAmount, uint256 indexed epochCount);

    /**
     * @dev Emitted when a new reward amount is notified to be added to the pool.
     * @param rewardAmount The amount of rewards added.
     * @param epoch The epoch during which the reward is added.
     */
    event NotifyReward(uint256 indexed rewardAmount, uint256 indexed epoch);

    /**
     * @notice Handles the deposit of tokens into the reward system.
     * @param tokenId The identifier of the token being deposited.
     * @param amount The amount of tokens to deposit.
     */
    function deposit(uint256 tokenId, uint256 amount) external;

    /**
     * @notice Handles the withdrawal of tokens from the reward system.
     * @param tokenId The identifier of the token being withdrawn.
     * @param amount The amount of tokens to withdraw.
     */
    function withdraw(uint256 tokenId, uint256 amount) external;

    /**
     * @notice Notifies the system of a new reward amount to be distributed.
     * @param amount The amount of the new reward to add.
     */
    function notifyRewardAmount(uint256 amount) external;

    /**
     * @notice Harvests rewards for a specific token.
     * @param tokenId The identifier of the token for which to harvest rewards.
     * @return reward The amount of harvested rewards.
     */
    function harvest(uint256 tokenId) external returns (uint256 reward);

    /**
     * @notice Calculates the available amount of rewards for a specific token.
     * @param tokenId The identifier of the token.
     * @return reward The calculated reward amount.
     */
    function calculateAvailableRewardsAmount(uint256 tokenId) external view returns (uint256 reward);

    /**
     * @notice Returns the strategy address associated with this contract.
     * @return The address of the strategy.
     */
    function strategy() external view returns (address);

    /**
     * @notice Returns the total supply of tokens under management.
     * @return The total supply of tokens.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Returns the balance of a specific token.
     * @param tokenId The identifier of the token.
     * @return The balance of the specified token.
     */
    function balanceOf(uint256 tokenId) external view returns (uint256);

    /**
     * @notice Returns the reward per epoch for a specific epoch.
     * @param epoch The epoch for which to retrieve the reward amount.
     * @return The reward amount for the specified epoch.
     */
    function rewardsPerEpoch(uint256 epoch) external view returns (uint256);

    /**
     * @notice Initializes the contract with necessary governance and operational addresses
     * @dev Sets up blast governance and operational aspects of the contract. This function can only be called once.
     *
     * @param blastGovernor_ The governance address capable of claiming the contract
     * @param strategy_ The strategy address that will interact with this contract
     */
    function initialize(address blastGovernor_, address strategy_) external;
}

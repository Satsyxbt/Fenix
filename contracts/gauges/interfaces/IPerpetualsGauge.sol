// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

/**
 * @title IPerpetualsGauge
 * @dev Interface for the Perpetuals Gauge contract.
 *  This interface defines the events and functions for managing reward distribution.
 */
interface IPerpetualsGauge {
    /**
     * @dev Emitted when rewards are added.
     * @param reward The amount of rewards added.
     */
    event RewardAdded(uint256 reward);

    /**
     * @notice Returns the address of the reward token.
     * @return The address of the reward token.
     */
    function rewardToken() external view returns (address);

    /**
     * @notice Returns the address of the reward receiver contract.
     * @return The address of the reward receiver contract.
     */
    function rewarder() external view returns (address);

    /**
     * @notice Returns the address authorized to distribute rewards.
     * @return The address authorized to distribute rewards.
     */
    function DISTRIBUTION() external view returns (address);

    /**
     * @notice Returns the name of the gauge.
     * @return The name of the gauge.
     */
    function NAME() external view returns (string memory);

    /**
     * @notice Notifies the contract of the reward amount to be distributed.
     * @param token_ The address of the reward token.
     * @param rewardAmount_ The amount of reward tokens to be distributed.
     */
    function notifyRewardAmount(address token_, uint256 rewardAmount_) external;

    /**
     * @notice Gets the reward for a specific account.
     * @param user_ The address of the account to get the reward for.
     */
    function getReward(address user_) external;

    /**
     * @notice Claims the fees for the internal_bribe.
     * @return claimed0 The amount of the first token claimed.
     * @return claimed1 The amount of the second token claimed.
     */
    function claimFees() external returns (uint claimed0, uint claimed1);
}

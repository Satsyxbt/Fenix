// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IMerklGaugeMiddleman Interface
 * @dev Interface for the MerklGaugeMiddleman contract, which acts as an intermediary
 * between Gauges and a DistributionCreator to manage reward distributions.
 */
interface IMerklGaugeMiddleman {
    /**
     * @dev Emitted when a gauge's parameters are set or updated.
     * @param gauge Address of the gauge for which parameters are set
     */
    event GaugeSet(address indexed gauge);

    /**
     * @dev Emitted when a distribution is created for a gauge.
     * @param sender Address of the entity initiating the distribution
     * @param gauge Address of the gauge for which the distribution is created
     * @param amount The amount of tokens used from the gauge for distribution
     * @param distributionAmount The total amount distributed to participants
     */
    event CreateDistribution(address indexed sender, address indexed gauge, uint256 indexed amount, uint256 distributionAmount);

    /// @dev Error thrown when the parameters provided to a function are invalid.
    error InvalidParams();

    /**
     * @dev Notifies the contract about a reward for a specific gauge.
     * This function is intended to be called by the gauge contract itself or an authorized entity.
     * @param gauge_ Address of the gauge to notify about the reward
     * @param amount_ Amount of reward tokens to be distributed
     */
    function notifyReward(address gauge_, uint256 amount_) external;

    /**
     * @dev Transfers reward tokens from the caller and notifies the contract about a reward for a specific gauge.
     * This combines the token transfer and notification into a single transaction for efficiency.
     * @param gauge_ Address of the gauge to notify about the reward
     * @param amount_ Amount of reward tokens to be transferred and then distributed
     */
    function notifyRewardWithTransfer(address gauge_, uint256 amount_) external;
}

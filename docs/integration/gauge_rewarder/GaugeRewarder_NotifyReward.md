# GaugeRewarder NotifyReward Methods Documentation

The `notifyReward` and `notifyRewardWithTransfer` methods are part of the `GaugeRewarder` contract and are used by gauges to notify and distribute emissions for further allocation based on a specific backend algorithm. Below is a detailed description of each method, including when they are used, their functionality, and their respective signatures with NatSpec.

```solidity
/**
 * @notice Notifies a reward for a specified gauge.
 * @dev Called by a gauge or an authorized rewarder to notify reward tokens for a specific gauge.
 * @param gauge_ The address of the gauge to receive the reward.
 * @param amount_ The amount of reward tokens to be notified.
 * @custom:event NotifyReward Emitted when rewards are notified for a gauge.
 */
function notifyReward(address gauge_, uint256 amount_) external;
```

- **Purpose**: This function is called by the gauge to notify the amount of reward tokens that will be allocated for further distribution to participants. 

```solidity
/**
 * @notice Transfers tokens and notifies a reward for a specified gauge.
 * @dev Called by a gauge or an authorized rewarder to transfer and notify reward tokens for a specific gauge.
 * @param gauge_ The address of the gauge to receive the reward.
 * @param amount_ The amount of reward tokens to be transferred and notified.
 * @custom:event NotifyReward Emitted when rewards are notified for a gauge.
 */
function notifyRewardWithTransfer(address gauge_, uint256 amount_) external;
```

- **Purpose**: This function is called by the gauge to transfer reward tokens to the contract and notify their availability for further allocation. 

### Summary
- The `notifyReward` function notifies the reward amount for a gauge without handling token transfers.
- The `notifyRewardWithTransfer` function both transfers the reward tokens to the contract and notifies the reward for a gauge.
- These methods are called by authorized gauges or rewarders, and the notified rewards

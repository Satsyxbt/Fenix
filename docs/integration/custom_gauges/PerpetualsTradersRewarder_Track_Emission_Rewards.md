
# Tracking Reward Distribution

To track the amount of reward distributed to the contract, you can use one of the following three approaches:

## 1. Track the `DistributeReward` Event on the `Voter` Contract

This event is triggered on the `Voter` contract when emissions are distributed with a new epoch.

```js
event DistributeReward(address indexed sender, address indexed gauge, uint256 amount);
```

## 2. Track the `RewardAdded` Event on the `PerpetualsGauge` Contract

This event is triggered on the `PerpetualsGauge` contract when emissions are added to the gauge.

```js
/**
 * @dev Emitted when rewards are added.
 * @param reward The amount of rewards added.
 */
event RewardAdded(uint256 reward);
```

## 3. Track the `Reward` Event on the `PerpetualsTradersRewarderUpgradeable` Contract

This event is triggered on the `PerpetualsTradersRewarderUpgradeable` contract when rewards are received by the final distributor.

```js
/**
 * @dev Emitted when a reward is notified.
 * @param caller The address of the caller notifying the reward.
 * @param timestamp The timestamp when the reward was notified.
 * @param amount The amount of tokens notified.
 */
event Reward(address indexed caller, uint256 indexed timestamp, uint256 amount);
```

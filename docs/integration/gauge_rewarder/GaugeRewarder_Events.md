# GaugeRewarder Events Documentation

Below are the events emitted by the `GaugeRewarder` contract, including detailed descriptions, when they are emitted, and their respective signatures with NatSpec.

```solidity
/**
 * @dev Emitted when rewards are notified for a gauge.
 * @param caller The address that triggered the reward notification.
 * @param gauge The address of the gauge receiving the reward.
 * @param epoch The current epoch of the minter.
 * @param amount The amount of reward tokens notified.
 */
event NotifyReward(address indexed caller, address indexed gauge, uint256 indexed epoch, uint256 amount);
```

- **When Emitted**: This event is emitted when rewards are notified for a specific gauge, either through `notifyReward` or `notifyRewardWithTransfer` functions.

```solidity
/**
 * @dev Emitted when a reward claim is made.
 * @param target The address of the recipient of the claimed reward.
 * @param reward The amount of reward claimed.
 * @param totalAmount The total claimable amount.
 */
event Claim(address target, uint256 reward, uint256 totalAmount);
```

- **When Emitted**: This event is emitted when a reward is successfully claimed by a user or on behalf of a user, through either the `claim` or `claimFor` functions.

```solidity
/**
 * @dev Emitted when the signer address is set.
 * @param signer The address of the new signer.
 */
event SetSigner(address indexed signer);
```

- **When Emitted**: This event is emitted when the signer address is updated by calling the `setSigner` function.


# VeBoost Events

This document outlines the events emitted by the VeBoost system, including when they are triggered and their signatures.

## Events

### RewardSent

**Signature:**
```solidity
event RewardSent(address indexed token, address indexed recipient, uint256 indexed rewardTokenBoostAmount);
```

**Description:**
Emitted when a reward (Not FNX) is sent to a token (locked position in VeFNX) owner as part of the boost process.

**Parameters:**
- `token`: The address of the reward token.
- `recipient`: The recipient of the reward.
- `rewardTokenBoostAmount`: The amount of reward token sent.

### FNXBoostPercentage

**Signature:**
```solidity
event FNXBoostPercentage(uint256 indexed fnxBoostPercentage);
```

**Description:**
Emitted when the FNX boost percentage is updated.

**Parameters:**
- `fnxBoostPercentage`: New boost percentage.

### MinUSDAmount

**Signature:**
```solidity
event MinUSDAmount(uint256 indexed minUSDAmount);
```

**Description:**
Emitted when the minimum USD amount required for a boost is updated.

**Parameters:**
- `minUSDAmount`: New minimum USD amount.

### MinLockedTime

**Signature:**
```solidity
event MinLockedTime(uint256 indexed minLockedTime_);
```

**Description:**
Emitted when the minimum locked time for a boost is updated.

**Parameters:**
- `minLockedTime_`: New minimum locked time.

### RecoverToken

**Signature:**
```solidity
event RecoverToken(address indexed token, uint256 indexed recoverAmount);
```

**Description:**
Emitted when tokens are recovered by the owner.

**Parameters:**
- `token`: Address of the recovered token.
- `recoverAmount`: Amount of tokens recovered.

### AddRewardToken

**Signature:**
```solidity
event AddRewardToken(address indexed token);
```

**Description:**
Emitted when a new reward token is added.

**Parameters:**
- `token`: Address of the reward token added.

### RemoveRewardToken

**Signature:**
```solidity
event RemoveRewardToken(address indexed token);
```

**Description:**
Emitted when a reward token is removed.

**Parameters:**
- `token`: Address of the reward token removed.

### PriceProvider

**Signature:**
```solidity
event PriceProvider(address indexed priceProvider);
```

**Description:**
Emitted when a new price provider is set.

**Parameters:**
- `priceProvider`: Address of the new price provider.

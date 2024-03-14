
# VeBoost Contract

## Overview
The `VeBoostUpgradeable` contract implements boosting functionality within the Fenix ecosystem, allowing users to receive boosts based on locked FNX tokens.


## Interaction

For interaction, you can use any approach to interact with SC, such as:
1. Blast explorer
2. Custom frontend
3. Hardhat script
4. Direct rpc call
5. etc
   
## Functions

### Admin functions

#### `setFNXBoostPercentage(uint256 boostFNXPercentage_)`
Sets the FNX boost percentage. Only callable by the contract owner.

- `PRECISION` = 10_000 = 100%
- `DEFAULT_PERCENTAGE` = 1_000 = 10%
  
```js
function setFNXBoostPercentage(uint256 boostFNXPercentage_)
```

#### `setMinFNXAmount(uint256 minFNXAmount_)`
Sets the minimum FNX amount required for a boost. Only callable by the contract owner. 
```js
function setMinFNXAmount(uint256 minFNXAmount_)
```

#### `setMinLockedTime(uint256 minLockedTime_)`
Sets the minimum locked time required for a boost. Only callable by the contract owner.

- `DEFAULT` - 182 * 86400 = 182 days
- `MAX_TIME` - 182 days

```js
function setMinLockedTime(uint256 minLockedTime_)
```


#### `addRewardToken(address newRewardToken_)`
Adds a new reward token to the list of tokens users can receive as boosts. Only callable by the contract owner.
```js
function addRewardToken(address newRewardToken_)
```

#### `removeRewardToken(address rewardToken_)`
Removes a reward token from the list of tokens users can receive as boosts. Only callable by the contract owner.
```js
function removeRewardToken(address rewardToken_) external
```

#### `recoverTokens(address token_, uint256 recoverAmount_)`
Allows the owner to recover tokens from the contract. Only callable by the contract owner.
```js
function recoverTokens(address token_, uint256 recoverAmount_)
```

### Public functions
#### `rewardTokens()`
Returns an array of addresses for all reward tokens available.

#### `getMinFNXAmountForBoost()`
Returns the minimum FNX amount required for receiving a boost.

#### `getMinLockedTimeForBoost()`
Returns the minimum locked time required to qualify for a boost.

#### `getBoostFNXPercentage()`
Returns the current FNX boost percentage.

#### `getAvailableBoostFNXAmount()`
Returns the available amount of FNX for boosts, considering both balance and allowance.

#### `calculateBoostFNXAmount(uint256 depositedFNXAmount_)`
Calculates the amount of FNX that can be boosted based on the deposited amount.

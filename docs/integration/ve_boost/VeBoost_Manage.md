
# VeBoost Management

This document outlines the processes and methods that the owner of the VeBoost contract can use to manage the contract, as well as the process for replenishing tokens in the VeBoost contract.

## Owner Methods

The owner of the VeBoost contract has several methods at their disposal to manage various aspects of the contract. These methods are:

### Set Price Provider

**Signature:**
```solidity
function setPriceProvider(address priceProvider_) external onlyOwner;
```

**Description:**
Sets a new address for the FNX to USD price provider. Only the contract owner can call this function.

**Parameters:**
- `priceProvider_`: The address of the new price provider.

### Set FNX Boost Percentage

**Signature:**
```solidity
function setFNXBoostPercentage(uint256 boostFNXPercentage_) external onlyOwner;
```

**Description:**
Sets a new boost percentage for FNX tokens. Only the contract owner can call this function.

**Parameters:**
- `boostFNXPercentage_`: The new boost percentage in basis points.

**Example:**
- If the boost percentage is set to 1000, it means a 10% boost.
- If the boost percentage is set to 500, it means a 5% boost.

### Set Minimum USD Amount for Boost

**Signature:**
```solidity
function setMinUSDAmount(uint256 minUSDAmount_) external onlyOwner;
```

**Description:**
Sets a new minimum USD amount required to qualify for a boost. Only the contract owner can call this function.

**Parameters:**
- `minUSDAmount_`: The new minimum USD amount in 18 decimals.

### Set Minimum Locked Time for Boost

**Signature:**
```solidity
function setMinLockedTime(uint256 minLockedTime_) external onlyOwner;
```

**Description:**
Sets a new minimum locked time required to qualify for a boost. Only the contract owner can call this function. The time cannot exceed the predefined maximum.

**Parameters:**
- `minLockedTime_`: The new minimum locked time in seconds.

### Recover Tokens

**Signature:**
```solidity
function recoverTokens(address token_, uint256 recoverAmount_) external onlyOwner;
```

**Description:**
Allows the owner to recover tokens. Only the contract owner can call this function.

**Parameters:**
- `token_`: Address of the token to recover.
- `recoverAmount_`: Amount of the token to recover.

### Add Reward Token

**Signature:**
```solidity
function addRewardToken(address newRewardToken_) external onlyOwner;
```

**Description:**
Adds a new reward token to the list of tokens users can receive as boosts. Can only be called by the contract owner. Emits an `AddRewardToken` event upon success.

**Parameters:**
- `newRewardToken_`: The address of the token to be added as a new reward token.

### Remove Reward Token

**Signature:**
```solidity
function removeRewardToken(address rewardToken_) external onlyOwner;
```

**Description:**
Removes a reward token from the list of tokens users can receive as boosts. Can only be called by the contract owner. Emits a `RemoveRewardToken` event upon success.

**Parameters:**
- `rewardToken_`: The address of the reward token to be removed.

## Replenishing Tokens in VeBoost Contract

To ensure the VeBoost contract has sufficient tokens to provide boosts, tokens need to be replenished periodically. Here's how to do it:

1. **Transfer Tokens to the Contract:**
   - Use the `transfer` function of the token contract to transfer the desired amount of tokens to the VeBoost contract address.
   - Example:
     ```solidity
     IERC20(token).transfer(address(veBoostContract), amount);
     ```

To add reward tokens that are not FNX for distribution, simply transfer the tokens to the VeBoost contract address. **Ensure that the VeBoost contract has a sufficient balance of FNX tokens, as reward tokens are distributed proportionally to the FNX balance.**

### **!!! Important Note:**
When adding other tokens as rewards, make sure that the corresponding FNX amount has already been deposited into the contract. Reward tokens are issued proportionally to the FNX balance.
**For example, if the FNX balance is 1 token and the USDB balance is 10000, in case the user receives 1 FNX as a boost, he will also receive 10_000 USDB**
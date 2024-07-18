
# VeBoost View Methods

This document outlines the simple view methods available in the VeBoost contract, what they return, and how to obtain various pieces of information.

## View Methods

### rewardTokens

**Signature:**
```solidity
/**
* @dev Returns an array of addresses for all reward tokens available.
 * @return An array of addresses of reward tokens.
*/
function rewardTokens() external view returns (address[] memory);
```

**Description:**
Returns an array of addresses for all reward tokens available in the VeBoost system.

**Returns:**
- An array of addresses of reward tokens.

### getMinFNXAmountForBoost

**Signature:**
```solidity
/**
* @dev Returns the minimum FNX amount required for receiving a boost.
* @return The minimum amount of FNX required for a boost.
*/
function getMinFNXAmountForBoost() external view returns (uint256);
```

**Description:**
Returns the minimum FNX amount required for receiving a boost.

**Returns:**
- The minimum amount of FNX required for a boost.

### getMinLockedTimeForBoost

**Signature:**
```solidity
/**
* @dev Returns the current FNX boost percentage.
* @return The boost percentage.
*/
function getMinLockedTimeForBoost() external view returns (uint256);
```

**Description:**
Returns the minimum locked time required to qualify for a boost.

**Returns:**
- The minimum locked time in seconds.

### getBoostFNXPercentage

**Signature:**
```solidity
/**
* @dev Returns the current FNX boost percentage.
* @return The boost percentage.
*/
function getBoostFNXPercentage() external view returns (uint256);
```

**Description:**
Returns the current FNX boost percentage.

**Returns:**
- The boost percentage.

### getAvailableBoostFNXAmount

**Signature:**
```solidity
/**
* @dev Returns the available amount of FNX for boosts, considering both balance and allowance.
* @return The available FNX amount for boosts.
*/
function getAvailableBoostFNXAmount() public view returns (uint256);
```

**Description:**
Returns the available amount of FNX for boosts, considering both balance and allowance.

**Returns:**
- The available FNX amount for boosts.

### calculateBoostFNXAmount

**Signature:**
```solidity
/**
* @dev Calculates the amount of FNX that can be boosted based on the deposited amount.
* @param depositedFNXAmount_ The amount of FNX deposited.
* @return The amount of FNX that will be boosted.
*/
function calculateBoostFNXAmount(uint256 depositedFNXAmount_) public view returns (uint256);
```

**Description:**
Calculates the amount of FNX that can be boosted based on the deposited amount.

**Parameters:**
- `depositedFNXAmount_`: The amount of FNX deposited.

**Returns:**
- The amount of FNX that will be boosted.

## How to Obtain Information

- **List of Reward Tokens:** Call the `rewardTokens` method to get an array of all reward token addresses.
- **Minimum FNX Amount for Boost:** Use the `getMinFNXAmountForBoost` method to retrieve the minimum FNX amount required for a boost.
- **Minimum Locked Time for Boost:** Call the `getMinLockedTimeForBoost` method to get the minimum locked time in seconds.
- **Current FNX Boost Percentage:** Use the `getBoostFNXPercentage` method to find out the current boost percentage.
- **Available FNX for Boosts:** Call the `getAvailableBoostFNXAmount` method to see the available FNX amount for boosts.
- **Calculate Boost FNX Amount:** Use the `calculateBoostFNXAmount` method by providing the deposited FNX amount to calculate the boost amount.

By using these methods, users can easily obtain all necessary information about the VeBoost system and their potential boosts.

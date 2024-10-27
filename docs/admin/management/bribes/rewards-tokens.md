# Add/Remove Default Rewards Token for Bribes

## Overview
This document provides a guide on how to manage the default rewards tokens for bribes in the `BribeFactoryUpgradeable` smart contract. It includes details on how to view the current default rewards tokens, add new tokens, and remove existing tokens.

## Viewing Default Rewards Tokens
The default rewards tokens can be viewed using the following method:

### Method Signature
```solidity
function getDefaultRewardTokens() external view returns (address[] memory)
```

### Description
- **Returns**: An array of addresses representing the current default rewards tokens for bribes.
- **Usage**: This method can be used to check which tokens are currently set as default rewards.

### Example Usage
```solidity
address[] memory tokens = bribeFactory.getDefaultRewardTokens();
```

## Adding a Default Rewards Token
To add a new default rewards token, use the following method:

### Method Signature
```solidity
function pushDefaultRewardToken(address _token) external onlyOwner
```

### NatSpec Description
- **@notice** Adds a new default rewards token to the list of default rewards tokens.
- **@dev** This function can only be called by the contract owner.
- **@param _token** The address of the token to be added as a default rewards token.
- **@requirement** The token must not already exist in the list of default rewards tokens.
- **@emitted** Emits an `AddDefaultRewardToken` event when the token is successfully added.

### Example Usage
```solidity
bribeFactory.pushDefaultRewardToken(0x1234567890abcdef1234567890abcdef12345678);
```

## Removing a Default Rewards Token
To remove a default rewards token, use the following method:

### Method Signature
```solidity
function removeDefaultRewardToken(address _token) external onlyOwner
```

### NatSpec Description
- **@notice** Removes a token from the list of default rewards tokens.
- **@dev** This function can only be called by the contract owner.
- **@param _token** The address of the token to be removed from the list of default rewards tokens.
- **@requirement** The token must exist in the list of default rewards tokens.
- **@emitted** Emits a `RemoveDefaultRewardToken` event when the token is successfully removed.

### Example Usage
```solidity
bribeFactory.removeDefaultRewardToken(0x1234567890abcdef1234567890abcdef12345678);
```

## Events

### AddDefaultRewardToken
```solidity
event AddDefaultRewardToken(address indexed _token);
```
- **@notice** Emitted when a new default rewards token is added.
- **@param _token** The address of the token that was added.

### RemoveDefaultRewardToken
```solidity
event RemoveDefaultRewardToken(address indexed _token);
```
- **@notice** Emitted when a default rewards token is removed.
- **@param _token** The address of the token that was removed.

## Summary
- Use `getDefaultRewardTokens()` to view the current default rewards tokens.
- Use `pushDefaultRewardToken()` to add a new default rewards token (only callable by the owner).
- Use `removeDefaultRewardToken()` to remove an existing default rewards token (only callable by the owner).


# BribeFactory - Get Bribe Reward Tokens

This document provides details on methods for retrieving reward tokens in the `BribeFactory` and `Bribe` contracts.

## BribeFactory Contract

### `getDefaultRewardTokens()`

This method is part of the `BribeFactoryUpgradeable` contract. It returns the list of default reward tokens that are allowed in the factory.

```js
/**
 * @notice Returns the list of default reward tokens.
 * @return address[] An array of token addresses.
 */
function getDefaultRewardTokens() external view returns (address[] memory);

```
### `getBribeRewardTokens(address bribe_)`
This method is part of the BribeFactory contract. It returns the list of reward tokens allowed for a specific Bribe contract, combining both the default reward tokens and the tokens specific to that Bribe.
```js
/**
 * @notice Returns the list of reward tokens allowed for a specific Bribe contract.
 * @param bribe_ The address of the Bribe contract.
 * @return address[] An array of token addresses.
 */
function getBribeRewardTokens(address bribe_) external view returns (address[] memory);
}
```

## Bribe Contract

### `getRewardTokens()`

This method is part of the `Bribe` contract. It returns the list of reward tokens allowed for the `Bribe` contract, utilizing the `BribeFactory` contract's `getBribeRewardTokens` method.

```solidity
/**
 * @notice Returns the list of reward tokens allowed for this Bribe contract.
 * @return address[] An array of token addresses.
 */
function getRewardTokens() external view override returns (address[] memory);
```

### `getSpecificRewardTokens()`

This method is part of the `Bribe` contract. It returns the list of specifically allowed reward tokens for the `Bribe` contract.

```js
/**
 * @notice Returns the list of specifically allowed reward tokens for this Bribe contract.
 * @return address[] An array of token addresses.
 */
function getSpecificRewardTokens() external view override returns (address[] memory);
```

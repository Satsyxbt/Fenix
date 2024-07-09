
# BribeFactory and Bribe Contract Events

This document details the events emitted by the `BribeFactory` and `Bribe` contracts related to reward tokens.

## BribeFactory Contract Events

### `AddDefaultRewardToken`

This event is emitted by the `BribeFactory` contract when a new token is added to the default reward tokens list.

```solidity
/**
 * @notice Emitted when a new token is added to the default reward tokens list.
 * @param token The address of the token that was added.
 */
event AddDefaultRewardToken(address indexed token);
```

### `RemoveDefaultRewardToken`

This event is emitted by the `BribeFactory` contract when a token is removed from the default reward tokens list.

```solidity
/**
 * @notice Emitted when a token is removed from the default reward tokens list.
 * @param token The address of the token that was removed.
 */
event RemoveDefaultRewardToken(address indexed token);
```

## Bribe Contract Events

### `AddRewardToken`

This event is emitted by the `Bribe` contract when a new token is added to the reward tokens list.

```solidity
/**
 * @notice Emitted when a new token is added to the reward tokens list.
 * @param token The address of the token that was added.
 */
event AddRewardToken(address indexed token);
```

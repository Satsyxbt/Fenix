
# FenixRaise Errors

## Errors Overview

The FenixRaise contract defines several custom errors to handle various failure conditions. These errors are thrown in specific functions under certain conditions. Below is a detailed description of each error, the functions in which they are thrown, and the conditions under which they are triggered.

### IncorrectToVeNftPercentage
```solidity
/**
 * @dev Error thrown when the `toVeNftPercentage` is incorrect (i.e., greater than 1e18).
 */
error IncorrectToVeNftPercentage();
```
- **Description:** Thrown when the `toVeNftPercentage` is incorrect (i.e., greater than 1e18).
- **Functions:**
  - `initialize`
- **Conditions:**
  - The `toVeNftPercentage` is greater than 1e18 during the initialization.

### IncorrectTimestamps
```solidity
/**
 * @dev Error thrown when timestamps are incorrect
 */
error IncorrectTimestamps();
```
- **Description:** Thrown when the provided timestamps are not in the correct chronological order.
- **Functions:**
  - `setTimestamps`
- **Conditions:**
  - The provided timestamps do not follow the correct sequence (e.g., `startWhitelistPhaseTimestamp` >= `startPublicPhaseTimestamp`).

### OnlyForWhitelistedUser
```solidity
/**
 * @dev Error thrown when a non-whitelisted user attempts to deposit during the whitelist phase
 */
error OnlyForWhitelistedUser();
```
- **Description:** Thrown when a non-whitelisted user attempts to deposit during the whitelist phase.
- **Functions:**
  - `deposit`
- **Conditions:**
  - A user who is not on the whitelist attempts to deposit tokens during the whitelist phase.

### ClaimPhaseNotStarted
```solidity
/**
 * @dev Error thrown when claim phase not started at the moment
 */
error ClaimPhaseNotStarted();
```
- **Description:** Thrown when a user attempts to claim tokens before the claim phase has started.
- **Functions:**
  - `claim`
- **Conditions:**
  - The current time is before `startClaimPhaseTimestamp`.

### DepositClosed
```solidity
/**
 * @dev Error thrown when deposits are closed
 */
error DepositClosed();
```
- **Description:** Thrown when a user attempts to deposit tokens outside the allowed deposit phases.
- **Functions:**
  - `deposit`
- **Conditions:**
  - A user attempts to deposit tokens when neither the whitelist phase nor the public phase is active.

### UserDepositCap
```solidity
/**
 * @dev Error thrown when a user attempts to deposit more than the user cap
 */
error UserDepositCap();
```
- **Description:** Thrown when a user attempts to deposit more tokens than their individual cap allows.
- **Functions:**
  - `deposit`
- **Conditions:**
  - A user attempts to deposit an amount that exceeds their individual cap for the current phase.

### TotalDepositCap
```solidity
/**
 * @dev Error thrown when the total deposit cap is exceeded
 */
error TotalDepositCap();
```
- **Description:** Thrown when a deposit would cause the total deposited amount to exceed the contract's total deposit cap.
- **Functions:**
  - `deposit`
- **Conditions:**
  - A user's deposit would result in the total deposited amount exceeding `totalDepositCap`.

### RaiseNotFinished
```solidity
/**
 * @dev Error thrown when trying to withdraw deposits before the raise is finished
 */
error RaiseNotFinished();
```
- **Description:** Thrown when trying to withdraw deposits or excessive rewards before the raise has finished.
- **Functions:**
  - `withdrawDeposits`
  - `withdrawExcessiveRewardTokens`
- **Conditions:**
  - The current time is before `endPublicPhaseTimestamp`.

### ZeroAmount
```solidity
/**
 * @dev Error thrown when a zero amount is involved in a transaction
 */
error ZeroAmount();
```
- **Description:** Thrown when a zero amount is involved in a transaction.
- **Functions:**
  - `deposit`
  - `claim`
  - `withdrawDeposits`
  - `withdrawExcessiveRewardTokens`
- **Conditions:**
  - A user or the owner attempts to perform an action involving a zero amount.

### AlreadyClaimed
```solidity
/**
 * @dev Error thrown when a user tries to claim more than once
 */
error AlreadyClaimed();
```
- **Description:** Thrown when a user tries to claim their tokens more than once.
- **Functions:**
  - `claim`
- **Conditions:**
  - A user who has already claimed their tokens attempts to claim again.

### AddressZero
```solidity
/**
 * @dev Error thrown when an address parameter is zero (address(0))
 */
error AddressZero();
```
- **Description:** Thrown when an address parameter is zero (address(0)).
- **Functions:**
  - `initialize`
- **Conditions:**
  - An address parameter provided during initialization is zero (address(0)).

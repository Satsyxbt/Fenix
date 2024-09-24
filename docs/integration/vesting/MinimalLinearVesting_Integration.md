
# MinimalLinearVestingUpgradeable - Front-End Integration

This document outlines the key view methods and other functions that front-end developers will need to interact with the **MinimalLinearVestingUpgradeable** contract. These methods provide information such as how many tokens are available for claim, the start time of vesting, and allow users to claim their vested tokens.

## Check Available Tokens for Claim

To check how many tokens a user can claim, you can use the `getAvailableForClaim()` view function. This function returns the amount of tokens that have vested and are available for the user to claim.

### Function Definition

```solidity
/**
 * @notice Returns the amount of tokens available for claim for a given wallet.
 * @param wallet_ The address of the wallet to check.
 * @return The amount of tokens available for claim.
 */
function getAvailableForClaim(address wallet_) public view returns (uint256);
```

### Usage Example

To check the amount of claimable tokens for a user, you can call this function from the front-end:

```js
const claimableAmount = await vestingContract.methods.getAvailableForClaim(userAddress).call();
console.log("Claimable tokens:", claimableAmount);
```

This function returns the number of tokens available to be claimed by the specified wallet.

---

## Get Vesting Start Time

The start time of the vesting period is stored in the `startTimestamp` variable. You can call this view function to retrieve the timestamp when the vesting starts.

### Function Definition

```solidity
/**
 * @notice The timestamp when the vesting period starts.
 * @dev Vesting will begin at this timestamp, and users will be able to claim tokens accordingly.
 */
function startTimestamp() external view returns (uint256);
```

### Usage Example

To get the vesting start time from the front-end, use the following code:

```js
const vestingStartTime = await vestingContract.methods.startTimestamp().call();
console.log("Vesting start time (UNIX):", vestingStartTime);
```

This function returns the UNIX timestamp of when the vesting begins.

---

## Check If Claim Phase Has Started

The `isClaimPhase()` function allows you to check if the vesting has reached the claim phase, meaning users are allowed to claim tokens.

### Function Definition

```solidity
/**
 * @notice Returns whether the claim phase has started.
 * @dev The claim phase starts when the current timestamp is greater than or equal to the `startTimestamp`.
 * @return True if the claim phase has started, false otherwise.
 */
function isClaimPhase() public view returns (bool);
```

### Usage Example

To check if the claim phase has started:

```js
const claimPhaseStarted = await vestingContract.methods.isClaimPhase().call();
console.log("Is claim phase started?", claimPhaseStarted);
```

This function returns `true` if the claim phase has started, and `false` if it hasn't.

---

## Get User's Token Allocation

The `allocation()` function allows you to check how many tokens have been allocated to a specific wallet.

### Function Definition

```solidity
/**
 * @notice Mapping that stores the token allocation for each wallet.
 * @param wallet The address of the wallet to check.
 * @return The token allocation for the wallet.
 */
function allocation(address wallet) external view returns (uint256);
```

### Usage Example

To check how many tokens are allocated to a specific user:

```js
const allocatedTokens = await vestingContract.methods.allocation(userAddress).call();
console.log("Allocated tokens:", allocatedTokens);
```

This function returns the number of tokens allocated to the specified wallet.

---

## Get Total Claimed Tokens for a User

The `claimed()` function allows you to check how many tokens have been claimed by a user.

### Function Definition

```solidity
/**
 * @notice Mapping that stores the claimed amount of tokens for each wallet.
 * @param wallet The address of the wallet to check.
 * @return The total claimed amount of tokens for the wallet.
 */
function claimed(address wallet) external view returns (uint256);
```

### Usage Example

To check how many tokens a user has already claimed:

```js
const claimedTokens = await vestingContract.methods.claimed(userAddress).call();
console.log("Claimed tokens:", claimedTokens);
```

This function returns the total number of tokens that the user has claimed from their allocation.

---

## Get Token Address

The `token()` function returns the address of the ERC20 token being vested. This can be useful to display token information on the front-end.

### Function Definition

```solidity
/**
 * @notice The token address for the vested token.
 * @return The ERC20 token address.
 */
function token() external view returns (address);
```

### Usage Example

To get the token address:

```js
const tokenAddress = await vestingContract.methods.token().call();
console.log("Vested token address:", tokenAddress);
```

This function returns the address of the token that is being vested.

---

## Get Vesting Duration

To check the total duration of the vesting period, you can call the `duration()` view function. This value is set during initialization and represents the number of seconds over which the vesting occurs.

### Function Definition

```solidity
/**
 * @notice The duration of the vesting period in seconds.
 * @dev This defines how long the vesting period lasts after the `startTimestamp`.
 */
function duration() external view returns (uint256);
```

### Usage Example

To get the vesting duration, use the following code:

```js
const vestingDuration = await vestingContract.methods.duration().call();
console.log("Vesting duration (seconds):", vestingDuration);
```

This function returns the total duration of the vesting period in seconds.

---

## Get Total Allocated Tokens

To see how many tokens have been allocated in total for all wallets, you can use the `totalAllocated` view function.

### Function Definition

```solidity
/**
 * @notice The total amount of tokens that have been allocated to all wallets.
 */
function totalAllocated() external view returns (uint256);
```

### Usage Example

To get the total allocated tokens:

```js
const totalAllocatedTokens = await vestingContract.methods.totalAllocated().call();
console.log("Total allocated tokens:", totalAllocatedTokens);
```

This function returns the total number of tokens allocated to all wallets.
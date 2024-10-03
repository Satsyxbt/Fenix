
# `createLockFor` Function Documentation

This section describes the `createLockFor` function, including its parameters, return values, and usage examples. 

## Function Overview

The `createLockFor` function is responsible for creating a new lock for a user and minting a corresponding veNFT. The veNFT can then be attached to a managed veNFT (mVeNFT), optionally boosted, and locked permanently if required.

```solidity
/**
 * @notice Creates a new lock for a user and mints a veNFT.
 * @dev This function allows for optional boosting and permanent locking.
 * @param amount_ The amount of tokens to lock.
 * @param lockDuration_ The duration of the lock (in seconds, rounded to the nearest week).
 * @param to_ The address that will receive the veNFT.
 * @param shouldBoosted_ Indicates whether the lock should be boosted.
 * @param withPermanentLock_ Whether the lock should be permanent.
 * @param managedTokenIdForAttach_ The ID of the managed veNFT to which the veNFT should be attached.
 * @return newTokenId The ID of the newly created veNFT.
 */
function createLockFor(
    uint256 amount_,
    uint256 lockDuration_,
    address to_,
    bool shouldBoosted_,
    bool withPermanentLock_,
    uint256 managedTokenIdForAttach_
) external returns (uint256 newTokenId);
```

## Parameters

- `amount_`: The amount of tokens to lock.
- `lockDuration_`: The duration of the lock, in seconds. The duration is rounded to the nearest week.
- `to_`: The address to which the veNFT will be minted.
- `shouldBoosted_`: A boolean flag indicating whether the lock should be boosted for additional voting power. (**Should be TRUE for just users**)
- `withPermanentLock_`: A boolean flag indicating whether the lock should be permanent.
- `managedTokenIdForAttach_`: The ID of the managed veNFT (mVeNFT) to which the veNFT will be attached. If not provided, the veNFT will not be attached to an mVeNFT.

## Return Values

- `newTokenId`: The ID of the newly created veNFT.

## Usage Examples

### Example 1: Creating and Attaching to an mVeNFT

In this example, a user creates a lock and attaches the newly created veNFT to an existing managed veNFT (mVeNFT).

```solidity
uint256 amount = 1000 * 1e18; // Locking 1000 tokens
uint256 duration = 182 days; // Lock duration of 182 days
address recipient = 0x123...; // Address to receive the veNFT
bool shouldBoosted = true; // Enable boosting for additional voting power
bool withPermanentLock = false; // No permanent locking
uint256 mVeNFTId = 1; // ID of the managed veNFT

uint256 newTokenId = votingEscrow.createLockFor(
    amount,
    duration,
    recipient,
    shouldBoosted,
    withPermanentLock,
    mVeNFTId
);
```

### Example 2: Creating a Lock with using Boosting for deposit

In this example, the `shouldBoosted_` flag is set to `true`

```solidity
uint256 amount = 500 * 1e18; // Locking 500 tokens
uint256 duration = 90 days; // Lock duration of 90 days
address recipient = 0x456...; // Address to receive the veNFT
bool shouldBoosted = true; // Enable boosting
bool withPermanentLock = false; // No permanent locking

uint256 newTokenId = votingEscrow.createLockFor(
    amount,
    duration,
    recipient,
    shouldBoosted,
    withPermanentLock,
    0 // No mVeNFT attachment
);
```

### Example 3: Creating a Permanently Locked veNFT

In this example, a user creates a lock with permanent locking enabled by setting the `withPermanentLock_` flag to `true`.

```solidity
uint256 amount = 2000 * 1e18; // Locking 2000 tokens
uint256 duration = 182 days; // Lock duration of 182 days (initial duration, though it will be permanent)
address recipient = 0x789...; // Address to receive the veNFT
bool shouldBoosted = true; // Enable boosting
bool withPermanentLock = true; // Enable permanent locking

uint256 newTokenId = votingEscrow.createLockFor(
    amount,
    duration,
    recipient,
    shouldBoosted,
    withPermanentLock,
    0 // No mVeNFT attachment
);
```
**Function Overview: `depositWithIncreaseUnlockTime`**

The `depositWithIncreaseUnlockTime` function allows users to both extend the lock period and deposit additional tokens into an existing veNFT (Voting Escrow Non-Fungible Token). This function is useful when users want to increase their veNFT balance and simultaneously prolong their voting power duration.

### Function Signature

```solidity
/**
 * @notice Deposits tokens to increase the balance and extend the lock duration for a given token ID.
 * @dev The lock duration is increased and the deposit is processed for the given token.
 *      The veNFT must not be in permanent lock, and must exist.
 * @param tokenId_ The ID of the token to increase the balance and extend the lock duration.
 * @param amount_ The amount of tokens to be deposited.
 * @param lockDuration_ Duration (in seconds) - how long the new lock should be.
 */
function depositWithIncreaseUnlockTime(
    uint256 tokenId_,
    uint256 amount_,
    uint256 lockDuration_
) external;
```

### Usage

- **Parameters**:
  - `tokenId_ (uint256)`: The ID of the veNFT to be modified.
  - `amount_ (uint256)`: The amount of tokens to be deposited into the veNFT.
  - `lockDuration_ (uint256)`: Duration (in seconds) - how long the new lock should be.

- **Requirements**:
  - Only the owner or an approved user of the veNFT can invoke this function.
  - The `tokenId_` must be a valid, existing token owned or approved by the caller.
  - The veNFT must not be in permanent lock.
  - The `amount_` should be greater than zero.
  - The `lockDuration_` must not exceed the maximum lock duration allowed by the contract and must be greater than the current lock period.

### How It Works

1. **Increase Unlock Time**: The function first calls `_increaseUnlockTime` to extend the locking period of the specified veNFT. The lock duration is rounded to the nearest epoch for consistency.

2. **Deposit Tokens**: After extending the lock, `_depositFor` is called to deposit the provided token amount (`amount_`) into the veNFT. If the new lock time meets the conditions required for boosting, the `veBoost` mechanism may apply additional boost rewards to the veNFT.

### Events Emitted

- x2 **`Deposit` Event**: Triggered after the successful deposit, indicating the sender, the token ID, the amount of tokens deposited, the new lock end time, and the deposit type.
- **`Supply` Event**: Emitted to indicate changes in the total locked supply due to this deposit.
- **`Boost` Event (conditional)**: If the veBoost mechanism applies a boost, a `Boost` event will be emitted to record the boost value added to the veNFT.

### Failure Scenarios

The function may fail in the following situations:

- **Unauthorized Access**: If the caller is neither the owner nor approved for the given veNFT (`AccessDenied` error).
- **Invalid Lock Duration**: If the new lock duration is not greater than the current lock period or exceeds the maximum allowed duration (`InvalidLockDuration` error).
- **Zero Amount**: If the deposit amount (`amount_`) is zero, the transaction will revert.


### Example Usage

```solidity
// Example of calling depositWithIncreaseUnlockTime
uint256 tokenId = 1; // The ID of the veNFT
uint256 amount = 1000 * 1e18; // Amount of tokens to deposit (in wei)
uint256 lockDuration = 182*86400; // Extend the lock to max unlock time

votingEscrow.depositWithIncreaseUnlockTime(tokenId, amount, lockDuration);
```
In this example, the user deposits 1000 tokens into their veNFT with ID `1`, extending the lock duration by 26 weeks. The function will first increase the unlock time and then proceed to deposit the tokens. If eligible, a boost will be applied to the veNFT.
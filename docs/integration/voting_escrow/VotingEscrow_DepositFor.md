
# depositFor Function

This document provides an overview of the `depositFor` function in the VotingEscrowUpgradeableV2 contract. The function allows users to deposit additional tokens into an existing lock represented by an NFT.

## Function Description

The `depositFor` function is used to add tokens to an existing lock without extending the lock duration. The caller can also choose whether to apply the boost and permanent lock features.

```solidity
/**
 * @notice Deposit `_value` tokens for `_tokenId` and add to the lock.
 * @dev Anyone (even a smart contract) can deposit for someone else, but
 *      cannot extend their locktime and deposit for a brand new user.
 * @param _tokenId The ID of the lock NFT.
 * @param _value Amount to add to the user's lock.
 * @param shouldBoosted_ A boolean flag to specify whether boosting should be applied.
 * @param withPermanentLock_ A boolean flag to specify whether to apply a permanent lock. 
 *        Only the owner of the mVeNFT can set this to true.
 * @custom:error AccessDenied Thrown when the caller is not the owner or approved operator.
 */
function depositFor(
    uint256 _tokenId, 
    uint256 _value, 
    bool shouldBoosted_, 
    bool withPermanentLock_
) external;
```

## Requirements

- The `_tokenId` must represent an existing lock with a positive locked amount.
- The `withPermanentLock_` flag can only be set by the owner of the associated mVeNFT.
- If `shouldBoosted_` is set to true, the system will check if boosting conditions are met.

## Examples

### Example 1: Deposit Tokens with Boosting

This example shows how to deposit tokens with the boosting feature enabled.

```solidity
// Assume the token ID 1 exists and has an associated lock.
votingEscrow.depositFor(1, 1000 ether, true, false);
```

In this example, 1000 tokens are added to the lock, and boosting is enabled by setting the `shouldBoosted_` flag to `true`.

### Example 2: Deposit Tokens with Permanent Lock

This example shows how to deposit tokens and apply a permanent lock.

```solidity
// Assume the caller is the owner of mVeNFT associated with token ID 2.
votingEscrow.depositFor(2, 500 ether, false, true);
```

In this example, 500 tokens are deposited, and the permanent lock is applied by setting `withPermanentLock_` to `true`. Note that only the owner of the associated mVeNFT can set `withPermanentLock_` to `true`.

### Example 3: Deposit Tokens Without Boosting or Permanent Lock

```solidity
// Deposit tokens without enabling boost or permanent lock for token ID 3.
votingEscrow.depositFor(3, 200 ether, false, false);
```

This example shows how to add tokens to a lock without enabling either boosting or permanent locking.

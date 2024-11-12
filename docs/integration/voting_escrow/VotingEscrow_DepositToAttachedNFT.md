# VotingEscrow - depositToAttachedNFT

## Overview

The `depositToAttachedNFT` function in the `VotingEscrow` contract allows users to deposit tokens into an attached NFT, which increases its locked balance and enhances its voting power

## Function Signature and Explanation

```solidity
    /**
     * @notice Deposits tokens to an attached NFT, updating voting power.
     * @dev The function transfers the token amount to this contract, updates the locked balance, and notifies the managed NFT.
     *      Only callable by the NFT's owner or approved operator.
     * @param tokenId_ The ID of the NFT receiving the deposit.
     * @param amount_ The amount of tokens to deposit.
     * @custom:event DepositToAttachedNFT Emitted when tokens are deposited to an attached NFT.
     * @custom:event Supply Emitted when the total supply of voting power is updated.
     * @custom:error NotManagedNft Thrown if the managed token ID is invalid.
     */
    function depositToAttachedNFT(uint256 tokenId_, uint256 amount_) external;
```

- **Contract**: This function is part of the `VotingEscrow` contract
- **Purpose**: `depositToAttachedNFT` deposits a specified amount of tokens to an NFT that is attached to a managed NFT
- **Parameters**:
  - `tokenId_ (uint256)`: The ID of the NFT to which tokens are being deposited.
  - `amount_ (uint256)`: The amount of tokens to deposit.
- **Caller Requirements**: The function can be called by anyone for the any of not managed NFT. The caller must ensure they have approved the Voting Escrow contract to transfer the required token amount on their behalf.
- **Events**: Upon a successful deposit, the function emits two events:
  - `DepositToAttachedNFT`: Indicates the deposit of tokens into the specified NFT.
  - `Supply`: Indicates an update to the total supply of voting power.
- **Distribution Window Restriction**: The function cannot be called during the Distribution Window in the Voter contract. Depositing into an attached NFT triggers a proportional redistribution of voting power within the nest strategy.

## Events

### DepositToAttachedNFT

This event is emitted when tokens are deposited to an attached NFT, reflecting the increase in locked balance and voting power.

```solidity
/**
 * @notice Emitted when tokens are deposited to an attached NFT.
 * @param provider The address of the user making the deposit.
 * @param tokenId The ID of the NFT receiving the deposit.
 * @param managedTokenId The ID of the managed token receiving the voting power.
 * @param value The amount of tokens deposited.
 */
event DepositToAttachedNFT(address indexed provider, uint256 tokenId, uint256 managedTokenId, uint256 value);
```

### Supply

This event is emitted when the total supply of voting power is updated.

```solidity
/**
 * @notice Emitted when the total supply of voting power is updated.
 * @param prevSupply The previous total supply of voting power.
 * @param newSupply The new total supply of voting power.
 */
event Supply(uint256 prevSupply, uint256 newSupply);
```
## Function Features

- **Locked Balance Update**: This function deposits tokens into an attached NFT, increasing its locked balance and enhancing its voting power.
- **Voting Power Notification**: After updating the locked balance, the function notifies the managed NFT of the change.
- **Total Supply Update**: The function also updates the total supply of voting power in the system.

## Example: Depositing Tokens to an Attached NFT

Below is a simplified JavaScript example that demonstrates how to call the `depositToAttachedNFT` function from the `VotingEscrow` contract. It assumes that the user has already approved the Voting Escrow contract to spend FNX tokens on their behalf.

```javascript
// Assuming the contract instance has been created and connected to a signer
await votingEscrow.depositToAttachedNFT(tokenId, amount);
```


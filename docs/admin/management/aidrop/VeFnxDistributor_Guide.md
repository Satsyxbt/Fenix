# VeFnxDistributor Guide

## Overview
This document provides a detailed guide for interacting with the `VeFnxDistributorUpgradeable` contract. The `VeFnxDistributorUpgradeable` contract is responsible for distributing `veFnx` tokens to specified recipients by locking FNX tokens in the Voting Escrow contract. The distribution helps recipients gain voting power and incentives through `veFnx`. The contract is managed by the owner, who can initialize, distribute tokens, and recover mistakenly sent funds.

## Key Functionalities

### 1. Initialization
The contract must be initialized before it can be used. The initialization process sets the required addresses and ensures that all components are properly configured.

#### Function: `initialize`
- **Signature**: `function initialize(address blastGovernor_, address fenix_, address votingEscrow_) external initializer`
- **Parameters**:
  - `blastGovernor_ (address)`: The address of the Blast Governor contract.
  - `fenix_ (address)`: The address of the FNX token contract.
  - `votingEscrow_ (address)`: The address of the Voting Escrow contract.
- **Usage**: This function must be called once to set up the required contracts before the distributor can perform token distributions.
- **Important Considerations**: The addresses provided should not be zero addresses, as they will cause the initialization to revert.

### 2. Distributing veFnx Tokens
The core functionality of the contract is to distribute `veFnx` tokens by locking FNX tokens in the Voting Escrow contract on behalf of specified recipients.

#### Function: `distributeVeFnx`
- **Signature**: `function distributeVeFnx(AidropRow[] calldata rows_) external override onlyOwner`
- **Parameters**:
  - `rows_ (AidropRow[])`: An array of structs, each representing a recipient and the amount of FNX tokens to be distributed. The struct `AidropRow` contains:
    - `recipient (address)`: The recipient's address.
    - `amount (uint256)`: The amount of FNX tokens to lock.
    - `withPermanentLock (bool)`: Indicates if the lock should be permanent.
    - `managedTokenIdForAttach (uint256)`: Token ID of the managed veNFT to attach to (if applicable).
- **How to Call**:
  1. Ensure the contract has enough FNX tokens in its balance to perform the distribution.
  2. Prepare an array of `AidropRow` structs containing the recipients and respective amounts to be distributed.
  3. Call the `distributeVeFnx` function to lock the FNX tokens in the Voting Escrow contract and distribute `veFnx` to the recipients.
  4. For each successful distribution, an `AirdropVeFnx` event will be emitted.
- **Important Considerations**:
  - Ensure there is enough FNX balance in the contract before initiating a distribution.
  - If the recipient address is zero, the function will revert with `ZeroRecipientAddress`.
  - If the contract's FNX balance is insufficient, it will revert with `InsufficientBalance`.

### 3. Recovering Tokens
The contract owner can recover tokens that were mistakenly sent to the contract.

#### Function: `recoverTokens`
- **Signature**: `function recoverTokens(address token_, uint256 recoverAmount_) external onlyOwner`
- **Parameters**:
  - `token_ (address)`: The address of the token to recover.
  - `recoverAmount_ (uint256)`: The amount of the token to recover.
- **How to Call**:
  1. Ensure that you are the contract owner.
  2. Call the `recoverTokens` function with the token address and the amount to recover.
  3. A `RecoverToken` event will be emitted upon successful recovery.
- **Important Considerations**: Only the owner can call this function to prevent unauthorized access to the contract's assets.

## Events
- **AirdropVeFnx**:
  - **Emitted When**: The `distributeVeFnx` function successfully locks FNX tokens for a recipient.
  - **Parameters**:
    - `recipient (address)`: The address of the recipient receiving `veFnx`.
    - `tokenId (uint256)`: The token ID created for the recipient in the Voting Escrow contract.
    - `lockDuration (uint256)`: The lock duration for `veFnx` (fixed at `182 days`).
    - `amount (uint256)`: The amount of FNX locked.

- **RecoverToken**:
  - **Emitted When**: The `recoverTokens` function is called successfully.
  - **Parameters**:
    - `token (address)`: The address of the token being recovered.
    - `recoverAmount (uint256)`: The amount of the token being recovered.

## Important Considerations
- **Lock Duration**: All FNX tokens are locked for a fixed duration of `182 days` when distributed through the `distributeVeFnx` function.
- **Permanent Lock Option**: The `AidropRow` struct contains a boolean `withPermanentLock` to indicate if the `veFnx` tokens should be locked permanently.
- **Owner-Only Functions**: The `distributeVeFnx` and `recoverTokens` functions are restricted to the owner to prevent misuse.

## Example Usage
**Distribute veFnx Tokens**:
   Prepare an array of recipients and amounts to distribute:
   ```solidity
   AidropRow[] memory rows = new AidropRow[](2);
   rows[0] = AidropRow(0xRecipient1, 1000e18, false, 0);
   rows[1] = AidropRow(0xRecipient2, 500e18, true, 1234);
   
   veFnxDistributor.distributeVeFnx(rows);
   ```
**Js example**:
```js
 await veFnxDistributor.distributeVeFnx([
    { recipient: 0xRecipient1, amount: ethers.parseEther('500'), withPermanentLock:false, managedTokenIdForAttach: 0 },
    { recipient: 0xRecipient2, amount: ethers.parseEther('100'), withPermanentLock:false, managedTokenIdForAttach: 1 }
]);

```

 **Recover Tokens**:
   To recover mistakenly sent tokens:
   ```solidity
   veFnxDistributor.recoverTokens(0xOtherTokenAddress, 100e18);
   ```

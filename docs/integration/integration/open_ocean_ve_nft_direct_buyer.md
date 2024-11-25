# OpenOceanVeNftDirectBuyer Integration Guide

## Overview

The `OpenOceanVeNftDirectBuyer` contract facilitates the direct purchase of veNFTs through token swaps executed via the OpenOcean exchange. The swap's destination tokens are used to create veNFTs, and the contract integrates with the `VotingEscrow` and `BlastGovernorClaimableSetup` components.

- [OpenOcean Documentation](https://docs.openocean.finance/).

## Method: `directVeNftPurchase`

### Function Signature

```solidity
    /**
     * @notice Facilitates a direct purchase of veNFTs by performing a token swap and veNFT creation.
     * @dev The function validates inputs, executes the swap, and creates a veNFT for the recipient.
     * @param caller_ The OpenOcean caller contract.
     * @param desc_ The swap description containing details of the source and destination tokens.
     * @param calls_ The calls to execute as part of the OpenOcean swap.
     * @param votingEscrowCreateForParams_ Parameters for creating the veNFT.
     * @return tokenAmount The amount of destination tokens obtained in the swap.
     * @return tokenId The ID of the veNFT created.
     * @custom:requirements The destination token must match the expected token, and the caller must provide sufficient balance.
     * @custom:emits Emits a `DirectVeNftPurchase` event on successful veNFT creation.
     */
   function directVeNftPurchase(
      IOpenOceanCaller caller_,
      IOpenOceanExchange.SwapDescription calldata desc_,
      IOpenOceanCaller.CallDescription[] calldata calls_,
      VotingEscrowCreateLockForParams calldata votingEscrowCreateForParams_
   ) external payable returns (uint256 tokenAmount, uint256 tokenId)
```

### Parameters

- **`caller_`**: The OpenOcean caller contract that executes the swap.
- **`desc_`**: Swap description containing details of the source and destination tokens and swap specifics, including:
  - **`srcToken`**: The token to be swapped.
  - **`dstToken`**: The token received after the swap, which must be used for veNFT creation.
  - **`srcReceiver`**: The address that sends the source token for the swap.
  - **`dstReceiver`**: The address that receives the swapped tokens. Must be set to the `OpenOceanVeNftDirectBuyer` contract address or zero (`0`).
  - **`amount`**: The amount of `srcToken` to swap.
  - **`minReturnAmount`**: The minimum amount of `dstToken` expected from the swap.
  - **`guaranteedAmount`**: The guaranteed amount that must be obtained from the swap.
  - **`flags`**: Additional settings for the swap.
  - **`referrer`**: The address that refers the swap.
  - **`permit`**: A permit for token approval, if applicable.
- **`calls_`**: An array of call descriptions that define specific actions to be executed as part of the OpenOcean swap.
- **`votingEscrowCreateForParams_`**: Parameters for creating the veNFT through `VotingEscrow`:
  - **`lockDuration`**: The duration for which the tokens will be locked.
  - **`to`**: The address that will receive the veNFT.
  - **`shouldBoosted`**: Indicates whether the veNFT should have boosted properties.
  - **`withPermanentLock`**: Indicates if the veNFT should have a permanent lock.
  - **`managedTokenIdForAttach`**: The ID of the managed veNFT token to which this lock will be attached.

### Preconditions

1. **Approving Tokens**:
   - Before calling `directVeNftPurchase`, you need to approve the OpenOceanVeNftDirectBuyer to spend the source token (`srcToken`). This is done by calling the `approve` method on the `srcToken` 
   
2. **Sufficient Balance**:
   - Ensure the sender (`wallet`) has a sufficient balance of the `srcToken` to perform the swap.

3. **Destination Token Check**:
   - The `desc_.dstToken` must match the token address used for veNFT creation (`token`). Otherwise, the transaction will revert with an `InvalidDstToken` error.

4. **Destination Receiver Check**:
   - The `desc_.dstReceiver` should either be set to the `OpenOceanVeNftDirectBuyer` contract address or to zero (`0`). If any other address is provided, the transaction will revert with an `InvalidDstReceiver` error.

5. **Destination Receiver in `calls_`**
   - In case the caller wakes up the recipient, it must also be equal to `OpenOceanVeNftDirectBuyer`


### Important Integration Details

- **Setting `dstReceiver` Correctly**:
  - The `dstReceiver` in the `desc_` parameter must be either the address of the `OpenOceanVeNftDirectBuyer` contract itself or zero (`0`). This is critical to ensure that the output tokens from the swap are received by the contract, allowing it to proceed with veNFT creation.

- **Correct Recipient in `calls_` Parameter**:
  - The `calls_` parameter should include the correct recipient address for the swap. In particular, the `OpenOceanVeNftDirectBuyer` contract must be specified as the recipient to ensure proper token flow during the swap process. This guarantees that the output tokens are correctly received and can be used for veNFT creation.

### Failure Reasons

- **`InvalidDstToken`**: Thrown if the destination token does not match the expected token used for veNFT creation.
- **`InvalidDstReceiver`**: Thrown if the `dstReceiver` parameter in the swap description is not set correctly.
- **`InvalidOutputAmount`**: Thrown if the output token amount after the swap does not match expectations.
- **`PermitNotSupported`**: If the swap tries to use permit functionality, the contract will revert with this error.

### Events

- **`DirectVeNftPurchase`**: Emitted when a veNFT is successfully created after a token swap.
  
  Event Signature:
  ```solidity
    /**
     * @notice Emitted after a successful direct veNFT purchase.
     * @param caller The address of the function caller.
     * @param recipient The address of the veNFT recipient.
     * @param srcToken The address of the source token used for the swap.
     * @param spentAmount The amount of source tokens spent in the swap.
     * @param tokenAmount The amount of destination tokens obtained in the swap.
     * @param veNftTokenId The ID of the veNFT created for the recipient.
     */
   event DirectVeNftPurchase(
         address indexed caller,
         address indexed recipient,
         address indexed srcToken,
         uint256 spentAmount,
         uint256 tokenAmount,
         uint256 veNftTokenId
   );
  ```
  
  Parameters:
  - `caller`: Address of the function caller.
  - `recipient`: Address of the veNFT recipient.
  - `srcToken`: Address of the source token used for the swap.
  - `spentAmount`: Amount of source tokens spent in the swap.
  - `tokenAmount`: Amount of destination tokens obtained in the swap.
  - `veNftTokenId`: ID of the veNFT created for the recipient.



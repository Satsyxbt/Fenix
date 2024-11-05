## VeFnxSplitMerklAidropUpgradeable Integrate

### Integration Guide

#### Overview
The `VeFnxSplitMerklAidropUpgradeable` contract allows users to claim their allocated tokens either entirely as veNFT tokens or as pure tokens at a specified rate. The contract supports pausing and unpausing by the owner and integrates with a Voting Escrow contract to lock the claimed tokens as veNFT if chosen.

#### Claiming Tokens
To claim your allocated tokens, follow these steps:

1. Ensure the contract is not paused.
2. Prepare the amount you are entitled to claim and the corresponding Merkle proof.
3. Call the `claim` function with the amount and the Merkle proof.

```solidity
    /**
     * @dev Allows a user to claim tokens or veNFT tokens based on a Merkle proof.
     * @param inPureTokens_ Boolean indicating if the claim is in pure tokens.
     * @param amount_ The amount to claim.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @param proof_ The Merkle proof for the claim.
     * @notice This function can only be called when the contract is not paused.
     */
    function claim(
        bool inPureTokens_,
        uint256 amount_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_,
        bytes32[] memory proof_
    ) external;
```
- **Parameters:**
  - `inPureTokens_`: A boolean indicating if the claim is in pure tokens.
  - `amount_`: The total amount of tokens you can claim.
  - `proof_`: The Merkle proof verifying your claim.
  - `withPermanentLock_`: A boolean indicating whether the veNFT lock should be permanent lock. (Only applicable if claiming as veNFT).
  - `managedTokenIdForAttach_`: The managed NFT ID to attach to when claiming. Use 0 if not attaching to any NFT.

The function verifies the provided proof against the stored Merkle root. If valid, it proceeds as follows:
- If `inPureTokens_` is `true`, the claim is processed as pure tokens at a rate based on pureTokensRate.
- If `inPureTokens_` is `false`, the full amount is issued as veNFT with the option of permanent lock and attach to managed NFT if specified.

The claim will then be processed, and the relevant amounts will be distributed accordingly.

**Note**: If the Merkle root is updated, you can claim again if your new claim amount equals the previous claim amount plus any new rewards.


#### Calculating Pure Tokens Amount
The contract provides a function to calculate the equivalent amount in pure tokens based on the claim amount. This is useful for determining how much you will receive if you choose to claim in pure tokens.

```solidity
function calculatePureTokensAmount(uint256 claimAmount_) public view returns (uint256);
```
- **Parameters:**
  - `claimAmount_`: The claim amount for which to calculate the equivalent pure tokens.
- **Returns:**
  - The calculated amount of pure tokens.

This function allows users to estimate the pure tokens they will receive before making a claim.

#### Errors
- **IncorrectPureTokensRate**: Thrown when the pure tokens rate is set incorrectly.
- **InvalidProof**: Thrown when a provided Merkle proof is invalid.
- **ZeroAmount**: Thrown when the claim amount is zero.
- **NotAllowedClaimOperator**: Thrown when the caller is not an allowed claim operator.
- **ZeroPureTokensRate**: Thrown when the pure tokens rate is zero.

#### Special Considerations
- Ensure that the contract is not paused when making a claim.
- Verify the Merkle proof accurately to avoid `InvalidProof` errors.
- The pure tokens rate is used to determine the number of pure tokens equivalent to the claimed amount. Ensure it is set correctly by the owner.


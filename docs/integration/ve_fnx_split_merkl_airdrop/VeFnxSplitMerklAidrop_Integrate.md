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
function claim(bool inPureTokens_, uint256 amount_, bytes32[] memory proof_) external;
```
- **Parameters:**
  - `inPureTokens_`: A boolean indicating if the claim is in pure tokens.
  - `amount_`: The total amount of tokens you can claim.
  - `proof_`: The Merkle proof verifying your claim.

The function will verify the provided proof against the stored Merkle root. If the proof is valid, the function will either:
- Transfer the full amount as veNFT token if `inPureTokens_` is `false`.
- Will issue in the form of pure FNX tokens but with conversion at a certain rate, based on the `pureTokensRate` if `inPureTokens_` is `true`.

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


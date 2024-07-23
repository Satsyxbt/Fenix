
### VeFnxSplitMerklAidrop Integrate

#### Integration Guide

##### Overview
The `VeFnxSplitMerklAidropUpgradeable` contract allows users to claim their allocated FNX and veFNX tokens based on a Merkle tree proof. The contract supports pausing and unpausing by the owner and integrates with a Voting Escrow contract to lock a portion of the claimed tokens as veFNX.

##### Claiming Tokens
To claim your allocated tokens, follow these steps:

1. Ensure the contract is not paused.
2. Prepare the amount you are entitled to claim and the corresponding Merkle proof.
3. Call the `claim` function with the amount and the Merkle proof.

```solidity
function claim(uint256 amount_, bytes32[] memory proof_) external;
```

- **Parameters:**
  - `amount_`: The total amount of tokens you can claim.
  - `proof_`: The Merkle proof verifying your claim.

The function will verify the provided proof against the stored Merkle root. If the proof is valid, the function will calculate the amount to be locked as veFNX and the amount to be transferred directly. The claim will then be processed, and the relevant amounts will be distributed accordingly.

**Note:** If the Merkle root is updated, you can claim again if your new claim amount equals the previous claim amount plus any new rewards.

##### Merkle Root
The Merkle root is used to verify user claims. It is set by the owner and can only be updated when the contract is paused.

To update the Merkle root:

1. Ensure the contract is paused.
2. Call the `setMerklRoot` function with the new Merkle root.

```solidity
function setMerklRoot(bytes32 merklRoot_) external onlyOwner whenPaused;
```

- **Parameters:**
  - `merklRoot_`: The new Merkle root.

This function will emit a `SetMerklRoot` event upon successful update.

##### Errors

###### IncorrectToVeFnxPercentage
- Thrown when the `toVeFnxPercentage` is set to a value greater than 1e18.

###### InvalidProof
- Thrown when a provided Merkle proof is invalid.

###### ZeroAmount
- Thrown when the claim amount is zero.

##### Special Considerations
- Ensure that the contract is not paused when making a claim.
- Verify the Merkle proof accurately to avoid `InvalidProof` errors.
- The `toVeFnxPercentage` should be a fraction of 1e18 (e.g., 0.5 * 1e18 represents 50%).

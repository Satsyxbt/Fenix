
# Voter Aggregate Claim Documentation

## Overview

The `aggregateClaim` function in the `VoterUpgradeable` contract allows users to combine multiple claim operations into a single transaction. This feature is particularly useful for reducing gas costs and streamlining the claiming process for various rewards and bribes. The function supports claiming rewards from gauges, bribes, and Merkl data.

## Function signature
```solidity
    /**
     * @notice Aggregates multiple claim calls into a single transaction.
     * @param gauges_ The array of gauge addresses to claim rewards from.
     * @param bribes_ The parameters for claiming bribes without token ID.
     * @param bribesByTokenId_ The parameters for claiming bribes with a token ID.
     * @param merkl_ The parameters for claiming Merkl data.
     * @param splitMerklAidrop_ The parameters for claiming VeFnx Merkl airdrop data.
     */
    function aggregateClaim(
        address[] calldata gauges_,
        AggregateClaimBribesParams calldata bribes_,
        AggregateClaimBribesByTokenIdParams calldata bribesByTokenId_,
        AggregateClaimMerklDataParams calldata merkl_,
        AggregateClaimVeFnxMerklAirdrop calldata splitMerklAidrop_
    ) external;
```
### Input Types
```solidity
       /**
     * @dev Parameters for claiming bribes using a specific tokenId.
     */
    struct AggregateClaimBribesByTokenIdParams {
        uint256 tokenId; ///< The token ID to claim bribes for.
        address[] bribes; ///< The array of bribe contract addresses.
        address[][] tokens; ///< The array of arrays containing token addresses for each bribe.
    }

    /**
     * @dev Parameters for claiming bribes.
     */
    struct AggregateClaimBribesParams {
        address[] bribes; ///< The array of bribe contract addresses.
        address[][] tokens; ///< The array of arrays containing token addresses for each bribe.
    }

    /**
     * @dev Parameters for claiming Merkl data.
     */
    struct AggregateClaimMerklDataParams {
        address[] users; ///< The array of user addresses to claim for.
        address[] tokens; ///< The array of token addresses.
        uint256[] amounts; ///< The array of amounts to claim.
        bytes32[][] proofs; ///< The array of arrays containing Merkle proofs.
    }

    /**
     * @dev Parameters for claiming VeFnx Merkl airdrop data.
     */
    struct AggregateClaimVeFnxMerklAirdrop {
        uint256 amount; ///< The amount to claim.
        bytes32[] proofs; ///< The array of Merkle proofs.
    }
```

## Usage

To use the `aggregateClaim` function, users need to call it with the appropriate parameters. Here’s an example:

```solidity
VoterUpgradeableV1_2.aggregateClaim(
    gauges_,
    AggregateClaimBribesParams({
        bribes: [bribeAddress1, bribeAddress2],
        tokens: [[tokenA, tokenB], [tokenC]]
    }),
    AggregateClaimBribesByTokenIdParams({
        tokenId: 12345,
        bribes: [bribeAddress3],
        tokens: [[tokenD]]
    }),
    AggregateClaimMerklDataParams({
        users: [userAddress1, userAddress1],
        tokens: [tokenE, tokenF],
        amounts: [amount1, amount2],
        proofs: [[proof1], [proof2]]
    }),
    AggregateClaimVeFnxMerklAirdrop({
        amount: amount3,
        proofs: [proof3]
    })
);
```

## Function Mechanics

1. **Claim Rewards from Gauges**: The function first claims rewards from the specified gauges using the `claimRewards` method.
2. **Claim Bribes without Token ID**: It then claims bribes from the specified bribe contracts without using a token ID via the `claimBribes` method.
3. **Claim Bribes with Token ID**: Next, it claims bribes using the specified token ID by calling `claimBribes` with the token ID.
4. **Claim Merkl Data**: Finally, it claims rewards based on Merkle proofs by calling the `claim` method on the `MerklDistributor` contract.
5. **Claim VeFnx Merkl Airdrop**: Claims the VeFnx Merkl airdrop by calling the claimFor method on the VeFnxSplitMerklAidrop contract.

This comprehensive aggregation allows users to perform multiple reward and bribe claims efficiently within a single transaction, reducing the overall gas cost and simplifying the claiming process.


## Features
-  The claim call is made only for the caller. Specifying tokenId or other user addresses in the parameters will only result in a transaction failure
- If the length of the arrays is 0, then the call to request a reward for this parameter and type will be skipped, this will not lead to a transaction failure

## Parameters

### `gauges_`

- **Type**: `address[]`
- **Description**: An array of gauge addresses from which rewards will be claimed.
- **Equivalent Call**: `claimRewards(gauges_)`
- **Details**: This parameter specifies the gauges from which the user wants to claim rewards. The function iterates over the array and calls `claimRewards` for each gauge.

### `bribes_`

- **Type**: `AggregateClaimBribesParams`
  - `address[] bribes`: An array of bribe contract addresses.
  - `address[][] tokens`: A nested array where each sub-array contains token addresses associated with each bribe contract.
- **Equivalent Call**: `claimBribes(bribes, tokens)`
- **Details**: This parameter allows the user to claim bribes from multiple bribe contracts. Each bribe contract is associated with multiple tokens, specified in the nested array.

### `bribesByTokenId_`

- **Type**: `AggregateClaimBribesByTokenIdParams`
  - `uint256 tokenId`: The token ID used to claim bribes.
  - `address[] bribes`: An array of bribe contract addresses.
  - `address[][] tokens`: A nested array where each sub-array contains token addresses associated with each bribe contract.
- **Equivalent Call**: `claimBribes(bribes, tokens, tokenId)`
- **Details**: Similar to `bribes_`, but this parameter includes a `tokenId` to specify claims based on a specific token ID. This is useful for scenarios where bribes are tied to particular NFTs or other token-based identifiers.
- **Requirements**: The caller must be the owner or approved address for a provided tokenId

### `merkl_`

- **Type**: `AggregateClaimMerklDataParams`
  - `address[] users`: An array of user addresses to claim for.
  - `address[] tokens`: An array of token addresses.
  - `uint256[] amounts`: An array of amounts to be claimed.
  - `bytes32[][] proofs`: A nested array of Merkle proofs for each claim.
- **Equivalent Call**: `IMerklDistributor(merklDistributor).claim(users, tokens, amounts, proofs)`
- **Details**: This parameter allows for claiming rewards based on Merkle proofs. Each user, token, amount, and proof must correspond correctly.
- **Requirements**: 
    1. Parameter `address[] users` must contain only the caller's addresses. 
    2. **Set the Voter contract as an operator in the MerklDistributor contract from user** (Like ERC20 approve)

### `splitMerklAidrop_`
- **Type**: `AggregateClaimVeFnxMerklAirdrop`
    - `uint256 amount`: The amount to claim.
    - `bytes32[] proofs`: The array of Merkle proofs.
- **Equivalent Call**: `IVeFnxSplitMerklAidrop(veFnxMerklAidrop).claim(amount, proofs)`
- **Details**: This parameter is used to claim the VeFnx Merkl airdrop.

## Enabling Aggregate Claims with Voter Contract
To use the `aggregateClaim` function effectively, users must first enable the Voter contract to act on their behalf by using the `toggleOperator` function. This is essential for the Voter contract to manage claims, especially when interacting with the `MerklDistributor` contract.

- **See for details** [Voter_Merkl_Toggle_Operator.md](Voter_Merkl_Toggle_Operator.md)
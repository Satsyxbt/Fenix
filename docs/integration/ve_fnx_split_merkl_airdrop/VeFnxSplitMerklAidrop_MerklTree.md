# Creating a Merkle Tree for Rewards Distribution

This guide explains how to create a Merkle Tree for managing rewards distribution in the VeFnxSplitMerklAidrop contract. The process involves defining a list of users and their respective rewards, creating the Merkle Tree, generating the Merkle root, and obtaining proofs for users.

## Example script for generate merkl tree and input/output dat

- [Script for generate tree](/docs/integration/ve_fnx_split_merkl_airdrop/generateTree.ts)
- [Input Data](/docs/integration/ve_fnx_split_merkl_airdrop/input.json)
- [Output Data](/docs/integration/ve_fnx_split_merkl_airdrop/output.json)


## Steps to Create a Merkle Tree

### 1. Define the Rewards List

- The rewards list should consist of user addresses and their corresponding reward amounts.
- Each entry in the rewards list is a tuple consisting of an address and a uint256 value representing the reward amount for that address.

### 2. Create the Merkle Tree

- Use a library such as `@openzeppelin/merkle-tree` to construct the Merkle Tree.
- The tree is built from the list of reward entries, where each entry is treated as a leaf node.

### 3. Generate the Merkle Root

- Once the tree is constructed, generate the Merkle root.
- The Merkle root is a single hash representing the entire tree and is used to verify membership in the rewards list.

### Example Code

Here's an example of how to create a Merkle Tree with a rewards list:

```javascript
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

// Define the rewards list entries
const rewardsListEntries = [
  ["0x0000000000000000000000000000000000000001", "100000000000000000000"], 
  ["0x0000000000000000000000000000000000000002", "50000000000000000000"],
  ["0x0000000000000000000000000000000000000003", "100000000000000000"],
];

// Create the Merkle Tree
const tree = StandardMerkleTree.of(rewardsListEntries, ['address', 'uint256']);
```

### 3. Get proof for user

### Example Code

Here's an example of how to create a Merkle Tree with a rewards list:

```javascript
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
const tree = StandardMerkleTree.of ...

function getProof(address: string, tree: any): string[] {
  let proof: string[];
  for (const [i, v] of tree.entries()) {
    if (v[0] === address) {
      proof = tree.getProof(i);
    }
  }
  return proof!;
}


const proofForUser = getProof("0x0000000000000000000000000000000000000001", tree);

```
or from tree object:
```javascript
const proof = tree.getProof(["0x0000000000000000000000000000000000000001", "100000000000000000000"]);
```

# FenixRaiseUpgradeable Contract Documentation

## Overview

The `FenixRaiseUpgradeable` contract manages a token raise with both whitelist and public phases. It utilizes Merkle proof verification for whitelist management and ensures various caps and limits are adhered to during the raise.

## Functionality


### Functions

#### deposit

```solidity
function deposit(uint256 amount_, uint256 userCap_, bytes32[] memory proof_) external;
```
Allows users to deposit tokens during the raise.

**Parameters:**
- `uint256 amount_`: The amount of tokens to deposit.
- `uint256 userCap_`: The cap for the user (used for whitelist verification).
- `bytes32[] memory proof_`: The Merkle proof for verifying the user is whitelisted.

**Usage:**
- **Whitelist Phase**: During this phase, users must provide a valid Merkle proof to verify they are whitelisted. The `userCap_` can be specified or defaults to the `whitelistPhaseUserCap` (**when `userCap_` is set to 0**).
- **Public Phase**: During this phase, no Merkle proof is required, and the `userCap_` should be set to `0`. The deposit limit is enforced by the `publicPhaseUserCap`.

#### whithdrawDeposits

```solidity
function whithdrawDeposits() external;
```
Withdraws the deposits after the raise is finished.

**Requirements:**
- Can only be called by the owner.

#### setDepositCaps

```solidity
function setDepositCaps(uint256 totalDepositCap_, uint256 whitelistPhaseUserCap_, uint256 publicPhaseUserCap_) external;
```
Sets the deposit caps.

**Parameters:**
- `uint256 totalDepositCap_`: The total deposit cap.
- `uint256 whitelistPhaseUserCap_`: The user cap for the whitelist phase.
- `uint256 publicPhaseUserCap_`: The user cap for the public phase.

**Requirements:**
- Can only be called by the owner.

#### setWhitelistRoot

```solidity
function setWhitelistRoot(bytes32 root_) external;
```
Sets the whitelist root.

**Parameters:**
- `bytes32 root_`: The new whitelist root.

**Requirements:**
- Can only be called by the owner.

#### setTimestamps

```solidity
function setTimestamps(
    uint256 startWhitelistPhaseTimestamp_,
    uint256 startPublicPhaseTimestamp_,
    uint256 endPublicPhaseTimestamp_
) external;
```
Sets the timestamps for the phases.

**Parameters:**
- `uint256 startWhitelistPhaseTimestamp_`: The timestamp for the start of the whitelist phase.
- `uint256 startPublicPhaseTimestamp_`: The timestamp for the start of the public phase.
- `uint256 endPublicPhaseTimestamp_`: The timestamp for the end of the public phase.

**Requirements:**
- Can only be called by the owner.


## Creating a Merkle Tree with a Whitelist

To create a Merkle Tree for managing a whitelist, follow these steps:

1. **Define the Whitelist**:
   - The whitelist should consist of a list of addresses and their corresponding deposit caps.
   - Each entry in the whitelist is a pair consisting of an address and a uint256 value representing the cap for that address.

2. **Create the Merkle Tree**:
   - Use a library such as `@openzeppelin/merkle-tree` to create the Merkle Tree.
   - The tree is constructed from the list of whitelist entries, where each entry is treated as a leaf node.

3. **Generate the Merkle Root**:
   - Once the tree is constructed, the Merkle root is generated.
   - The Merkle root is a single hash that represents the entire tree and is used for verifying membership in the whitelist.

### Example Code

Here's an example of how to create a Merkle Tree with a whitelist:

```javascript
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

// Define the whitelist entries
const whitelistEntries = [
  [user1.address, ethers.parseEther('1')],
  [user2.address, ethers.parseEther('0.5')],
];

// Create the Merkle Tree
const tree = StandardMerkleTree.of(whitelistEntries, ['address', 'uint256']);

// Set the Merkle root in the contract
await proxy.setWhitelistRoot(tree.root);
```

### Explanation of the Leaf Node

Each leaf node in the Merkle Tree represents a whitelist entry and is composed of two parts:
- **Address**: The address of the user.
- **Cap**: The maximum amount that the user is allowed to deposit during the whitelist phase.

In the above example, the leaf nodes are:
- `[user.address, ethers.parseEther('1')]`: This entry means that `user.address` is allowed to deposit up to 1 ether.
- `[user2.address, ethers.parseEther('0.5')]`: This entry means that `user2.address` is allowed to deposit up to 0.5 ether.
- `[user3.address, 0]`: This entry means that `user2.address` is allowed to deposit up to `whitelistPhaseUserCap` value.

These leaf nodes are hashed and combined to form the Merkle Tree, with the root hash representing the entire whitelist. This root is then stored in the contract and used for verifying if a given address and cap are part of the whitelist during the whitelist phase.


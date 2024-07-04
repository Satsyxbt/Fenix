
# FenixRaiseUpgradeable Contract Documentation

## Overview

The `FenixRaiseUpgradeable` contract manages a token raise with both whitelist and public phases. It utilizes Merkle proof verification for whitelist management and ensures various caps and limits are adhered to during the raise.

## Functionality

### State Variables

```solidity
function token() external view returns (address);
```
- **token**: The address of the token being raised.

```solidity
function depositsReciever() external view returns (address);
```
- **depositsReciever**: The address that will receive the deposits.

```solidity
function whitelistMerklRoot() external view returns (bytes32);
```
- **whitelistMerklRoot**: The Merkle root for the whitelist verification.

```solidity
function startWhitelistPhaseTimestamp() external view returns (uint256);
```
- **startWhitelistPhaseTimestamp**: The timestamp for the start of the whitelist phase.

```solidity
function startPublicPhaseTimestamp() external view returns (uint256);
```
- **startPublicPhaseTimestamp**: The timestamp for the start of the public phase.

```solidity
function endPublicPhaseTimestamp() external view returns (uint256);
```
- **endPublicPhaseTimestamp**: The timestamp for the end of the public phase.

```solidity
function whitelistPhaseUserCap() external view returns (uint256);
```
- **whitelistPhaseUserCap**: The maximum amount a user can deposit during the whitelist phase.

```solidity
function publicPhaseUserCap() external view returns (uint256);
```
- **publicPhaseUserCap**: The maximum amount a user can deposit during the public phase.

```solidity
function totalDepositCap() external view returns (uint256);
```
- **totalDepositCap**: The total cap for deposits.

```solidity
function totalDeposited() external view returns (uint256);
```
- **totalDeposited**: The total amount deposited so far.

```solidity
function userDeposited(address user) external view returns (uint256);
```
- **userDeposited**: The amount each user has deposited, stored in a mapping of addresses to uint256 values.

### Errors

- **IncorrectTimestamps**: Thrown when timestamps are incorrect.
- **OnlyForWhitelistedUser**: Thrown when a non-whitelisted user attempts to deposit during the whitelist phase.
- **DepositClosed**: Thrown when deposits are closed.
- **UserDepositCap**: Thrown when a user attempts to deposit more than the user cap.
- **TotalDepositCap**: Thrown when the total deposit cap is exceeded.
- **RaiseNotFinished**: Thrown when trying to withdraw deposits before the raise is finished.
- **ZeroAmount**: Thrown when a zero amount is involved in a transaction.

### Events

```solidity
event Deposit(address indexed user, uint256 indexed amount);
```
- **Deposit**: Emitted when a deposit is made.
  - `address user`: The address of the user making the deposit.
  - `uint256 amount`: The amount of tokens deposited.

```solidity
event UpdateTimestamps(
    uint256 indexed startWhitelistPhaseTimestamp,
    uint256 indexed startPublicPhaseTimestamp,
    uint256 indexed endPublicPhaseTimestamp
);
```
- **UpdateTimestamps**: Emitted when timestamps are updated.
  - `uint256 startWhitelistPhaseTimestamp`: The new timestamp for the start of the whitelist phase.
  - `uint256 startPublicPhaseTimestamp`: The new timestamp for the start of the public phase.
  - `uint256 endPublicPhaseTimestamp`: The new timestamp for the end of the public phase.

```solidity
event UpdateDepositCaps(uint256 indexed totalDepositCap, uint256 indexed whitelistPhaseUserCap, uint256 indexed publicPhaseUserCap);
```
- **UpdateDepositCaps**: Emitted when deposit caps are updated.
  - `uint256 totalDepositCap`: The new total deposit cap.
  - `uint256 whitelistPhaseUserCap`: The new user cap for the whitelist phase.
  - `uint256 publicPhaseUserCap`: The new user cap for the public phase.

```solidity
event UpdateWhitelistRoot(bytes32 indexed root);
```
- **UpdateWhitelistRoot**: Emitted when the whitelist root is updated.
  - `bytes32 root`: The new whitelist root.

```solidity
event WithdrawDeposits(address indexed caller, address indexed depositsReciever, uint256 indexed amount);
```
- **WithdrawDeposits**: Emitted when deposits are withdrawn.
  - `address caller`: The address of the caller withdrawing the deposits.
  - `address depositsReciever`: The address receiving the deposits.
  - `uint256 amount`: The amount of tokens withdrawn.


### Functions

#### initialize

```solidity
function initialize(address blastGovernor_, address token_, address depositsReciever_) external;
```
Initializes the contract.

**Parameters:**
- `address blastGovernor_`: The address of the BlastGovernor.
- `address token_`: The address of the token being raised.
- `address depositsReciever_`: The address that will receive the deposits.

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

#### isWhitelisted

```solidity
function isWhitelisted(address user_, uint256 userCap_, bytes32[] memory proof_) external view returns (bool);
```
Checks if a user is whitelisted.

**Parameters:**
- `address user_`: The address of the user.
- `uint256 userCap_`: The cap for the user.
- `bytes32[] memory proof_`: The Merkle proof for verifying the user.

**Returns:**
- `bool`: True if the user is whitelisted, false otherwise.

#### isWhitelistPhase

```solidity
function isWhitelistPhase() external view returns (bool);
```
Checks if the whitelist phase is active.

**Returns:**
- `bool`: True if the whitelist phase is active, false otherwise.

#### isPublicPhase

```solidity
function isPublicPhase() external view returns (bool);
```
Checks if the public phase is active.

**Returns:**
- `bool`: True if the public phase is active, false otherwise.


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

## Timeline of the Contract

1. **Initialization**: 
    - The contract is initialized with the addresses of the BlastGovernor, the token being raised, and the deposits receiver.
    - The `initialize` function sets these addresses and prepares the contract for the raise.

2. **Setting Timestamps**: 
    - The owner sets the timestamps for the different phases of the raise using the `setTimestamps` function.
    - These timestamps include:
        - `startWhitelistPhaseTimestamp`: The timestamp for the start of the whitelist phase.
        - `startPublicPhaseTimestamp`: The timestamp for the start of the public phase.
        - `endPublicPhaseTimestamp`: The timestamp for the end of the public phase.
    - Proper ordering and logical sequencing of these timestamps are enforced to ensure smooth transition between phases.

3. **Setting Deposit Caps**: 
    - The owner sets the deposit caps using the `setDepositCaps` function.
    - These caps include:
        - `totalDepositCap`: The total amount of tokens that can be deposited during the entire raise.
        - `whitelistPhaseUserCap`: The maximum amount a single user can deposit during the whitelist phase. (When the user is set to 0 cap in the merkl tree)
        - `publicPhaseUserCap`: The maximum amount a single user can deposit during the public phase.

4. **Setting Whitelist Root**: 
    - The owner sets the Merkle root for the whitelist verification using the `setWhitelistRoot` function.
    - This root is used to verify if users are whitelisted during the whitelist phase.

5. **Whitelist Phase**: 
    - This phase begins at `startWhitelistPhaseTimestamp`.
    - Users can deposit tokens if they provide a valid Merkle proof to verify they are whitelisted.
    - Deposits are subject to the `whitelistPhaseUserCap` and are also limited to reaching `totalDepositCap`.

6. **Public Phase**: 
    - This phase begins at `startPublicPhaseTimestamp` and ends at `endPublicPhaseTimestamp`.
    - Users can deposit tokens without needing a Merkle proof.
    - Deposits are subject to the `publicPhaseUserCap` and are also limited to reaching `totalDepositCap`.

7. **End of Public Phase**: 
    - After `endPublicPhaseTimestamp`, no more deposits are accepted.
    - The owner can now withdraw the total deposited amount using the `whithdrawDeposits` function, transferring the tokens to the designated `depositsReciever` address.

8. **Withdrawals**: 
    - The owner ensures that the public phase has ended and uses the `whithdrawDeposits` function to transfer the total deposited tokens to the deposits receiver.
    - This marks the completion of the token raise process.

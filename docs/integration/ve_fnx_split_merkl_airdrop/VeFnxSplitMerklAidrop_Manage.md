## VeFnxSplitMerklAidrop Manage

### Management Guide

#### Overview
The `VeFnxSplitMerklAidropUpgradeable` contract provides several functions for the owner to manage the contract. These include initializing the contract, pausing and unpausing operations, setting the Merkle root, and adjusting the split percentage.

#### Functions Available During Pause State
- `setMerklRoot(bytes32 merklRoot_)` - Allows the owner to set a new Merkle root.
- `recoverToken(uint256 amount_)` - Allows the owner to recover FNX tokens from the contract.
- `unpause()` -  Allows the owner to unpause the contract.
- `setToVeFnxPercentage(uint256 toVeFnxPercentage_)` - Allows the owner to adjust the split percentage of tokens to be locked as veFNX.
  
#### Functions Available When Not Paused
- `claim(uint256 amount_, bytes32[] memory proof_)` - Allows users to claim their allocated FNX and veFNX tokens.
- `pause()` - Allows the owner to pause the contract.

#### Initialization
The contract must be initialized with the following parameters:

- Address of the Blast Governor contract.
- Address of the FNX token contract.
- Address of the Voting Escrow contract.
- Percentage of tokens to be locked as veFNX.

```solidity
    /**
     * @dev Initializes the contract with the provided parameters.
     * @param blastGovernor_ Address of the Blast Governor contract.
     * @param token_ Address of the FNX token contract.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     * @param toVeFnxPercentage_ Percentage of tokens to be locked as veFNX.
     * @notice This function can only be called once.
     */
    function initialize(
        address blastGovernor_,
        address token_,
        address votingEscrow_,
        uint256 toVeFnxPercentage_
    ) external initializer;
```

#### Pausing and Unpausing
The owner can pause and unpause the contract to control the claim functionality.

To pause the contract:
```solidity
    /**
     * @dev Pauses the contract, preventing any further claims.
     * Can only be called by the owner.
     * @notice Emits a {Paused} event.
     */
    function pause() external;
```

To unpause the contract:
```solidity
    /**
     * @dev Unpauses the contract, allowing claims to be made.
     * Can only be called by the owner.
     * @notice Emits an {Unpaused} event.
     */

    function unpause() external;
```

#### Setting the Merkle Root
The Merkle root can be updated by the owner when the contract is paused.
```solidity
    /**
     * @dev Sets the Merkle root for verifying claims.
     * Can only be called by the owner when the contract is paused.
     * @param merklRoot_ The new Merkle root.
     * @notice Emits a {SetMerklRoot} event.
     */
    function setMerklRoot(bytes32 merklRoot_) external;
```
- **Parameters:**
  - `merklRoot_`: The new Merkle root.

This function will emit a `SetMerklRoot` event upon successful update.

#### Adjusting the Split Percentage
The percentage of tokens to be locked as veFNX can be updated by the owner.
```
function setToVeFnxPercentage(uint256 toVeFnxPercentage_) external
```
- **Parameters:**
  - `toVeFnxPercentage_`: The new percentage.

This function will emit a `SetToVeFnxPercentage` event upon successful update.

#### Recovering FNX Tokens
The owner can recover `FNX` tokens from the contract.

```solidity
function recoverToken(uint256 amount_) external onlyOwner whenPaused;

```
- **Parameters:**
  - `amount_`: The amount of FNX tokens to be recovered.

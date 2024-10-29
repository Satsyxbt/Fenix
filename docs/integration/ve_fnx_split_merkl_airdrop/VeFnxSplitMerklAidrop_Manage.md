## VeFnxSplitMerklAidropUpgradeable Manage

### Management Guide

#### Overview
The `VeFnxSplitMerklAidropUpgradeable` contract provides several functions for the owner to manage the contract. These include initializing the contract, pausing and unpausing operations, setting the Merkle root, and adjusting the pure tokens rate.

#### Functions Available During Pause State
- `setMerklRoot(bytes32 merklRoot_)` - Allows the owner to set a new Merkle root.
- `recoverToken(uint256 amount_)` - Allows the owner to recover tokens from the contract.
- `unpause()` -  Allows the owner to unpause the contract.
- `setPureTokensRate(uint256 pureTokensRate_)` - Allows the owner to adjust the rate for pure tokens.
- `pause()` - Allows the owner to pause the contract.

#### Functions Available When Not Paused
- `claim(bool inPureTokens_, uint256 amount_, bytes32[] memory proof_)` - Allows users to claim their allocated tokens, either as pure tokens or as veNFT tokens.
- `claimFor(address target_, bool inPureTokens_, uint256 amount_, bytes32[] memory proof_)` - Allows claim operators to claim tokens on behalf of a target address.

#### Initialization
The contract must be initialized with the following parameters:

- Address of the Blast Governor contract.
- Address of the token contract.
- Address of the Voting Escrow contract.
- Rate for pure tokens.

```solidity
    /**
     * @dev Initializes the contract with the provided parameters.
     * @param blastGovernor_ Address of the Blast Governor contract.
     * @param token_ Address of the token contract.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     * @param pureTokensRate_ Rate for pure tokens.
     * @notice This function can only be called once.
     */
    function initialize(
        address blastGovernor_,
        address token_,
        address votingEscrow_,
        uint256 pureTokensRate_
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

#### Adjusting the Pure Tokens Rate
The rate for pure tokens can be updated by the owner.
```solidity
    /**
     * @dev Sets the pure tokens rate.
     * Can only be called by the owner when the contract is paused.
     * @param pureTokensRate_ The new pure tokens rate.
     * @notice Emits a {SetPureTokensRate} event.
     */
    function setPureTokensRate(uint256 pureTokensRate_) external;
```
- **Parameters:**
  - `pureTokensRate_`: The new rate for pure tokens.

This function will emit a `SetPureTokensRate` event upon successful update.

#### Setting Claim Operators
The owner can set whether an address is allowed to operate claims on behalf of others.
```solidity
    /**
     * @dev Sets whether an address is allowed to operate claims on behalf of others.
     * Can only be called by the owner.
     * @param operator_ The address of the operator to set.
     * @param isAllowed_ A boolean indicating whether the operator is allowed.
     * @notice Emits a {SetIsAllowedClaimOperator} event.
     */
    function setIsAllowedClaimOperator(address operator_, bool isAllowed_) external;
```
- **Parameters:**
  - `operator_`: The address of the claim operator.
  - `isAllowed_`: A boolean indicating whether the operator is allowed.

This function will emit a `SetIsAllowedClaimOperator` event upon successful update.

#### Recovering Tokens
The owner can recover tokens from the contract.

```solidity
    /**
     * @notice Allows the owner to recover token from the contract.
     * @param amount_ The amount of tokens to be recovered.
     * Transfers the specified amount of tokens to the owner's address.
     */
    function recoverToken(uint256 amount_) external onlyOwner whenPaused;
```
- **Parameters:**
  - `amount_`: The amount of tokens to be recovered.



# FenixRaise View Functions

## General Information and Settings

### token
```solidity
/**
 * @notice Returns the address of the token being raised
 * @return The address of the token
 */
function token() external view returns (address);
```
- **Description:** Returns the address of the token being raised.
- **Returns:** The address of the token.

### rewardToken
```solidity
/**
 * @notice Returns the address of the reward token
 * @return The address of the reward token
 */
function rewardToken() external view returns (address);
```
- **Description:** Returns the address of the reward token.
- **Returns:** The address of the reward token.

### amountOfRewardTokenPerDepositToken
```solidity
/**
 * @notice Returns the amount of reward tokens per deposit token
 * @return The amount of reward tokens per deposit token
 */
function amountOfRewardTokenPerDepositToken() external view returns (uint256);
```
- **Description:** Returns the amount of reward tokens per deposit token.
- **Returns:** The amount of reward tokens per deposit token.

### toVeNftPercentage
```solidity
/**
 * @notice Returns percentage of the claimed amount to be locked as veNFT
 * @return Percentage of the claimed amount to be locked as veNFT
 */
function toVeNftPercentage() external view returns (uint256);
```
- **Description:** Returns the percentage of the claimed amount to be locked as veNFT.
- **Returns:** Percentage of the claimed amount to be locked as veNFT.

### votingEscrow
```solidity
/**
 * @notice Returns the address of the voting escrow
 * @return The address of the voting escrow
 */
function votingEscrow() external view returns (address);
```
- **Description:** Returns the address of the voting escrow.
- **Returns:** The address of the voting escrow.

### depositsReciever
```solidity
/**
 * @notice Returns the address that will receive the deposits
 * @return The address of the deposits receiver
 */
function depositsReciever() external view returns (address);
```
- **Description:** Returns the address that will receive the deposits.
- **Returns:** The address of the deposits receiver.

### whitelistMerklRoot
```solidity
/**
 * @notice Returns the Merkle root for the whitelist verification
 * @return The Merkle root
 */
function whitelistMerklRoot() external view returns (bytes32);
```
- **Description:** Returns the Merkle root for the whitelist verification.
- **Returns:** The Merkle root.

## Time Periods

### startWhitelistPhaseTimestamp
```solidity
/**
 * @notice Returns the timestamp for the start of the whitelist phase
 * @return The timestamp for the start of the whitelist phase
 */
function startWhitelistPhaseTimestamp() external view returns (uint256);
```
- **Description:** Returns the timestamp for the start of the whitelist phase.
- **Returns:** The timestamp for the start of the whitelist phase.

### startPublicPhaseTimestamp
```solidity
/**
 * @notice Returns the timestamp for the start of the public phase
 * @return The timestamp for the start of the public phase
 */
function startPublicPhaseTimestamp() external view returns (uint256);
```
- **Description:** Returns the timestamp for the start of the public phase.
- **Returns:** The timestamp for the start of the public phase.

### endPublicPhaseTimestamp
```solidity
/**
 * @notice Returns the timestamp for the end of the public phase
 * @return The timestamp for the end of the public phase
 */
function endPublicPhaseTimestamp() external view returns (uint256);
```
- **Description:** Returns the timestamp for the end of the public phase.
- **Returns:** The timestamp for the end of the public phase.

### startClaimPhaseTimestamp
```solidity
/**
 * @notice Returns the timestamp for the start of the claim phase
 * @return The timestamp for the start of the claim phase
 */
function startClaimPhaseTimestamp() external view returns (uint256);
```
- **Description:** Returns the timestamp for the start of the claim phase.
- **Returns:** The timestamp for the start of the claim phase.

## Limits

### whitelistPhaseUserCap
```solidity
/**
 * @notice Returns the maximum amount a user can deposit during the whitelist phase
 * @return The user cap for the whitelist phase
 */
function whitelistPhaseUserCap() external view returns (uint256);
```
- **Description:** Returns the maximum amount a user can deposit during the whitelist phase.
- **Returns:** The user cap for the whitelist phase.

### publicPhaseUserCap
```solidity
/**
 * @notice Returns the maximum amount a user can deposit during the public phase
 * @return The user cap for the public phase
 */
function publicPhaseUserCap() external view returns (uint256);
```
- **Description:** Returns the maximum amount a user can deposit during the public phase.
- **Returns:** The user cap for the public phase.

### totalDepositCap
```solidity
/**
 * @notice Returns the total cap for deposits
 * @return The total deposit cap
 */
function totalDepositCap() external view returns (uint256);
```
- **Description:** Returns the total cap for deposits.
- **Returns:** The total deposit cap.

### totalDeposited
```solidity
/**
 * @notice Returns the total amount deposited so far
 * @return The total amount deposited
 */
function totalDeposited() external view returns (uint256);
```
- **Description:** Returns the total amount deposited so far.
- **Returns:** The total amount deposited.

### totalClaimed
```solidity
/**
 * @notice Returns the total amount claimed so far
 * @return The total amount claimed
 */
function totalClaimed() external view returns (uint256);
```
- **Description:** Returns the total amount claimed so far.
- **Returns:** The total amount claimed.

## User Information

### userDeposited
```solidity
/**
 * @notice Returns the amount a specific user has deposited
 * @param user_ The address of the user
 * @return The amount deposited by the user
 */
function userDeposited(address user_) external view returns (uint256);
```
- **Description:** Returns the amount a specific user has deposited.
- **Parameters:**
  - `user_`: The address of the user.
- **Returns:** The amount deposited by the user.

### userDepositsWhitelistPhase
```solidity
/**
 * @notice Returns the amount a specific user has deposited during whitelist phase
 * @param user_ The address of the user
 * @return The amount deposited by the user during the whitelist phase
 */
function userDepositsWhitelistPhase(address user_) external view returns (uint256);
```
- **Description:** Returns the amount a specific user has deposited during the whitelist phase.
- **Parameters:**
  - `user_`: The address of the user.
- **Returns:** The amount deposited by the user during the whitelist phase.

### isUserClaimed
```solidity
/**
 * @notice Returns whether a user has claimed their tokens
 * @param user_ The address of the user
 * @return True if the user has claimed their tokens, false otherwise
 */
function isUserClaimed(address user_) external view returns (bool);
```
- **Description:** Returns whether a user has claimed their tokens.
- **Parameters:**
  - `user_`: The address of the user.
- **Returns:** `True` if the user has claimed their tokens, `false` otherwise.

## Phase Checks

### isWhitelistPhase
```solidity
/**
 * @notice Checks if the whitelist phase is active
 * @return True if the whitelist phase is active, false otherwise
 */
function isWhitelistPhase() external view returns (bool);
```
- **Description:** Checks if the whitelist phase is active.
- **Returns:** `True` if the whitelist phase is active, `false` otherwise.

### isPublicPhase
```solidity
/**
 * @notice Checks if the public phase is active
 * @return True if the public phase is active, false otherwise
 */
function isPublicPhase() external view returns (bool);
```
- **Description:** Checks if the public phase is active.
- **Returns:** `True` if the public phase is active, `false` otherwise.

### isClaimPhase
```solidity
/**
 * @notice Checks if the claim phase is active
 * @return True if the claim phase is active, false otherwise
 */
function isClaimPhase() external view returns (bool);
```
- **Description:** Checks if the claim phase is active.
- **Returns:** `True` if the claim phase is active, `false` otherwise.

## Rewards Information

### getRewardsAmountOut
```solidity
/**
 * @notice Gets the reward amounts out based on the deposit amount
 * @param depositAmount_ The amount of tokens deposited
 * @return toRewardTokenAmount The amount of reward tokens
 * @return toVeNftAmount The amount to veNFT token
 */
function getRewardsAmountOut(uint256 depositAmount_) external view returns (uint256 toRewardTokenAmount, uint256 toVeNftAmount);
```
- **Description:** Gets the reward amounts based on the deposit amount.
- **Parameters:**
  - `depositAmount_`: The amount of tokens deposited.
- **Returns:** 
  - `toRewardTokenAmount`: The amount of reward tokens.
  - `toVeNftAmount`: The amount to veNFT token.

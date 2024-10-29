
# MinimalLinearVestingUpgradeable - Contract Management

The **MinimalLinearVestingUpgradeable** contract manages linear token vesting with the ability to set allocations, configure vesting parameters, and manage token claims. This document describes the main management functions of the contract, how to configure it, and how to set allocations between users.

## Contract Initialization

The `initialize()` function is used for the initial setup of the contract. This function is called once, and it initializes key parameters like the token address, start timestamp, and vesting duration.

### Function Definition

```solidity
/**
 * @notice Initializes the vesting contract.
 * @dev This function can only be called once, during the initialization phase.
 * @param blastGovernor_ The address of the Blast Governor contract.
 * @param token_ The address of the token to be vested.
 * @param startTimestamp_ The timestamp when vesting starts.
 * @param duration_ The duration of the vesting period in seconds.
 */
function initialize(address blastGovernor_, address token_, uint256 startTimestamp_, uint256 duration_) external initializer;
```

### Usage

- `blastGovernor_`: Address of the Blast Governor contract responsible for governance.
- `token_`: The address of the ERC20 token being vested.
- `startTimestamp_`: The UNIX timestamp for when vesting starts.
- `duration_`: Vesting duration in seconds.

This function is called once when the contract is deployed and cannot be re-initialized.

## Setting Wallet Allocations

The `setWalletsAllocation()` function allows the contract owner to set or update token allocations for multiple wallets. Allocations can only be modified before the vesting period starts.

### Function Definition

```solidity
/**
 * @notice Sets the token allocation for multiple wallets.
 * @dev Can only be called by the owner and before the vesting has started.
 * Reverts with `NotAvailableDuringClaimPhase` if vesting has started.
 * Reverts with `ArrayLengthMismatch` if the lengths of `wallets_` and `amounts_` do not match or if they are empty.
 * The total allocated amount is adjusted based on the changes in the wallet allocations.
 * If the current balance exceeds the new allocation, the excess tokens are transferred to the owner.
 * If the current balance is less than the new allocation, the owner must transfer the difference to the contract.
 * @param wallets_ The array of wallet addresses.
 * @param amounts_ The array of token amounts allocated to each wallet.
 */
function setWalletsAllocation(address[] calldata wallets_, uint256[] calldata amounts_) external onlyOwner onlyNotDuringClaimPhase;
```

### Usage

- `wallets_`: An array of wallet addresses to receive allocations.
- `amounts_`: An array of amounts corresponding to each wallet.

**This function can only be called by the owner and only before the vesting has started. If the wallet allocation changes result in a difference between the contract's current balance and the total allocated amount, the contract will either return excess tokens to the owner or request additional tokens.**
### Example

```solidity
address[] memory wallets = new address[](2);
wallets[0] = 0x123...; // User 1 address
wallets[1] = 0x456...; // User 2 address

uint256[] memory amounts = new uint256[](2);
amounts[0] = 1000 * 1e18; // 1000 tokens for User 1
amounts[1] = 2000 * 1e18; // 2000 tokens for User 2

vestingContract.setWalletsAllocation(wallets, amounts);
```

## Updating Vesting Parameters

The `setVestingParams()` function allows the contract owner to update the start timestamp and duration of the vesting period.

### Function Definition

```solidity
/**
 * @notice Updates the vesting parameters such as the start timestamp and duration.
 * @dev Can only be called by the owner and before the vesting period starts.
 * @param startTimestamp_ The new vesting start timestamp.
 * @param duration_ The new duration of the vesting in seconds.
 */
function setVestingParams(uint256 startTimestamp_, uint256 duration_) external onlyOwner onlyNotDuringClaimPhase;
```

### Usage

- `startTimestamp_`: The new start timestamp for the vesting period.
- `duration_`: The new duration for vesting, in seconds.

**This function can only be used before the vesting phase begins. Once the vesting has started, it cannot be modified.**
## Claiming Tokens

The `claim()` function allows users to claim their vested tokens. The claim is based on the time that has passed since the vesting started and the total allocated amount for the user.

### Function Definition

```solidity
/**
 * @notice Allows users to claim their vested tokens.
 * @dev Reverts with `ClaimPhaseNotStarted` if the vesting period has not started yet.
 * Reverts with `ZeroClaimAmount` if there are no tokens available for claim.
 */
function claim() external;
```

### Usage

Users can call this function to claim tokens as they become vested. The function calculates the available claimable tokens based on the vesting schedule and releases them to the user's wallet.
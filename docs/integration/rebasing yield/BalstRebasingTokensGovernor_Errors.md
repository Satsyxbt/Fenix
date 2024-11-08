# BlastRebasingTokensGovernor Errors

## Overview
This document provides a detailed description of the errors defined in the `BlastRebasingTokensGovernor` contract. These errors are used to handle various failure conditions and ensure that the contract operates correctly within its constraints.

## Error Details

### 1. `AlreadyRegistered`
- **Description**: Thrown when an attempt is made to register a token holder that is already registered.
- **When Thrown**: This error is thrown by the `addTokenHolder` function if the specified token holder is already registered in the system.

### 2. `NotRegisteredBefore`
- **Description**: Thrown when an operation is attempted on a token holder that has not been registered.
- **When Thrown**: This error is thrown if an operation requires a token holder to be previously registered, but the holder is not found in the records.

### 3. `InvalidAddressKey`
- **Description**: Thrown when an invalid key is provided to update a contract address.
- **When Thrown**: This error is thrown by the `updateAddress` function if the given key does not match any valid contract keys in the system.

### 4. `InvalidSwapSourceToken`
- **Description**: Thrown when an attempt is made to swap a token into itself.
- **When Thrown**: This error is thrown by the `directV3Swap` function when the source token is the same as the target token.

### 5. `AddressNotSetupForSupportSwap`
- **Description**: Thrown when the swap router or swap target token is not properly set up.
- **When Thrown**: This error is thrown by the `directV3Swap` function if the address for the swap router or target token is missing or not properly configured.

### 6. `ZeroTokensToClaim`
- **Description**: Thrown when an attempt is made to claim zero tokens.
- **When Thrown**: This error is thrown by the `withdraw` function when there are no tokens available to be withdrawn.

### 7. `InvalidPercentageSum`
- **Description**: Thrown when the sum of the yield distribution percentages does not equal 100% (represented as `1e18`).
- **When Thrown**: This error is thrown by the `setYieldDistributionDirectionsPercentage` function if the total percentage allocation across yield directions does not add up to `1e18`.

### 8. `AmountMoreThenAvailabelToSwapByThisDirection`
- **Description**: Thrown when the requested swap amount exceeds the available amount for the specified yield distribution direction.
- **When Thrown**: This error is thrown by the `directV3Swap` function if the requested swap amount is greater than the available balance for the given yield direction.

### 9. `InsufficientAvailableAmountToWithdraw`
- **Description**: Thrown when the requested withdrawal amount exceeds the available balance.
- **When Thrown**: This error is thrown by the `withdraw` function when the amount to be withdrawn is greater than the available balance in the specified yield distribution direction.

### 10. `SwapNotAvailableForDirection`
- **Description**: Thrown when an attempt is made to perform a swap for a yield direction that is not configured to allow swaps.
- **When Thrown**: This error is thrown by the `directV3Swap` function if the specified yield distribution direction is not available for swapping to target tokens.

### 11. `AddressZero`
- **Description**: Thrown when a zero address is provided where a valid address is required.
- **When Thrown**: This error is thrown by various functions that require a non-zero address as an input, ensuring the contract interacts with valid addresses only.

## Conclusion
The errors in `BlastRebasingTokensGovernor` serve as safeguards against invalid operations, helping to maintain the integrity of the contract and protect against incorrect usage. Understanding these errors is essential for proper debugging, integration, and ensuring that interactions with the contract are performed under valid conditions.


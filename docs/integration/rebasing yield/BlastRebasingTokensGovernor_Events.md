# BlastRebasingTokensGovernor Events

## Overview
This document describes the events emitted by the `BlastRebasingTokensGovernor` contract in detail, including their purpose, the conditions under which they are emitted, and the parameters involved.

## Event Details

### 1. `AddRebasingTokenHolder`
- **Signature**: `event AddRebasingTokenHolder(address indexed token, address indexed contractAddress);`
- **Description**: Emitted when a new rebasing token holder is added to the system.
- **Parameters**:
  - `token (address)`: The address of the rebasing token for which the holder is added.
  - `contractAddress (address)`: The address of the contract that is registered as a holder for the specified token.
- **When Emitted**: This event is emitted when the `addTokenHolder` function is called successfully, registering a new contract address as a rebasing token holder.

### 2. `Claim`
- **Signature**: `event Claim(address indexed caller, address indexed token, uint256 indexed totalClaimedAmount, uint256 toOthersYieldDirectionDistributed, uint256 toIncentivesYieldDirectionDistributed, uint256 toRiseYieldDirectionDistributed, uint256 toBribesYieldDirectionDistributed);`
- **Description**: Emitted when tokens are claimed from a rebasing token holders and distributed(accounted) across different yield directions.
- **Parameters**:
  - `caller (address)`: The address that initiated the claim.
  - `token (address)`: The address of the token being claimed.
  - `totalClaimedAmount (uint256)`: The total amount of tokens that have been claimed.
  - `toOthersYieldDirectionDistributed (uint256)`: The amount distributed to the 'Others' yield direction.
  - `toIncentivesYieldDirectionDistributed (uint256)`: The amount distributed to the 'Incentives' yield direction.
  - `toRiseYieldDirectionDistributed (uint256)`: The amount distributed to the 'Rise' yield direction.
  - `toBribesYieldDirectionDistributed (uint256)`: The amount distributed to the 'Bribes' yield direction.
- **When Emitted**: This event is emitted after a successful token claim operation, when the claimed tokens are distributed among different yield directions.

### 3. `UpdateYieldDistributionPercentage`
- **Signature**: `event UpdateYieldDistributionPercentage(uint256 toOthersPercentage, uint256 indexed toIncentivesPercentage, uint256 indexed toRisePercentage, uint256 indexed toBribesPercentage);`
- **Description**: Emitted when the percentage allocation for each yield distribution direction is updated.
- **Parameters**:
  - `toOthersPercentage (uint256)`: The percentage allocated to the 'Others' yield direction.
  - `toIncentivesPercentage (uint256)`: The percentage allocated to the 'Incentives' yield direction.
  - `toRisePercentage (uint256)`: The percentage allocated to the 'Rise' yield direction.
  - `toBribesPercentage (uint256)`: The percentage allocated to the 'Bribes' yield direction.
- **When Emitted**: This event is emitted when the `setYieldDistributionDirectionsPercentage` function is called to modify the allocation percentages for different yield directions.

### 4. `UpdateDirectionAvailableToSwapToTargetToken`
- **Signature**: `event UpdateDirectionAvailableToSwapToTargetToken(YieldDistributionDirection direction, bool isAvailableToSwapToTargetTokens);`
- **Description**: Emitted when the availability of swapping to the target token is updated for a specific yield direction.
- **Parameters**:
  - `direction (YieldDistributionDirection)`: The yield distribution direction for which the availability is being updated.
  - `isAvailableToSwapToTargetTokens (bool)`: Indicates whether swapping to target tokens is allowed for this direction.
- **When Emitted**: This event is emitted when the `setDirectionAvailableToSwapToTargetToken` function is called, modifying whether a specific yield direction can be swapped to the target token.

### 5. `UpdateAddress`
- **Signature**: `event UpdateAddress(string key, address indexed value);`
- **Description**: Emitted when the address for a specified contract is updated.
- **Parameters**:
  - `key (string)`: A string key representing the contract whose address is being updated.
  - `value (address)`: The new address associated with the given key.
- **When Emitted**: This event is emitted when the `updateAddress` function is called, updating the address of a specific contract component within the system.

### 6. `Withdraw`
- **Signature**: `event Withdraw(address caller, address indexed recipient, YieldDistributionDirection indexed direction, address indexed token, uint256 amount);`
- **Description**: Emitted when tokens are withdrawn by an authorized address.
- **Parameters**:
  - `caller (address)`: The address that initiated the withdrawal.
  - `recipient (address)`: The address that receives the withdrawn tokens.
  - `direction (YieldDistributionDirection)`: The yield distribution direction from which the tokens are withdrawn.
  - `token (address)`: The address of the token being withdrawn.
  - `amount (uint256)`: The amount of tokens withdrawn.
- **When Emitted**: This event is emitted when the `withdraw` function is called to withdraw tokens from a specific yield direction.

### 7. `DirectV3Swap`
- **Signature**: `event DirectV3Swap(address indexed caller, YieldDistributionDirection indexed direction, address indexed tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);`
- **Description**: Emitted when a direct swap of tokens is performed using the V3 router.
- **Parameters**:
  - `caller (address)`: The address that initiated the swap.
  - `direction (YieldDistributionDirection)`: The yield distribution direction for which the swap is performed.
  - `tokenIn (address)`: The address of the input token being swapped.
  - `tokenOut (address)`: The address of the output token received from the swap.
  - `amountIn (uint256)`: The amount of input tokens provided for the swap.
  - `amountOut (uint256)`: The amount of output tokens received from the swap.
- **When Emitted**: This event is emitted when the `directV3Swap` function is successfully executed, indicating that a token swap has taken place.

## Conclusion
The events in `BlastRebasingTokensGovernor` play a crucial role in tracking the actions taken within the system, such as adding token holders, claiming and distributing yields, updating configuration parameters, and performing token swaps. Each event provides essential information that helps monitor and verify the correct functioning of the contract. Understanding these events is fundamental for integrating with and debugging the contract effectively.


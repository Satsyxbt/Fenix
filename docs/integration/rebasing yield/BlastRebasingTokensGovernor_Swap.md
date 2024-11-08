# BlastRebasingTokensGovernor Swap Process

## Overview
This document provides a detailed description of the swap process in the `BlastRebasingTokensGovernor` contract. The swap functionality allows users to swap tokens directly using a Uniswap V3 router. Before initiating a swap, users must ensure that the yield distribution direction allows swapping and that there are enough tokens available for the swap.

## Checking Swap Availability
Before performing a swap, it is important to verify if swapping is allowed for the specific yield distribution direction and to determine how much is available for swapping.

###  Getting Yield Direction Information
- **Function**: `getYieldDirectionsInfo`
  - This function allows users to get detailed information for each yield direction, including the available balance and swap availability.
  - **Parameters**:
    - `tokens_ (address[])`: List of token addresses to get yield information for.
  - **Return Value**: Returns an array of `YieldDistributionDiresctionsInfoView` containing the yield distribution information for each direction.
  - **Usage**: Use this function to determine if a yield direction has enough tokens available for swapping and whether swapping is permitted.

## Swap Method

### 1. `directV3Swap`
- **Signature**: `function directV3Swap(YieldDistributionDirection yieldDirectionType_, address token_, uint256 amount_, uint256 minAmountOut_, uint160 limitSqrtPrice_, uint256 deadline_) external;`
- **Description**: This function allows for a direct swap of tokens using the Uniswap V3 router.
- **Parameters**:
  - `yieldDirectionType_ (YieldDistributionDirection)`: The yield direction for which the swap is being performed.
  - `token_ (address)`: The address of the token being swapped.
  - `amount_ (uint256)`: The amount of tokens to be swapped.
  - `minAmountOut_ (uint256)`: The minimum amount of target tokens expected to receive.
  - `limitSqrtPrice_ (uint160)`: The limit on the sqrt price during the swap.
  - `deadline_ (uint256)`: The deadline by which the swap must be completed.
- **How to Call**:
  1. Ensure you have the `TOKEN_SWAPER_ROLE` to perform the swap.
  2. Verify that the specified yield direction allows swapping by calling `getYieldDirectionsInfo`.
  3. Call the `directV3Swap` function with the appropriate parameters, such as the token to be swapped and the amount.

## Example Usage
To perform a token swap, follow these steps:

1. **Preparation**: Ensure you have the necessary role (`TOKEN_SWAPER_ROLE`) to initiate the swap.
2. **Check Swap Availability**: Call `getYieldDirectionsInfo` to verify that the yield direction allows swapping and determine the available balance.
3. **Call the Function**: For example, if you want to swap 100 tokens of `0xTokenAddress` from the `Incentives` direction, you would call:
   ```solidity
   blastRebasingTokensGovernor.directV3Swap(
       YieldDistributionDirection.Incentives,
       0xTokenAddress,
       100,
       90,    // Minimum amount out
       0,     // No specific price limit
       block.timestamp + 3600 // Deadline in one hour
   );
   ```

## Access Control
- Only addresses with the `TOKEN_SWAPER_ROLE` can initiate a swap.
- The `directV3Swap` function is guarded to ensure that unauthorized addresses cannot perform swaps.

## Important Considerations
- **Swap Availability**: Always check if swapping is allowed for the specific yield direction before attempting to swap tokens.
- **Sufficient Balance**: Make sure that the yield direction has enough tokens available for swapping, as insufficient balances will lead to a failed transaction.
- **Target and Source Token**: The source token must be different from the target token. If the source and target tokens are the same, the function will revert with an `InvalidSwapSourceToken` error.
- **Router and Token Configuration**: Ensure that the swap router and target token addresses are properly set up before initiating a swap, or the function will revert with an `AddressNotSetupForSupportSwap` error.

## Conclusion
The `BlastRebasingTokensGovernor` contract provides a robust system for swapping tokens directly using Uniswap V3. By ensuring proper setup, verifying swap availability, and using the correct parameters, users can effectively initiate token swaps within the Blast ecosystem.


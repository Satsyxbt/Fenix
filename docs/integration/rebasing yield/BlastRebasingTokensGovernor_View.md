# BlastRebasingTokensGovernor View Functions

## Overview
This document provides a detailed description of the view functions available in the `BlastRebasingTokensGovernor` contract. These functions are used to retrieve information about yield distribution, available amounts for withdrawal or claim, token holder details, and other relevant data. Understanding how to use these functions helps users monitor and interact with the contract effectively.

## View Functions

### 1. `getYieldDirectionTokenInfo`
- **Signature**: `function getYieldDirectionTokenInfo(YieldDistributionDirection direction_, address token_) external view returns (TokenAccountingInfo memory);`
- **Description**: Provides detailed information about the yield distribution for a specific token and direction.
- **Parameters**:
  - `direction_ (YieldDistributionDirection)`: The yield distribution direction for which information is being retrieved.
  - `token_ (address)`: The address of the token.
- **Return Value**:
  - `TokenAccountingInfo`: A struct containing:
    - `totalAccumulated (uint256)`: The total accumulated amount of the token for this yield direction.
    - `available (uint256)`: The available amount of the token for distribution or withdrawal.
- **Usage**: Use this function to determine the total and available balance of a specific token within a yield distribution direction. This is particularly useful before initiating a withdrawal or claim to ensure sufficient tokens are available.

### 2. `getYieldDirectionsInfo`
- **Signature**: `function getYieldDirectionsInfo(address[] calldata tokens_) external view returns (YieldDistributionDiresctionsInfoView[] memory array);`
- **Description**: Provides information about yield distribution for multiple directions and tokens.
- **Parameters**:
  - `tokens_ (address[])`: An array of token addresses for which to get yield information.
- **Return Value**:
  - `YieldDistributionDiresctionsInfoView[]`: An array of structs, each containing:
    - `direction (YieldDistributionDirection)`: The yield distribution direction.
    - `distributionPercentage (uint256)`: The percentage allocated to this direction.
    - `isAvailableToSwapToTargetTokens (bool)`: Indicates if swapping to target tokens is available for this direction.
    - `tokensInfo (TokenAccountingInfoView[])`: An array of accounting information for each token in the given direction.
- **Usage**: This function is used to get a comprehensive view of yield distribution information for multiple tokens and yield directions, including the available amounts for swapping and distribution settings.

### 3. `readClaimableAmounts`
- **Signature**: `function readClaimableAmounts(address token_, uint256 offset_, uint256 limit_) external view returns (ClaimableAmountsResult[] memory tokenHoldersClamableAmounts);`
- **Description**: Provides information about the claimable amounts within the specified range of token holders.
- **Parameters**:
  - `token_ (address)`: The address of the token.
  - `offset_ (uint256)`: The offset to start from.
  - `limit_ (uint256)`: The maximum number of token holders to process.
- **Return Value**:
  - `ClaimableAmountsResult[]`: An array of structs, each containing:
    - `contractAddress (address)`: The address of the token holder contract.
    - `claimableAmount (uint256)`: The amount of tokens that can be claimed.
    - `mode (YieldMode)`: The current yield mode of the token.
- **Usage**: Use this function to determine the claimable amounts of tokens for a given range of token holders. This information is useful before executing claims to ensure that there are sufficient tokens available.

### 4. `readClaimableAmountsFromSpecifiedTokenHolders`
- **Signature**: `function readClaimableAmountsFromSpecifiedTokenHolders(address token_, address[] memory holders_) external view returns (ClaimableAmountsResult[] memory tokenHoldersClamableAmounts);`
- **Description**: Provides information about the claimable amounts from a specific set of token holders.
- **Parameters**:
  - `token_ (address)`: The address of the token.
  - `holders_ (address[])`: An array of addresses representing the token holders.
- **Return Value**:
  - `ClaimableAmountsResult[]`: An array of structs containing claimable information for each specified holder.
- **Usage**: This function is used when you need to determine the claimable amounts for specific token holders, rather than a range. This allows for targeted claims.

### 5. `isRegisteredTokenHolder`
- **Signature**: `function isRegisteredTokenHolder(address token_, address contractAddress_) external view returns (bool isRegistered);`
- **Description**: Checks if a specific contract address is a registered token holder.
- **Parameters**:
  - `token_ (address)`: The address of the token.
  - `contractAddress_ (address)`: The address of the contract.
- **Return Value**:
  - `isRegistered (bool)`: Returns `true` if the contract is a registered token holder, otherwise returns `false`.
- **Usage**: This function helps determine if a given contract is already registered as a token holder, which is useful before attempting to add new holders.

### 6. `swapInfo`
- **Signature**: `function swapInfo() external view returns (address targetToken, address swapRouter);`
- **Description**: Provides information about the current swap settings.
- **Return Value**:
  - `targetToken (address)`: The address of the target token for swaps.
  - `swapRouter (address)`: The address of the swap router.
- **Usage**: Use this function to get the details of the target token and swap router. This is necessary before initiating swaps to ensure the addresses are properly configured.

### 7. `listRebasingTokenHolders`
- **Signature**: `function listRebasingTokenHolders(address token_, uint256 offset_, uint256 limit_) external view returns (address[] memory tokenHolders);`
- **Description**: Lists rebasing token holders within the specified range.
- **Parameters**:
  - `token_ (address)`: The address of the token.
  - `offset_ (uint256)`: The offset to start from.
  - `limit_ (uint256)`: The maximum number of token holders to process.
- **Return Value**:
  - `tokenHolders (address[])`: An array of addresses representing the token holders.
- **Usage**: Use this function to get a list of all token holders for a given token, which is useful for processing claims, withdrawals, or simply monitoring the token holders.

## Example Usage
1. **Check Available Amount to Claim**:
   To check how much of a specific token can be claimed by a set of token holders, call:
   ```solidity
   ClaimableAmountsResult[] memory claimableInfo = blastRebasingTokensGovernor.readClaimableAmounts(
       0xTokenAddress,
       0,    // Start from the first holder
       50    // Check for the first 50 holders
   );
   ```

2. **Get Yield Direction Information**:
   To get detailed yield information for multiple tokens:
   ```solidity
   YieldDistributionDiresctionsInfoView[] memory yieldInfo = blastRebasingTokensGovernor.getYieldDirectionsInfo(
       [0xTokenAddress1, 0xTokenAddress2]
   );
   ```

3. **Check if an Address is Registered**:
   To verify if an address is a registered token holder:
   ```solidity
   bool isHolder = blastRebasingTokensGovernor.isRegisteredTokenHolder(
       0xTokenAddress,
       0xContractAddress
   );
   ```

## Conclusion
The `BlastRebasingTokensGovernor` contract provides various view functions that allow users to retrieve detailed information about token holders, yield distributions, claimable amounts, and swap settings. These functions are essential for effective interaction with the contract, enabling users to monitor balances, check registration statuses, and plan claims or swaps effectively.
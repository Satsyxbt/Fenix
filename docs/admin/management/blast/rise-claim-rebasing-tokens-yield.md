## Blast Rebasing Tokens Yield Claim Guide

This document explains how to interact with the `BlastRebasingTokensGovernorUpgradeable` contract to claim yield from rebasing tokens, specifically for WETH and USDB tokens. This contract automatically registers holders of these tokens (e.g., system contracts like pairs and pools) and provides mechanisms to claim the yield.

### Overview

The `BlastRebasingTokensGovernorUpgradeable` contract manages rebasing token holders and facilitates yield claiming. Registered holders, such as pools and pair contracts that hold USDB or WETH, are monitored, and the yield from these tokens can be claimed by the administrator.

### How to Claim Yield

Yield for WETH and USDB tokens can be claimed using the methods provided in the contract. This section describes how an administrator can perform the yield claim and subsequently withdraw tokens if the specified recipient is the admin.

#### Step 1: Verify Available Claimable Yield
To check the yield that is available for claiming from registered token holders, use one of the following methods:

- **Read Claimable Amounts for a Range of Token Holders**
  - **Function to Call**:
    ```solidity
    /// @notice Reads claimable amounts within the specified range
    /// @param token_ The address of the token
    /// @param offset_ The offset to start from
    /// @param limit_ The maximum number of token holders to process
    /// @return tokenHoldersClaimableAmounts The claimable amounts of the token holders
    function readClaimableAmounts(address token_, uint256 offset_, uint256 limit_) external view returns (ClaimableAmountsResult[] memory tokenHoldersClaimableAmounts);
    ```
  - **Parameters**:
    - `token_`: Address of the token (e.g., WETH or USDB).
    - `offset_`: Start reading token holders from this index.
    - `limit_`: Number of token holders to process.

  This method returns the `ClaimableAmountsResult` structure, which includes:
  - `contractAddress`: Address of the token holder contract.
  - `claimableAmount`: Amount of tokens available to claim.
  - `mode`: Yield mode (e.g., `CLAIMABLE`).

- **Read Claimable Amounts from Specific Token Holders**
  - **Function to Call**:
    ```solidity
    /// @notice Reads claimable amounts from specified token holders
    /// @param token_ The address of the token
    /// @param holders_ The addresses of the token holders
    /// @return tokenHoldersClaimableAmounts The claimable amounts of the token holders
    function readClaimableAmountsFromSpecifiedTokenHolders(address token_, address[] memory holders_) external view returns (ClaimableAmountsResult[] memory tokenHoldersClaimableAmounts);
    ```
  - **Parameters**:
    - `token_`: Address of the token (e.g., WETH or USDB).
    - `holders_`: Array of addresses of token holders whose claimable amounts you want to read.

#### Step 2: Claim Yield
To claim yield, use one of the following methods depending on your requirements:

- **Claim Yield from a Range of Token Holders**
  - **Function to Call**:
    ```solidity
    /// @notice Claims tokens for a recipient within the specified range
    /// @param token_ The address of the token
    /// @param recipient_ The address of the recipient
    /// @param offset_ The offset to start from
    /// @param limit_ The maximum number of token holders to process
    /// @return totalClaimedAmount The total amount of tokens claimed
    function claim(address token_, address recipient_, uint256 offset_, uint256 limit_) external returns (uint256 totalClaimedAmount);
    ```
  - **Parameters**:
    - `token_`: Address of the token (e.g., WETH or USDB).
    - `recipient_`: Address to receive the claimed tokens.
    - `offset_`: Start claiming from this index.
    - `limit_`: Number of token holders to process.

- **Claim Yield from Specific Token Holders**
  - **Function to Call**:
    ```solidity
    /// @notice Claims from specified token holders
    /// @param token_ The address of the token
    /// @param recipient_ The address of the recipient
    /// @param holders_ The addresses of the token holders
    /// @return totalClaimedAmount The total amount of tokens claimed
    function claimFromSpecifiedTokenHolders(address token_, address recipient_, address[] memory holders_) external returns (uint256 totalClaimedAmount);
    ```
  - **Parameters**:
    - `token_`: Address of the token (e.g., WETH or USDB).
    - `recipient_`: Address to receive the claimed tokens.
    - `holders_`: Array of addresses of token holders from which to claim tokens.

#### Step 3: Withdraw Tokens
If the recipient of the claimed tokens is the BlastRebasingTokensGovernorUpgradeable contract, then Administator can withdraw the tokens from the contract.

- **Withdraw Tokens**
  - **Function to Call**:
    ```solidity
    /// @notice Withdraws a specified amount of tokens to a recipient
    /// @param token_ The address of the token to be withdrawn
    /// @param recipient_ The address of the recipient receiving the tokens
    /// @param amount_ The amount of tokens to be withdrawn
    function withdraw(address token_, address recipient_, uint256 amount_) external;
    ```
  - **Parameters**:
    - `token_`: Address of the token (e.g., WETH or USDB).
    - `recipient_`: Address to receive the withdrawn tokens.
    - `amount_`: Amount of tokens to be withdrawn.

### Important Notes
- **Roles Required**: To add token holders or claim tokens, specific roles are required:
  - `TOKEN_HOLDER_ADDER_ROLE`: Required to add token holders.
  - `TOKEN_WITHDRAWER_ROLE`: Required to claim tokens and withdraw them.
- **Automatic Registration**: The contract automatically registers token holders, such as system pair and pool contracts, that hold WETH or USDB.
- **Yield Modes**: Ensure that the token holder is configured to use `YieldMode.CLAIMABLE` before attempting to claim yield. This ensures that tokens can be claimed by the administrator.

### Example Workflow
1. **Check Available Yield**: Call `readClaimableAmounts()` to determine how much yield is available from each token holder.
2. **Claim Yield**: Call `claim()` or `claimFromSpecifiedTokenHolders()` to claim the yield for the specified recipient.
3. **Withdraw Tokens**: If the recipient is the administrator, use `withdraw()` to transfer the claimed tokens from the contract to the desired wallet.

For more detailed information, refer to the [Blast Documentation](https://docs.blast.io/building/guides/weth-yield) on rebasing token.


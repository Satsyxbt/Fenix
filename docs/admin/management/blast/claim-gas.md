## Gas Claiming Guide

This document explains how to interact with the `BlastGovernorUpgradeable` contract to check for available gas and perform gas claims for registered gas holders. For more detailed information on these processes, please refer to the [Blast Documentation](https://docs.blast.io/building/guides/gas-fees).

### Overview
The `BlastGovernorUpgradeable` contract allows users to claim gas from registered gas holders. There are several methods available for checking gas availability and claiming gas. To perform these operations, a user must have the necessary roles, specifically `GAS_WITHDRAWER_ROLE`.

### Steps to Claim Gas

#### Step 1: Verify Available Gas for Claiming
To check the gas that is available for claiming from registered gas holders, use one of the following methods:

- **Read Gas Parameters for a Range of Gas Holders**
  - **Function to Call**:
    ```solidity
    /// @notice Reads gas parameters within the specified range
    /// @param offset_ The offset to start from
    /// @param limit_ The maximum number of gas holders to process
    /// @return gasHoldersParams The gas parameters of the gas holders
    function readGasParams(uint256 offset_, uint256 limit_) external view returns (GasParamsResult[] memory gasHoldersParams);
    ```
  - **Parameters**:
    - `offset_`: Start reading gas holders from this index.
    - `limit_`: Number of gas holders to process.

  This method returns the `GasParamsResult` structure, which includes the following:
  - `contractAddress`: Address of the gas holder contract.
  - `etherSeconds`: Accumulated Ether seconds for the holder.
  - `etherBalance`: The balance available to claim.
  - `lastUpdated`: The last update time for the gas parameters.
  - `gasMode`: The gas mode (whether it's claimable, void, etc.).

- **Read Gas Parameters from Specific Gas Holders**
  - **Function to Call**:
    ```solidity
    /// @notice Reads gas parameters from specified gas holders
    /// @param holders_ The addresses of the gas holders
    /// @return gasHoldersParams The gas parameters of the gas holders
    function readGasParamsFromSpecifiedGasHolders(address[] memory holders_) external view returns (GasParamsResult[] memory gasHoldersParams);
    ```
  - **Parameters**:
    - `holders_`: Array of addresses of gas holders whose gas parameters you want to read.

#### Step 2: Claim Gas
To claim gas, use one of the following methods depending on your requirements:

- **Claim All Available Gas**
  - **Function to Call**:
    ```solidity
    /// @notice Claims all gas for a recipient within the specified range
    /// @param recipient_ The address of the recipient
    /// @param offset_ The offset to start from
    /// @param limit_ The maximum number of gas holders to process
    /// @return totalClaimedGas The total amount of gas claimed
    function claimAllGas(address recipient_, uint256 offset_, uint256 limit_) external returns (uint256 totalClaimedGas);
    ```
  - **Parameters**:
    - `recipient_`: Address to receive the claimed gas.
    - `offset_`: Start claiming gas from this index.
    - `limit_`: Number of gas holders to process.

- **Claim Maximum Gas for a Specific Set of Gas Holders**
  - **Function to Call**:
    ```solidity
    /// @notice Claims maximum gas for a recipient from specified gas holders
    /// @param recipient_ The address of the recipient
    /// @param holders_ The addresses of the gas holders
    /// @return totalClaimedGas The total amount of gas claimed
    function claimMaxGasFromSpecifiedGasHolders(address recipient_, address[] memory holders_) external returns (uint256 totalClaimedGas);
    ```
  - **Parameters**:
    - `recipient_`: Address to receive the claimed gas.
    - `holders_`: Array of gas holders from which to claim gas.

- **Claim Gas at a Minimum Claim Rate**
  This method is useful if you want to ensure the gas being claimed exceeds a certain rate.
  - **Function to Call**:
    ```solidity
    /// @notice Claims gas at minimum claim rate for a recipient from specified gas holders
    /// @param recipient_ The address of the recipient
    /// @param minClaimRateBips_ The minimum claim rate in basis points
    /// @param holders_ The addresses of the gas holders
    /// @return totalClaimedGas The total amount of gas claimed
    function claimGasAtMinClaimRateFromSpecifiedGasHolders(address recipient_, uint256 minClaimRateBips_, address[] memory holders_) external returns (uint256 totalClaimedGas);
    ```
  - **Parameters**:
    - `recipient_`: Address to receive the claimed gas.
    - `minClaimRateBips_`: Minimum claim rate in basis points (1 basis point = 0.01%).
    - `holders_`: Array of gas holders to claim from.



### Important Notes
- **Verify Role**: You must have `GAS_WITHDRAWER_ROLE` to perform claims. Ensure you contact the contract administrator if you do not have this role.
- **Range Operations**: When using the range-based functions, make sure the offset and limit values are correctly set to avoid skipping over or missing gas holders.
- **Non-Zero Addresses**: Always pass non-zero addresses for the recipient and gas holders to avoid reverts.

### Example Workflow
1. **Check Available Gas**: Call `readGasParams()` to find out the available gas and its distribution.
2. **Claim All Available Gas**: Call `claimAllGas()` with the recipient's address, offset, and limit to claim the gas.
3. **Assign Roles**: Ensure the claiming address has the `GAS_WITHDRAWER_ROLE` assigned by an administrator.

For more information, refer to the [Blast Documentation](https://docs.blast.io/building/guides/gas-fees) on gas claiming processes.


# FAQ

## Topic: Swap Fee Distribution

### Question 1: How to set a 90% swap fee to LP providers and 10% to gauges for all existing V2 pools?

To achieve a fee distribution where **90% of the swap fee** goes to LP providers and **10%** goes to the gauge for all existing V2 pools, you need to configure both the **community fee** and the **FeesVault distribution configuration**:

1. **Set Community Fee**: Set the community fee at the `PairFactory` level to **10%** (i.e., 1000 basis points). This ensures that 90% of the swap fees are distributed to LP providers, while the remaining 10% is allocated to the `FeesVault`.

   - **Function to Call**:
     ```solidity
     /// @notice Sets the protocol fee for all pairs
     /// @param _newFee The new protocol fee value (1000 for 10%)
     function setProtocolFee(uint256 _newFee) external;
     ```
     - **Parameter**: `_newFee = 1000`

2. **Set FeesVault Configuration by Creator**: Set the distribution configuration for the creator (`PairFactory`), directing **100% of the community fee** to the gauge. This ensures that the entire community fee collected (10% of swap fees) goes to the gauge.

   - **Function to Call**:
     ```solidity
     /// @notice Sets a distribution configuration for a specific creator
     /// @param creator_ The address of the creator (e.g., PairFactory address)
     /// @param config_ The distribution configuration to apply
     function setDistributionConfigForCreator(address creator_, DistributionConfig memory config_) external;
     ```
     - **Parameters**:
       - `creator_`: The address of the `PairFactory` contract.
       - `config_`: The `DistributionConfig` struct containing:
         - **`toGaugeRate`**: `10000` (represents 100% of the community fee)
         - **`recipients`**: `[]` (empty, as no additional recipients are specified)
         - **`rates`**: `[]`

#### Step-by-Step Summary:
1. **Update Community Fee**:
   - Call `setProtocolFee(1000)` on the `PairFactory` to allocate **10% of swap fees** to the community vault.

2. **Configure FeesVault Distribution for Creator**:
   - Call `setDistributionConfigForCreator(creator_, config_)` on the `FeesVaultFactory` to direct **100%** of the collected community fee to the gauge.

#### Example:
```solidity
PairFactory(`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`).setProtocolFee(1000)
FeesVaultFactory(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).setDistributionConfigForCreator(`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`, [10000,[],[]])
```

#### Important:
1. Ensure that no custom community fee is set for specific pairs that would override the general setting. For example, if the general community fee is set to **1000** (10%), but some pairs have a custom community fee set to **90%**, those pairs will not be affected by the general change.

2. Verify that there are no FeesVault configurations with higher priority for specific V2 pairs' FeesVaults, as they will take precedence over the creator or default configurations.


### Question 2: How to configure community fees to be 100% in V3 pools?

To set the community fee to **100%** for all V3 pools, you need to update the **community fee** in `AlgebraFactory`, configure community fee in all existed pools and configure the **FeesVault distribution** accordingly.

1. **Set Default Community Fee**: Set the community fee at the `AlgebraFactory` level to **100%** (i.e., 1000). This ensures that all swap fees are directed to the community vault for future deployed pools.

   - **Function to Call**:
     ```solidity
     /// @notice Sets the default community fee for all future pools
     /// @param newDefaultCommunityFee The new community fee value (1000 for 100%)
     function setDefaultCommunityFee(uint16 newDefaultCommunityFee) external;
     ```
     - **Parameter**: `newDefaultCommunityFee = 1000`
2. **Update Community Fee for Existing Pools**: Set the community fee for all existing V3 pools individually to **100%**. This is necessary because the default community fee in the factory only applies to future pools and does not override existing configurations.

   - **Function to Call**:
     ```solidity
        /// @notice Set the community's % share of the fees. Only factory owner or POOLS_ADMINISTRATOR_ROLE role
        /// @param newCommunityFee The new community fee percent in thousandths (1e-3)
        function setCommunityFee(uint16 newCommunityFee) external;
     ```
     - **Parameters**:
       - `newCommunityFee = 1000`

3. **Set FeesVault Configuration by Creator**: Set the distribution configuration for the creator (`AlgebraFactory`), directing **100% of the community fee** to the gauge. Ensure that no other recipients are specified if all fees should go to the gauge.

   - **Function to Call**:
     ```solidity
     /// @notice Sets a distribution configuration for a specific creator
     /// @param creator_ The address of the creator (e.g., AlgebraFactory address)
     /// @param config_ The distribution configuration to apply
     function setDistributionConfigForCreator(address creator_, DistributionConfig memory config_) external;
     ```
     - **Parameters**:
       - `creator_`: The address of the `AlgebraFactory` contract.
       - `config_`: The `DistributionConfig` struct containing:
         - **`toGaugeRate`**: `10000` (represents 100% of the community fee)
         - **`recipients`**: `[]` (empty, as no additional recipients are specified)
         - **`rates`**: `[]`


#### Step-by-Step Summary:
1. **Update Community Fee for Future Pools**:
   - Call `setDefaultCommunityFee(1000)` on the `AlgebraFactory` to allocate **100% of swap fees** to the community vault.
2. **Update Community Fee for every Existing Pools**:
   - Call `pool[1...].setCommunityFee(1000)` for each existing V3 pool to set the community fee to **100%**.
3. **Configure FeesVault Distribution for Creator**:
   - Call `setDistributionConfigForCreator(creator_, config_)` to direct **100%** of the collected community fee to the gauge.


#### Example:
```solidity
AlgebraFactory(`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`).setDefaultCommunityFee(1000)

AlgebraPool(poolAddressN1).setCommunityFee(1000)
...
AlgebraPool(poolAddressN15).setCommunityFee(1000)

FeesVaultFactory(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).setDistributionConfigForCreator(`0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`, [10000,[],[]])
```
# Creating and Configuring a Gauge for a Selected Pool

This document describes the process of creating and configuring a Gauge for a selected pool. The following tasks will be covered:

1. Creating a Gauge V2/V3 through the Voter contract for a selected pool.
2. Configuring Fee Distribution to redirect a specified amount of fees to the Gauge.
3. Setting up future campaign parameters for emission distribution for the Gauge

### Overview of Steps

The Gauge creation process involves several key steps that ensure the gauge is properly configured to handle voting, rewards, and fee distribution. This document provides the necessary steps and the corresponding methods to accomplish this.

### 1. Creating a Gauge V2/V3

To create a Gauge for a selected pool, you need to interact with the Voter contract (`VoterUpgradeable`). This contract manages the voting process and integrates with Gauges, Bribes, and NFT-based voting mechanisms. Depending on whether you are creating a V2 or V3 Gauge, you will use one of the following methods:

#### Methods for Creating a Gauge

- **Create V2 Gauge**
  
  ```solidity
      /**
     * @notice Creates a new V2 gauge for a specified pool.
     * @dev Only callable by an address with the GOVERNANCE_ROLE. The pool must be created by the V2 Pool Factory.
     * @param pool_ The address of the pool for which to create a gauge.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     * @custom:error GaugeForPoolAlreadyExists Thrown if a gauge already exists for the specified pool.
     * @custom:error PoolNotCreatedByFactory Thrown if the specified pool was not created by the V2 Pool Factory.
     */
    function createV2Gauge(address pool_) external returns (address gauge, address internalBribe, address externalBribe)
  ```
  
  This method creates a V2 Gauge for the specified pool. The pool must be created by the V2 Pool Factory. It also creates internal and external Bribes that are associated with the pool. The `createV2Gauge` method requires the `GOVERNANCE_ROLE` to be called.
  
- **Create V3 Gauge**
  
  ```solidity
      /**
     * @notice Creates a new V3 gauge for a specified pool.
     * @dev Only callable by an address with the GOVERNANCE_ROLE. The pool must be created by the V3 Pool Factory.
     * @param pool_ The address of the pool for which to create a gauge.
     * @return gauge The address of the created gauge.
     * @return internalBribe The address of the created internal bribe.
     * @return externalBribe The address of the created external bribe.
     * @custom:error GaugeForPoolAlreadyExists Thrown if a gauge already exists for the specified pool.
     * @custom:error PoolNotCreatedByFactory Thrown if the specified pool was not created by the V3 Pool Factory.
     */
    function createV3Gauge(address pool_) external returns (address gauge, address internalBribe, address externalBribe)
  ```
  
  Similar to `createV2Gauge`, this method creates a V3 Gauge for the specified pool, which must be created by the V3 Pool Factory. This method also requires the `GOVERNANCE_ROLE`.

#### Required Parameters

- **pool_**: The address of the pool for which the gauge is being created.

#### Example Usage

To create a gauge for a specific pool:

```solidity
address gauge;
address internalBribe;
address externalBribe;

(gauge, internalBribe, externalBribe) = voter.createV2Gauge(poolAddress);
```

### 2. Configuring Fee Distribution for the Gauge

After creating a gauge, you need to configure the fee distribution so that the appropriate amount of fees are redirected to the Gauge. This can be done using the `FeesVaultFactoryUpgradeable` contract.

#### Setting Custom Fee Distribution Configurations

- **setCustomDistributionConfig**

  ```solidity
      /**
     * @notice Sets a custom distribution configuration for a specific fees vault.
     * @param feesVault_ The address of the fees vault to configure.
     * @param config_ The custom distribution configuration to apply.
     */
    function setCustomDistributionConfig(address feesVault_, DistributionConfig memory config_) external
  ```
  
  This method allows you to set a custom fee distribution configuration for a specific fees vault, ensuring that the necessary percentage of fees is directed to the Gauge.

#### Required Parameters

- **feesVault_**: The address of the fees vault linked to the pool.
- **config_**: The custom fee distribution configuration, specifying recipients and their respective rates.

#### Example Usage

```solidity
FeesVaultFactoryUpgradeable feesVaultFactory = FeesVaultFactoryUpgradeable(feesVaultFactoryAddress);
DistributionConfig memory config;
config.toGaugeRate = 10000; // 10000 = 100% of fees to gauge
config.recipients = [];
config.rates = [];

feesVaultFactory.setCustomDistributionConfig(feesVaultAddress, config);
```

### 3. Setting Campaign Parameters for Future Emission Distribution (V3 Gauge Only)

For Gauge V3, it's necessary to set up parameters for future campaigns that will be created during the emission distribution. This is done through the `MerklGaugeMiddleman` contract, which acts as a bridge between Gauges and Merkl reward distribution.

### 3. Setting Campaign Parameters for Future Emission Distribution

For Gauge V3, it's necessary to set up parameters for future campaigns that will be created during the emission distribution. This is done through the `MerklGaugeMiddleman` contract, which acts as a bridge between Gauges and reward distribution.

The set campaign setting will be used for future campaigns created

[Merkl docs](https://docs.merkl.xyz/distribute-with-merkl/types-of-campaign/concentrated-liquidity-pool-incentivization-campaign)

#### Setting Gauge Parameters

- **setGauge**

  ```solidity
    struct DistributionParameters {
        // ID of the reward (populated once created). This can be left as a null bytes32 when creating distributions
        // on Merkl.
        bytes32 rewardId;
        // Address of the UniswapV3 pool that needs to be incentivized
        address uniV3Pool;
        // Address of the reward token for the incentives
        address rewardToken;
        // Amount of `rewardToken` to distribute across all the epochs
        // Amount distributed per epoch is `amount/numEpoch`
        uint256 amount;
        // List of all position wrappers to consider or not for this contract. Some wrappers like Gamma or Arrakis
        // are automatically detected and so there is no need to specify them here. Check out the docs to find out
        // which need to be specified and which are not automatically detected.
        address[] positionWrappers;
        // Type (blacklist==3, whitelist==0, ...) encoded as a `uint32` for each wrapper in the list above. Mapping between
        // wrapper types and their corresponding `uint32` value can be found in Angle Docs
        uint32[] wrapperTypes;
        // In the incentivization formula, how much of the fees should go to holders of token0
        // in base 10**4
        uint32 propToken0;
        // Proportion for holding token1 (in base 10**4)
        uint32 propToken1;
        // Proportion for providing a useful liquidity (in base 10**4) that generates fees
        uint32 propFees;
        // Timestamp at which the incentivization should start. This is in the same units as `block.timestamp`.
        uint32 epochStart;
        // Amount of epochs for which incentivization should last. Epochs are expressed in hours here, so for a
        // campaign of 1 week `numEpoch` should for instance be 168.
        uint32 numEpoch;
        // Whether out of range liquidity should still be incentivized or not
        // This should be equal to 1 if out of range liquidity should still be incentivized
        // and 0 otherwise.
        uint32 isOutOfRangeIncentivized;
        // How much more addresses with a maximum boost can get with respect to addresses
        // which do not have a boost (in base 4). In the case of Curve where addresses get 2.5x more
        // this would be 25000.
        uint32 boostedReward;
        // Address of the token which dictates who gets boosted rewards or not. This is optional
        // and if the zero address is given no boost will be taken into account. In the case of Curve, this address
        // would for instance be the veBoostProxy address, or in other cases the veToken address.
        address boostingAddress;
        // Additional data passed when distributing rewards. This parameter may be used in case
        // the reward distribution script needs to look into other parameters beyond the ones above.
        // In most cases, when creating a campaign on Merkl, you can leave this as an empty bytes.
        bytes additionalData;
    }

    /**
     * @dev Sets the reward distribution parameters for a specific gauge. Only callable by the contract owner.
     * Ensures the gauge and reward token addresses are valid and that the reward token is whitelisted.
     *
     * @param gauge_ Address of the gauge for which to set the parameters
     * @param params_ DistributionParameters struct containing the reward distribution settings
     */
    function setGauge(address gauge_, DistributionParameters memory params_) external onlyOwner
  ```

  This method sets the reward distribution parameters for a specific gauge, allowing you to configure the details of how future rewards are distributed during emissions.

#### Required Parameters

- **gauge_**: The address of the Gauge for which to set the parameters.
- **params_**: A `DistributionParameters` struct containing the reward distribution settings, such as the reward token, amount, epoch duration, and other incentivization details.


### Summary

The following actions are required to successfully create and configure a Gauge for a selected pool:

1. **Create a Gauge** using `createV2Gauge` or `createV3Gauge` methods from the `VoterUpgradeableV2` contract.
2. **Configure Fee Distribution** using the `setCustomDistributionConfig` from `FeesVaultFactoryUpgradeable`.
3. **Set Campaign Parameters** for future emissions using `setGauge` from the `MerklGaugeMiddleman` to configure how rewards will be distributed.

These actions collectively ensure that the Gauge is functional and rewards are properly distributed to liquidity providers.
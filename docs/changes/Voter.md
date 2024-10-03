# VoterUpgradeable Contract Changes

## Event Changes

### Events Added

- **UpdateAddress**

  Emitted when a contract address is updated.

  ```solidity
  /**
   * @notice Emitted when a contract address is updated.
   * @param key_ The key representing the contract.
   * @param value_ The new address of the contract.
   */
  event UpdateAddress(string key_, address value_);
  ```

- **GaugeCreatedType**

    Emitted when a gauge is created with a specific type.
  ```solidity
    /**
    * @notice Emitted when a gauge is created with a specific type.
    * @param gauge The address of the created gauge.
    * @param gaugeType The type of the gauge created.
    */
    event GaugeCreatedType(address gauge, uint256 gaugeType);
  ```
  
### Events Removed
- Whitelisted
- Blacklisted
- SetMinter
- SetBribeFactory
- SetPairFactory
- SetGaugeFactory
- SetBribeFor
- AddFactories
- SetGovernance
- SetVoterAdmin


## Function Changes

### Functions Added

- **updateAddress**

    Updates the address of a specified contract.
    ```solidity
    /**
    * @notice Updates the address of a specified contract.
    * @dev Only callable by an address with the VOTER_ADMIN_ROLE.
    * @param key_ The key representing the contract.
    * @param value_ The new address of the contract.
    * @custom:event UpdateAddress Emitted when a contract address is updated.
    * @custom:error InvalidAddressKey Thrown when an invalid key is provided.
    */
    function updateAddress(string memory key_, address value_) external onlyRole(_VOTER_ADMIN_ROLE);
    ```
- **createV2Gauge**

    Creates a new V3 gauge for a specified pool.
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
    function createV3Gauge(
        address pool_
    ) external nonReentrant onlyRole(_GOVERNANCE_ROLE) returns (address gauge, address internalBribe, address externalBribe);
    ```
- **poolsCounts**

    Returns the total number of pools, V2 pools, and V3 pools managed by the contract.

    ```solidity
    /**
    * @notice Returns the total number of pools, V2 pools, and V3 pools managed by the contract.
    * @return totalCount The total number of pools.
    * @return v2PoolsCount The total number of V2 pools.
    * @return v3PoolsCount The total number of V3 pools.
    */
    function poolsCounts() external view returns (uint256 totalCount, uint256 v2PoolsCount, uint256 v3PoolsCount);
    ```

### Functions Removed
- setVoterAdmin
- setGovernance
- setMinter
- setBribeFactory
- setNewBribes
- setInternalBribeFor
- setExternalBribeFor
- addFactory
- replaceFactory
- removeFactory
- whitelist
- blacklist
- createGauges
- createGauge
- setVeFnxMerklAidrop
- claimFees
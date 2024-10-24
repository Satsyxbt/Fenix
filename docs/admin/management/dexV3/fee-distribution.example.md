## Fee Distribution Examples

This guide provides examples of how to configure the community fee distribution between the `FeesVault` and LP Providers for future pools using the `AlgebraFactoryUpgradeable` contract. You can set the percentage of swap fees directed to the `FeesVault` or retained by LP Providers.

### Example 1: 100% to FeesVault for Future Pools

To allocate **100% of the swap fees** to the `FeesVault` for all future pools, you can use the following function:

```solidity
/// @dev updates default community fee for new pools
/// @param newDefaultCommunityFee The new community fee, _must_ be <= MAX_COMMUNITY_FEE
function setDefaultCommunityFee(uint16 newDefaultCommunityFee) external;
```

- **Function Call**:
  ```solidity
  algebraFactory.setDefaultCommunityFee(1000);
  ```
  - **Parameter**: `1000` represents **100%** of the swap fees (in thousandths, where 1000 = 100%).

This configuration directs all swap fees to the `FeesVault`, leaving no fees for LP Providers.

### Example 2: 10% to FeesVault and 90% to LP Providers for Future Pools

To allocate **10% of the swap fees** to the `FeesVault` and **90% to LP Providers** for all future pools, use the following function:

- **Function Call**:
  ```solidity
  algebraFactory.setDefaultCommunityFee(100);
  ```
  - **Parameter**: `100` represents **10%** of the swap fees (in thousandths, where 100 = 10%).

This configuration ensures that **10%** of swap fees are directed to the `FeesVault`, while **90%** of the fees are retained by LP Providers as rewards.

### Example 3: 100% to LP Providers for Future Pools

To allocate **100% of the swap fees** to LP Providers and **0% to the FeesVault** for all future pools, use the following function:

- **Function Call**:
  ```solidity
  algebraFactory.setDefaultCommunityFee(0);
  ```
  - **Parameter**: `0` represents **0%** of the swap fees allocated to the `FeesVault`.

This configuration directs all swap fees to LP Providers, providing them with the full benefit of the trading activity in the pool.

### Configuring Fee Distribution for Existing Pools

This section provides examples of how to configure the community fee distribution for already deployed pools using the `AlgebraPool` contract. You can adjust the percentage of swap fees directed to the `FeesVault` or retained by LP Providers.

#### Example 1: 100% to FeesVault for an Existing Pool

To allocate **100% of the swap fees** to the `FeesVault` for an existing pool, use the following function:

```solidity
/// @notice Sets the community fee for the pool
/// @param newCommunityFee The new community fee value, must be <= MAX_COMMUNITY_FEE
function setCommunityFee(uint16 newCommunityFee) external;
```

- **Function Call**:
  ```solidity
  algebraPool.setCommunityFee(1000);
  ```
  - **Parameter**: `1000` represents **100%** of the swap fees (in thousandths, where 1000 = 100%).

This configuration directs all swap fees to the `FeesVault`, leaving no fees for LP Providers.

#### Example 2: 10% to FeesVault and 90% to LP Providers for an Existing Pool

To allocate **10% of the swap fees** to the `FeesVault` and **90% to LP Providers** for an existing pool, use the following function:

- **Function Call**:
  ```solidity
  algebraPool.setCommunityFee(100);
  ```
  - **Parameter**: `100` represents **10%** of the swap fees (in thousandths, where 100 = 10%).

This configuration ensures that **10%** of swap fees are directed to the `FeesVault`, while **90%** of the fees are retained by LP Providers as rewards.

#### Example 3: 100% to LP Providers for an Existing Pool

To allocate **100% of the swap fees** to LP Providers and **0% to the FeesVault** for an existing pool, use the following function:

- **Function Call**:
  ```solidity
  algebraPool.setCommunityFee(0);
  ```
  - **Parameter**: `0` represents **0%** of the swap fees allocated to the `FeesVault`.

This configuration directs all swap fees to LP Providers, providing them with the full benefit of the trading activity in the pool.


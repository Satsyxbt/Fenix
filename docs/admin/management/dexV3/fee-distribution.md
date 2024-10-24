## AlgebraPool V3 Overview

### Default Community Fee for Future Pools

The default community fee for future pools is determined by the `AlgebraFactoryUpgradeable` contract. This factory sets the `defaultCommunityFee`, which represents the percentage of swap fees allocated to the Community Vault.

To set the `defaultCommunityFee` for future pools, the following function is used:

```solidity
/// @dev updates default community fee for new pools
/// @param newDefaultCommunityFee The new community fee, _must_ be <= MAX_COMMUNITY_FEE
function setDefaultCommunityFee(uint16 newDefaultCommunityFee) external;
```

- **`newDefaultCommunityFee`**: The new percentage (up to a maximum defined by `Constants.MAX_COMMUNITY_FEE`). This value will be applied to all future pools created by the factory. If the `defaultCommunityFee` is non-zero, a valid Community Vault address must be set.

The `defaultCommunityFee` determines how much of the swap fees are directed to the Community Vault, with the remaining portion allocated to LP providers. This ensures that new pools adhere to a consistent fee-sharing structure, supporting community growth and incentives.

The community fee is calculated as a fraction of the total swap fee, divided by the **`COMMUNITY_FEE_DENOMINATOR`** which is set as follows:

```solidity
uint256 internal constant COMMUNITY_FEE_DENOMINATOR = 1e3;
```

This constant represents a denominator of 1000, meaning that community fee values are expressed in basis points (e.g., 1000 represents 100%).

### Events

```solidity
/// @notice Emitted when the default community fee is changed
/// @param newDefaultCommunityFee The new default community fee value
event DefaultCommunityFee(uint16 newDefaultCommunityFee);
```

### Configuring Community Fee for Existing Pools

Once a pool has been deployed, authorized users can adjust the community fee settings using the following function:

**Community Fee**: The community fee is a percentage of swap fees allocated to the Community Vault. To modify the community fee for an existing pool:

```solidity
/// @notice Sets the community fee for the pool
/// @param newCommunityFee The new community fee value, must be <= MAX_COMMUNITY_FEE
function setCommunityFee(uint16 newCommunityFee) external;
```

- **`newCommunityFee`**: The new percentage (up to a maximum defined by `uint16 internal constant MAX_COMMUNITY_FEE = 1e3;` // 100%). If the community fee is non-zero, a community vault must be configured.

This function allows for flexibility in updating the community fee for individual pools, ensuring that the protocol can adapt to changing governance decisions or community needs.

When the community fee is updated, the following event is emitted by the pool:

```solidity
/// @notice Emitted when the community fee is changed by the pool
/// @param communityFeeNew The updated value of the community fee in thousandths (1e-3)
event CommunityFee(uint16 communityFeeNew);
```


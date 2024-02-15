// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

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

interface IDistributionCreator {
    /// @notice Creates a `distribution` to incentivize a given pool for a specific period of time
    /// @return distributionAmount How many reward tokens are actually taken into consideration in the contract
    /// @dev If the address specified as a UniV3 pool is not effectively a pool, it will not be handled by the
    /// distribution script and rewards may be lost
    /// @dev Reward tokens sent as part of distributions must have been whitelisted before and amounts
    /// sent should be bigger than a minimum amount specific to each token
    /// @dev The `positionWrappers` specified in the `distribution` struct need to be supported by the script
    /// List of supported `positionWrappers` can be found in the docs.
    /// @dev If the pool incentivized contains one whitelisted token, then no fees are taken on the rewards
    /// @dev This function reverts if the sender has not signed the message `messageHash` once through one of
    /// the functions enabling to sign
    function createDistribution(DistributionParameters memory distribution) external returns (uint256 distributionAmount);

    function isWhitelistedToken(address token) external view returns (uint256);

    function rewardTokenMinAmounts(address token) external view returns (uint256);
}

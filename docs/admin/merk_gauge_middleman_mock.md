## Blast: Gauge Parameter Configuration and Campaign Creation Guide

### 1. Contract Addresses
This guide provides the necessary steps to set up gauge parameters and create a reward campaign using the `MerklGaugeMiddleman` contract on Blast. Below are the key deployed contracts used throughout this guide:

- **Gauge Creator**: [0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd](https://blastscan.io/address/0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd#code)
- **ERC20 Mock Token**: [0xB481E79A38Ed9f8DcEecC56C7a0393a22C1cAb9b](https://blastscan.io/address/0xB481E79A38Ed9f8DcEecC56C7a0393a22C1cAb9b#code)
- **Merkl Gauge Middleman**: [0x2b9B9Cbe8dD6988393b30Df4f5961AAe382D343e](https://blastscan.io/address/0x2b9B9Cbe8dD6988393b30Df4f5961AAe382D343e#code)

These contracts are essential for deploying and managing the gauge and reward distribution system on Blast.

### 2. ERC20 Mock Token for Rewards
The **ERC20OwnableMock** token is deployed as a reward token for incentivizing liquidity pools in the campaigns. This mock token acts as the reward asset distributed to liquidity providers who participate in the incentivized pools. The token was deployed using the following constructor arguments:

- **Name**: "MerklGaugeMiddleman ERC20 Mock token"
- **Symbol**: "MGMEMT"
- **Decimals**: 18

Deployed at address: [0xB481E79A38Ed9f8DcEecC56C7a0393a22C1cAb9b](https://blastscan.io/address/0xB481E79A38Ed9f8DcEecC56C7a0393a22C1cAb9b#code).

Minting of reward tokens can be done by calling the `mint` function. In this example, 10 million tokens were minted to the address `0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30` for reward distribution:

```plaintext
Called Contract(0xB481E79A38Ed9f8DcEecC56C7a0393a22C1cAb9b).mint(to_: "0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30", amount_: "10000000000000000000000000")
Transaction hash: 0xca1655c5ed51cf769d8e798c782ca2033ef5d14305ef858ab448be683c483c37
```

### 3. Configuring Future Campaigns
To set up future reward campaigns, gauge parameters need to be configured using the `setGauge` function of the `MerklGaugeMiddleman` contract. The configuration involves defining a set of parameters to properly incentivize the targeted liquidity pools.

#### Setting Distribution Parameters
The `setGauge` function allows the owner of the contract to specify parameters for a particular gauge:

```solidity
function setGauge(address gauge_, DistributionParameters memory params_) external onlyOwner;
```
- **gauge_**: The address of the gauge for which to set the parameters.
- **params_**: A `DistributionParameters` struct containing the reward and future campagin details
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
```
Example call:
```solidity
setGauge(
  0xAddressOfGauge,
  DistributionParameters({
    rewardId: 0x...
    uniV3Pool: 0x...
    rewardToken: 0xB481E79A38Ed9f8DcEecC56C7a0393a22C1cAb9b,
    amount: 100000000000000000000000,
    ...additional configurations...
  })
);
```

For further information, refer to the official [Angel Merkl Distributor Documentation](https://docs.merkl.xyz/merkl-mechanisms/types-of-campaign) for details on setting up campaigns and using the `DistributionParameters` structure.

### 4. Creating Campaigns
After configuring the gauge parameters, campaigns can be created by notifying the `MerklGaugeMiddleman` contract of the rewards using the `notifyReward` or `notifyRewardWithTransfer` functions.

- **notifyReward**: Notifies the gauge about the reward amount without transferring tokens.
- **notifyRewardWithTransfer**: Transfers tokens and notifies the gauge about the reward in a single transaction.

Example call to create a campaign:
```solidity
notifyRewardWithTransfer(0xAddressOfGauge, 50000000000000000000000);
```
This call transfers 50,000 tokens to the gauge and notifies the distribution creator.

The campaign is now active, and liquidity providers participating in the specified Uniswap V3 pool will be incentivized according to the configured parameters.

### Events
- **GaugeSet(address gauge_)**: Emitted when gauge parameters are set.
- **CreateDistribution(address indexed sender, address indexed gauge, uint256 totalReward, uint256 effectiveReward)**: Emitted when a reward distribution is created.


### 5. Example

**Setup parameters for mock gauge address**
```solidity
MerklGaugeMiddleman.setGauge(
  0x,
  DistributionParameters({
    rewardId: "0x",
    uniV3Pool: 0x...
    rewardToken: 0xB481E79A38Ed9f8DcEecC56C7a0393a22C1cAb9b,
    amount: 0, // Will be set automatically, according to the value of the emission distributed
    positionWrappers: [],
    wrapperTypes: [],
    propToken0: 4500,
    propToken1: 4500,
    propFees: 1000,
    epochStart: 0, // Will be set automatically, according to the timestamp according calling the distribution on the MerklGaugeMiddleman
    numEpoch: 168,
    isOutOfRangeIncentivized: 0,
    boostedReward: 0,
    boostingAddress: 0x0000000000000000000000000000000000000000, 
    additionalData: "0x"
  })
);
```

**Call distribution rewards**
```solidity
MerklGaugeMiddleman.notifyRewardWithTransfer(0xAddressOfGauge, 50000000000000000000000);
```
## Blast: Gauge Parameter Configuration and Campaign Creation Guide

### 1. Contract Addresses
This guide provides the necessary steps to set up gauge parameters and create a reward campaign using the `MerklGaugeMiddleman` contract on Blast. Below are the key deployed contracts used throughout this guide:

- **Gauge Creator**: [0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd](https://blastscan.io/address/0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd#code)
- **ERC20 Mock Token**: [0xA7c167f58833c5e25848837f45A1372491A535eD](https://blastscan.io/address/0xA7c167f58833c5e25848837f45A1372491A535eD#code)
- **Merkl Gauge Middleman**: [0xC5fAE3085A259463bA72aeEEfc2ee864471B669B](https://blastscan.io/address/0xC5fAE3085A259463bA72aeEEfc2ee864471B669B#code)

These contracts are essential for deploying and managing the gauge and reward distribution system on Blast.

### 2. ERC20 Mock Token for Rewards

- **Name**: "aglaMerkl"
- **Symbol**: "aglaMerkl"
- **Decimals**: 6
- **Address**: 0xA7c167f58833c5e25848837f45A1372491A535eD

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
    rewardToken: 0xA7c167f58833c5e25848837f45A1372491A535eD,
    amount: 100000000,
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
    rewardToken: 0xA7c167f58833c5e25848837f45A1372491A535eD,
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
ERC20(0xA7c167f58833c5e25848837f45A1372491A535eD).approve(MerklGaugeMiddleman, 500000000)
MerklGaugeMiddleman.notifyRewardWithTransfer(0xAddressOfGauge, 500000000);
```



## 04.11.2024,Test campagin

Create tx: [https://blastscan.io/tx/0xe896847976c55ba86f20962302f262fa0dcabde2aa40bf3cd9951a4af5be3483](https://blastscan.io/tx/0xe896847976c55ba86f20962302f262fa0dcabde2aa40bf3cd9951a4af5be3483)

Result, from https://api.merkl.xyz/v3/campaigns/?chainIds=81457 :
```json
      "0xc01f0f75866113b29b3cbff0137c9f14cbc63dd693baf4bd81bb5b326f91dde5": {
        "chainId": 81457,
        "index": 709,
        "campaignId": "0xc01f0f75866113b29b3cbff0137c9f14cbc63dd693baf4bd81bb5b326f91dde5",
        "creator": "0xC5fAE3085A259463bA72aeEEfc2ee864471B669B",
        "campaignType": 2,
        "campaignSubType": 0,
        "rewardToken": "0xA7c167f58833c5e25848837f45A1372491A535eD",
        "amount": "97000000000",
        "amountDecimal": "0",
        "startTimestamp": 1730552400,
        "endTimestamp": 1731157200,
        "mainParameter": "0x1D74611f3EF04E7252f7651526711a937Aa1f75e",
        "campaignParameters": {
          "amm": 16,
          "url": "",
          "token0": "0x4300000000000000000000000000000000000003",
          "token1": "0x4300000000000000000000000000000000000004",
          "ammAlgo": 5,
          "poolFee": "0.01",
          "duration": 604800,
          "blacklist": [],
          "whitelist": [],
          "forwarders": [
            {
              "type": 5,
              "sender": "0x61a51ea57c1b4fb22b24f9871df3bdb597d51d06",
              "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
              "priority": 0,
              "forwarderType": 1
            },
            {
              "type": 5,
              "sender": "0xcf5279e672392121f17bf3f4f7ceb739621c3896",
              "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
              "priority": 0,
              "forwarderType": 1
            },
            {
              "type": 2,
              "sender": "0x7e35e1da52d710a5b115c294be3a1221988af150",
              "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
              "priority": 0,
              "forwarderType": 1
            },
            {
              "type": 6,
              "sender": "0x027be46864c635d4142cb67d628169a760fbc8f2",
              "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
              "priority": 0,
              "forwarderType": 1
            },
            {
              "type": 6,
              "sender": "0x7eb7a174dc75b6a96d0120258648c674ef8fa6ed",
              "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
              "priority": 0,
              "forwarderType": 1
            }
          ],
          "weightFees": 5000,
          "poolAddress": "0x1D74611f3EF04E7252f7651526711a937Aa1f75e",
          "symbolToken0": "USDB",
          "symbolToken1": "WETH",
          "weightToken0": 2500,
          "weightToken1": 2500,
          "boostedReward": 0,
          "boostedAddress": "0x0000000000000000000000000000000000000000",
          "decimalsToken0": 18,
          "decimalsToken1": 18,
          "symbolRewardToken": "aglaMerkl",
          "decimalsRewardToken": 6,
          "isOutOfRangeIncentivized": false
        },
        "computeChainId": 81457,
        "tags": [],
        "amm": 16,
        "ammAlgo": 5,
        "ammAlgoName": "AlgebraIntegral",
        "ammName": "Fenix",
        "apr": 0,
        "aprs": {

        },
        "aprBreakdowns": [],
        "blacklistedBalance0": 0,
        "blacklistedBalance1": 0,
        "blacklistedLiquidity": 0,
        "forwarders": [
          {
            "almAPR": 0,
            "almAddress": "0x61a51eA57C1b4Fb22b24F9871Df3bdB597d51d06",
            "almBalance0": 27681.5994128734,
            "almIdleBalance0": 1.4e-17,
            "almIdleBalance1": 0,
            "almBalance1": 75.0557098879202,
            "almInRangeLiquidity": 23946.706230549,
            "almTVL": 213512.286453134,
            "almTotalLiquidity": 24328.5728823528,
            "forwarderType": 1,
            "label": "Ichi 0x61a51ea57c1b4fb22b24f9871df3bdb597d51d06",
            "origin": 5,
            "positions": [
              {
                "balance0": 8820.12968203288,
                "balance1": 75.0557098879202,
                "id": "0x61a51ea57c1b4fb22b24f9871df3bdb597d51d06-81540-78000",
                "inRangeLiquidity": 23946.706230549,
                "lowerTick": -81540,
                "totalLiquidity": 23946.706230549,
                "tvl": 194386.756146061,
                "upperTick": -78000
              },
              {
                "balance0": 18861.4697308406,
                "balance1": 0,
                "id": "0x61a51ea57c1b4fb22b24f9871df3bdb597d51d06-78000887220",
                "inRangeLiquidity": 0,
                "lowerTick": -78000,
                "totalLiquidity": 381.866651803802,
                "tvl": 19125.5303070723,
                "upperTick": 887220
              }
            ],
            "priority": 0,
            "sender": "0x61a51eA57C1b4Fb22b24F9871Df3bdB597d51d06",
            "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
            "owner": "0x61a51eA57C1b4Fb22b24F9871Df3bdB597d51d06",
            "totalSupply": 4148.09137945536,
            "type": 5
          },
          {
            "almAPR": 0,
            "almAddress": "0xcF5279e672392121F17bf3f4f7CEb739621C3896",
            "almBalance0": 145419.965659585,
            "almIdleBalance0": 1.8e-17,
            "almIdleBalance1": 0,
            "almBalance1": 22.616299182067,
            "almInRangeLiquidity": 2922.35998197695,
            "almTVL": 203334.840219919,
            "almTotalLiquidity": 19760.3288046173,
            "forwarderType": 1,
            "label": "Ichi 0xcf5279e672392121f17bf3f4f7ceb739621c3896",
            "origin": 5,
            "positions": [
              {
                "balance0": 0,
                "balance1": 22.5241575277024,
                "id": "0xcf5279e672392121f17bf3f4f7ceb739621c3896-79560-78180",
                "inRangeLiquidity": 0,
                "lowerTick": -79560,
                "totalLiquidity": 16837.9688226404,
                "tvl": 55651.3369699955,
                "upperTick": -78180
              },
              {
                "balance0": 145419.965659585,
                "balance1": 0.0921416543646147,
                "id": "0xcf5279e672392121f17bf3f4f7ceb739621c3896-78180887220",
                "inRangeLiquidity": 2922.35998197695,
                "lowerTick": -78180,
                "totalLiquidity": 2922.35998197695,
                "tvl": 147683.503249924,
                "upperTick": 887220
              }
            ],
            "priority": 0,
            "sender": "0xcF5279e672392121F17bf3f4f7CEb739621C3896",
            "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
            "owner": "0xcF5279e672392121F17bf3f4f7CEb739621C3896",
            "totalSupply": 649947969.269578,
            "type": 5
          },
          {
            "almAPR": 0,
            "almAddress": "0x7e35E1da52d710A5b115C294BE3a1221988aF150",
            "almBalance0": 31568.1566393567,
            "almIdleBalance0": 2.5e-17,
            "almIdleBalance1": 0.000001400702930436,
            "almBalance1": 0.444109172627183,
            "almInRangeLiquidity": 634.393752255403,
            "almTVL": 33107.3891294845,
            "almTotalLiquidity": 634.393752255403,
            "forwarderType": 1,
            "label": "Gamma 0x7e35e1da52d710a5b115c294be3a1221988af150",
            "origin": 2,
            "positions": [
              {
                "balance0": 16836.4590479074,
                "balance1": 0.328814269467805,
                "id": "0x7e35e1da52d710a5b115c294be3a1221988af150-79140887220",
                "inRangeLiquidity": 338.345521790154,
                "lowerTick": -79140,
                "totalLiquidity": 338.345521790154,
                "tvl": 17884.584042723,
                "upperTick": 887220
              },
              {
                "balance0": 14731.6975914492,
                "balance1": 0.115293502456448,
                "id": "0x7e35e1da52d710a5b115c294be3a1221988af150-78540887220",
                "inRangeLiquidity": 296.04823046525,
                "lowerTick": -78540,
                "totalLiquidity": 296.04823046525,
                "tvl": 15222.8016259888,
                "upperTick": 887220
              }
            ],
            "priority": 0,
            "sender": "0x7e35E1da52d710A5b115C294BE3a1221988aF150",
            "target": "0x1d74611f3ef04e7252f7651526711a937aa1f75e",
            "owner": "0x7e35E1da52d710A5b115C294BE3a1221988aF150",
            "totalSupply": 23.5573239066144,
            "type": 2
          }
        ],
        "isBoosted": false,
        "isLive": true,
        "isMock": true,
        "poolBalanceToken0": 228405.469717694,
        "poolBalanceToken1": 109.776914497789,
        "poolTotalLiquidity": 34313.3114127356,
        "symbolToken0": "USDB",
        "symbolToken1": "WETH",
        "tick": -78149,
        "priceRewardToken": 0,
        "tvl": 502833.360020009
      }
```
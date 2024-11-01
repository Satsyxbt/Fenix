### VeFnxSplitMerklAidrop Parameters Setup

#### Contract Address
The contract address for `VeFnxSplitMerklAidropUpgradeable` is:
```
0x311F7981d7159De374c378Be0815DC4257b50468
```
- **[VeFnxSplitMerklAidrop](https://blastscan.io/address/0x311F7981d7159De374c378Be0815DC4257b50468)** - `0x311F7981d7159De374c378Be0815DC4257b50468`

#### Setting the Pure Tokens Rate
**After upgrading to the new version, the pureTokensRate will be 50%, you need to set the correct rate, determine it and set**

The pure tokens rate (`pureTokensRate`) determines how many pure FNX tokens are equivalent to 1 FNX when claimed as veFNX. This rate needs to be set before users can claim tokens. For example, if the rate is set to `0.5e18`, then 1 FNX in veFNX equals `0.5` pure FNX.

### Methods to Set and Update Parameters

- **Set Pure Tokens Rate**
  
  **Method:** `setPureTokensRate(uint256 pureTokensRate_)`
  - Sets the rate for converting FNX tokens to pure FNX.
  - Can only be called by the owner when the contract is paused.
  - Example usage:
  ```solidity
  VeFnxSplitMerklAidropUpgradeable("0x311F7981d7159De374c378Be0815DC4257b50468").setPureTokensRate(0.5e18);
  ```
  - **Example Rate Explanation:** Setting `pureTokensRate` to `0.5e18` means that if a user claims 1 FNX as veFNX, they will receive `0.5` pure FNX.
  
  `pureTokensRate = 0`, = disable oportunity to claim FNX in pure form

  `pureTokensRate = 1e18` = means that if a user is allocated 100 FNX, he can claim 100 pure FNX
  
  `pureTokensRate = 0.25e18` = means that if a user is allocated 100 FNX, he can claim 25 FNX in pure form
### Upgrade Process
On the `ProxyAdmin` contract, update the implementation for all the contracts listed below to the latest version by calling the `upgrade` function on the `ProxyAdmin` contract.

- **[ProxyAdmin](https://blastscan.io/address/0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5)** - `0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`

#### ABI for Upgrade Method
```json
[
  {
    "inputs": [
      {
        "internalType": "contract ITransparentUpgradeableProxy",
        "name": "proxy",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "implementation",
        "type": "address"
      }
    ],
    "name": "upgrade",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

### Contracts to Upgrade to the Latest Implementation

| Name                        | Target Contract (Proxy)                    | New Implementation                      |
|-----------------------------|--------------------------------------------|-----------------------------------------|
| BlastGovernorUpgradeable           | `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1` | `0x2A22fC295cf3771015e18c08F37A5D65E313349d` |
| BlastRebasingTokensGovernorUpgradeable | `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F` | `0x45882278Dc8D8DD2199aED9905A825C5acED2902` |
| VeFnxSplitMerklAidropUpgradeable      | `0x311F7981d7159De374c378Be0815DC4257b50468` | `0xa1d61F8893dc1341Af9ce6F2289cEe869a220153` |
| VoterUpgradeable      | `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B` | `0xc6552a3E87b416FBE211b91cE1A7886336f20456` |
| VotingEscrowUpgradeable      | `0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9` | `0x8AE906Ca9FCEF9FB07f436371F4dA9BA28f86C0F` |
| RewardAPIUpgradeable      | `0xD678DB8fA490323664309e645390b6D8ee327FfE` | `0x256Eb6dE4cA0ac5CC952D773c93F1AB7f5064B1E` |
| VeNFTAPIUpgradeable     | `0x68bFab63a78f444afFF59B006a2163c221CDEd71` | `0x38Fec988ebCd4159d655295Aa37C321382dBb766` |

### Example
To upgrade `BlastGovernorUpgradeable`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`, `0x2A22fC295cf3771015e18c08F37A5D65E313349d`)
```
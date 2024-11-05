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
| VeFnxSplitMerklAidropUpgradeable      | `0x311F7981d7159De374c378Be0815DC4257b50468` | `0x1D099397B2049Ce63eE051801E5A774A4E60F6cd` |
| VoterUpgradeable      | `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B` | `0x932C74DD5504D94AaF5d62195966E00F6d897364` |

### Example
To upgrade `VeFnxSplitMerklAidropUpgradeable`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0x311F7981d7159De374c378Be0815DC4257b50468`, `0x1D099397B2049Ce63eE051801E5A774A4E60F6cd`)
```
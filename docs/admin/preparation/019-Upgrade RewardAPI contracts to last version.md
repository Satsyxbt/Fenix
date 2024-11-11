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
| RewardAPIUpgradeable      | `0xD678DB8fA490323664309e645390b6D8ee327FfE` | `0xd45d0795a2918669a44CcbE1398d3af70Acb5699` |

### Example
To upgrade `RewardAPIUpgradeable`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0xD678DB8fA490323664309e645390b6D8ee327FfE`, `0xd45d0795a2918669a44CcbE1398d3af70Acb5699`)
```
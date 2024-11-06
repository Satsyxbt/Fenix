### Step 1. Upgrade Minter contract to last version
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
| MinterUpgradeable      | `0xa4FF6fe53212e8da028e0a34819006A26615D9f8` | `0x081d528D4dc4a2f3424C6Bdde43F950007cEe944` |


### Example
To upgrade `MinterUpgradeable`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0xa4FF6fe53212e8da028e0a34819006A26615D9f8`, `0x081d528D4dc4a2f3424C6Bdde43F950007cEe944`)
```

### Step 2. Shift first emisison distribution on one week
To shift emisison distribution on `MinterUpgradeable` contract, call `shiftStartByOneWeek()` method, from `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`

- **[MinterUpgradeable](https://blastscan.io/address/0xa4FF6fe53212e8da028e0a34819006A26615D9f8)** - `0xa4FF6fe53212e8da028e0a34819006A26615D9f8`

### Example

```solidity
MinterUpgradeable(`0xa4FF6fe53212e8da028e0a34819006A26615D9f8`).shiftStartByOneWeek()
```
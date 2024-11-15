### Step 1. Upgrade Process
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

#### Contracts to Upgrade to the Latest Implementation

| Name                        | Target Contract (Proxy)                    | New Implementation                      |
|-----------------------------|--------------------------------------------|-----------------------------------------|
| Voter      | `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B` | `0xb9C4C2b2c978c39DA4d870cbA1D71b457FAAafAB` |

### Example
To upgrade `Voter`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`, `0xb9C4C2b2c978c39DA4d870cbA1D71b457FAAafAB`)
```


### Step 2. Pause votings proccess (vote/reset/poke/dettach/attach)
On the `Voter` contract, call `setVotingPause(true)` to pause any actions regarding vote proccess;
- **[Voter](https://blastscan.io/address/0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B)** - `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`


### Step 3. Fix vote calculation
On the `Voter` contract, call `fixVotePower()` to recalculate vote power and distribution;
- **[Voter](https://blastscan.io/address/0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B)** - `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`

### Example
```solidity
Voter(0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B).fixVotePower()
```


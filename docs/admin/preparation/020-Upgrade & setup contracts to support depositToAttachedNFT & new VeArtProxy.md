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
| VoterUpgradeable      | `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B` | `0xA709D35d4192B9e055B132a3316a38765dA87c2D` |
| VotingEscrowUpgradeable      | `0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9` | `0xb83B559BfdD062feC4A0B2db6A938E7B25d08407` |
| ManagedNFTManagerUpgradeable      | `0x1A24B4bD1F8BE73098342167Cb3fE63FD1EaC42B` | `0x5db6c3B0F80D28ca0c4b96167C5957c44561171d` |

### Example
To upgrade `VoterUpgradeable`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`, `0xA709D35d4192B9e055B132a3316a38765dA87c2D`)
```

### Step 2. Setup new VeArtProxy address
On the `VotingEscrowUpgradeable` contract, call `updateAddress` for update 'artProxy' with new address `0xafDC3756E08305Cb4F856B3511A72eD5D50d5b11`

- **[VotingEscrowUpgradeable](https://blastscan.io/address/0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9)** - `0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9`

### Example
To setup artProxy call:
```solidity
VotingEscrowUpgradeable(`0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9`).updateAddress("artProxy", `0xafDC3756E08305Cb4F856B3511A72eD5D50d5b11`)
```
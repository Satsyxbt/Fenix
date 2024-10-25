# Instructions for Completing Contract Upgrade and Parameter Setup

Please follow the steps in the specified order.

## 1. Upgrade Contracts to the Latest Version

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
| MinterUpgradeable           | `0xa4FF6fe53212e8da028e0a34819006A26615D9f8` | `0x0FafA9074aBf128db1467af2FC592815b14508cd` |
| FeesVaultFactoryUpgradeable | `0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB` | `0x17409D1648422596B447BC3FcEE92a5f291e4604` |
| PairFactoryUpgradeable      | `0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f` | `0x0b3F38F9a1C62065234e234Ac8a9Edc6743563E9` |

### Example
To upgrade `MinterUpgradeable`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0xa4FF6fe53212e8da028e0a34819006A26615D9f8`, `0x0FafA9074aBf128db1467af2FC592815b14508cd`)
```

## 2. Configure Contract Parameters

### MinterUpgradeable

**Caller Address**: `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`

#### Increase FNX Total Supply to 75,000,000
On the [`MinterUpgradeable`](https://blastscan.io/address/0xa4FF6fe53212e8da028e0a34819006A26615D9f8) contract, call the `patchInitialSupply()` function.

**Details**:
- **67,500,000 FNX** will be transferred to the caller: `0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5`
- The weekly initial emission will be increased to **2,250,000 FNX** from **225,000 FNX**

* **ABI:**
```json
[
  {
    "inputs": [],
    "name": "patchInitialSupply",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

#### Update Voter & VotingEscrow Addresses
1. On the [`MinterUpgradeable`](https://blastscan.io/address/0xa4FF6fe53212e8da028e0a34819006A26615D9f8) contract, call the `setVoter()` function with the updated Voter address: `0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`.

2. On the [`MinterUpgradeable`](https://blastscan.io/address/0xa4FF6fe53212e8da028e0a34819006A26615D9f8) contract, call the `setVotingEscrow()` function with the updated VotingEscrow address: `0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9`.

* **ABI:**
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "__voter",
        "type": "address"
      }
    ],
    "name": "setVoter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "votingEscrow_",
        "type": "address"
      }
    ],
    "name": "setVotingEscrow",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

##### Example
```solidity
MinterUpgradeable_Proxy(`0xa4FF6fe53212e8da028e0a34819006A26615D9f8`).setVoter(`0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B`);
MinterUpgradeable_Proxy(`0xa4FF6fe53212e8da028e0a34819006A26615D9f8`).setVotingEscrow(`0xC900C984a3581EfA4Fb56cAF6eF19721aAFbB4f9`);
```

### PairFactoryUpgradeable

**Caller Address**: `0xED8276141873621c18258D1c963C9F5d4014b5E5`

#### Update Implementation for Future Pairs

**Note, Important**: If partners integrating with `PairFactory` use calculations to determine the pool address instead of making a call, notify them to switch to calling `PairFactoryUpgradeable.getPair()` to retrieve the pool address.

On the [`PairFactoryUpgradeable`](https://blastscan.io/address/0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f) contract, call the `upgradePairImplementation()` function with the latest Pair implementation address: `0xca56B2c3F46C95b301B0c830283c065c2bF9D4bb`

* **ABI:**
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "implementation_",
        "type": "address"
      }
    ],
    "name": "upgradePairImplementation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

##### Example
```solidity
PairFactoryUpgradeable(`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`).upgradePairImplementation(`0xca56B2c3F46C95b301B0c830283c065c2bF9D4bb`);
```

#### Set Centralized Rebase Tokens Governor
On the [`PairFactoryUpgradeable`](https://blastscan.io/address/0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f) contract, call the `setRebasingTokensGovernor()` function with the current `BlastRebasingTokensGovernorUpgradeable_Proxy` address: `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`

* **ABI:**
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "rebasingTokensGovernor_",
        "type": "address"
      }
    ],
    "name": "setRebasingTokensGovernor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

##### Example
```solidity
PairFactoryUpgradeable(`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`).setRebasingTokensGovernor(`0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`);
```

#### Set Default Blast Governor
On the [`PairFactoryUpgradeable`](https://blastscan.io/address/0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f) contract, call the `setDefaultBlastGovernor()` function with the current `BlastGovernorUpgradeable_Proxy` address: `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`

* **ABI:**
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "defaultBlastGovernor_",
        "type": "address"
      }
    ],
    "name": "setDefaultBlastGovernor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

##### Example
```solidity
PairFactoryUpgradeable(`0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`).setDefaultBlastGovernor(`0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`);
```

### FeesVaultFactoryUpgradeable

**Caller Address**: `0xED8276141873621c18258D1c963C9F5d4014b5E5`

#### Set Centralized Rebase Tokens Governor
On the [`FeesVaultFactoryUpgradeable`](https://blastscan.io/address/0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB) contract, call the `setRebasingTokensGovernor()` function with the current `BlastRebasingTokensGovernorUpgradeable_Proxy` address: `0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`

* **ABI:**
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "rebasingTokensGovernor_",
        "type": "address"
      }
    ],
    "name": "setRebasingTokensGovernor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

##### Example
```solidity
FeesVaultFactoryUpgradeable(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).setRebasingTokensGovernor(`0x71B83044626c8F6Ef38F051673562Fe025F8ec1F`);
```

#### Set Default Blast Governor
On the [`FeesVaultFactoryUpgradeable`](https://blastscan.io/address/0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB) contract, call the `setDefaultBlastGovernor()` function with the current `BlastGovernorUpgradeable_Proxy` address: `0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`

* **ABI:**
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "defaultBlastGovernor_",
        "type": "address"
      }
    ],
    "name": "setDefaultBlastGovernor",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

##### Example
```solidity
FeesVaultFactoryUpgradeable(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).setDefaultBlastGovernor(`0x72e47b1eaAAaC6c07Ea4071f1d0d355f603E1cc1`);
```

#### Update Implementation for FeesVault
On the [`FeesVaultFactoryUpgradeable`](https://blastscan.io/address/0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB) contract, call the `changeImplementation()` function with the latest `FeesVault` implementation address: `0x29fb7E517B60322E5330eB58a5f4152BB4DdF018`

* **ABI:**
```json
[
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "implementation_",
        "type": "address"
      }
    ],
    "name": "changeImplementation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]
```

##### Example
```solidity
FeesVaultFactoryUpgradeable(`0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`).changeImplementation(`0x29fb7E517B60322E5330eB58a5f4152BB4DdF018`);
```
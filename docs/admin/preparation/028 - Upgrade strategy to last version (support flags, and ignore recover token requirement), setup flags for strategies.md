### Step 1. Upgrade ManagedNFTManager to last version
On the `ProxyAdmin` contract, update the implementation for all the contracts listed below to the latest version by calling the `upgrade` function on the `ProxyAdmin` contract.

- **[ProxyAdmin](https://blastscan.io/address/0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5)** - `0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`

#### Contracts to Upgrade to the Latest Implementation

| Name                        | Target Contract (Proxy)                    | New Implementation                      |
|-----------------------------|--------------------------------------------|-----------------------------------------|
| ManagedNFTManager      | `0x1A24B4bD1F8BE73098342167Cb3fE63FD1EaC42B` | `0xA22bd1a538eED9C6914874DeEdc7033aCF8FFbBA` |


### Example
To upgrade `Voter`, call:
```solidity
ProxyAdmin(`0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5`).upgrade(`0x1A24B4bD1F8BE73098342167Cb3fE63FD1EaC42B`, `0xA22bd1a538eED9C6914874DeEdc7033aCF8FFbBA`)
```

## Step 2. Upgrade CompoundVeFNXManagedNFTStrategies implementation to last version

**IMPORTANT: be sure you can perform step 3 afterwards to minimize any issues on FE (Statis Rpc calls) for users**

To upgrade, call `changeStrategyImplementation(address strategyImplementation_)` on `CompoundVeFNXManagedNFTStrategyFactoryUpgradeable` contract 0xdb60b6cEB16dB04db0A6Fe85b1fE868FFdA20660 (https://blastscan.io/address/0xdb60b6cEB16dB04db0A6Fe85b1fE868FFdA20660#writeProxyContract#F1), with params: 


## Example
```solidity
CompoundVeFNXManagedNFTStrategyFactoryUpgradeable(`0xdb60b6cEB16dB04db0A6Fe85b1fE868FFdA20660`).changeStrategyImplementation(`0x57c44E554C9862107941b122afca35beb0B77b0f`)
```


## Step 3. Apply upgrade changes instantly to avoid any static failures
Contracts follow the pattern of a specific proxy that will not update the implementation until there is a transaction, so to make everything okay, you need to call this transaction:

Call `multiUpgradeCall(address[] calldata targets_)` on `UtilsUpgradeable` (https://blastscan.io/address/0x0c39cC69DD9f0a06360be1E8d46565eC24Ad7A4F)contract with specify all nest strategies addresses


Strategies list: `[0xa99abd8aFAb7c16F17F8304BC2f0017c3d2eb2A0,0xf18C326C141cFdC92Eb65fBaeF304CFF65F5dD75,0x47f2f5636cD2B8DEA65dB7b952321c37C18E9aAe,0xEb5F2f75b16ABe19C84A12Fe56e2dbc93809CF98,0x7C1d57f7Fb727268ee50A9031538535e3259E7F7,0x85485ED82471F4FCEd63D93814c7058223771B75,0x4d61Ec7a87cEF2b4D397dCA096C17d9a28367242,0xEfCcC9d42b243da8736988170A9995bb28D52b93,0xFc6bd87C5aa8e4F1fa74f0A9cBD5f2C3F5687b77,0x1fBa9E9F6176001a9F704D03ccA5aE7Ba3E4E7c4,0x4eC8BaAA2E7690C2400b1a38130fDa5bAA16c42E,0x24c030FDf53aE2A45fCC1221Bf2188C1Eb10b4a5,0x227Fb8e802055399F2C3f9a7B16C540411ab5053,0xAC67a4fEE66f1a696d33Bcb424688C6eDA2530b8,0xbf58B76Ff5e3337EfAb7c83C931Ea122541B71e3,0x0478E6Cbb15ED87E57038DA9fc43eE56B62E6A57,0x3Eb0cb4afe709f92040d78fd41166c9Ca009aff8,0xD6243922F3d1f40f4688DE748Ff5a3A2223EDFCB,0x80B2cB9Ad3f5Cfa59609B5fc0dDD0128b9603813]`

### Example
```solidity
UtilsUpgradeable(`0x0c39cC69DD9f0a06360be1E8d46565eC24Ad7A4F`).multiUpgradeCall([0xa99abd8aFAb7c16F17F8304BC2f0017c3d2eb2A0,0xf18C326C141cFdC92Eb65fBaeF304CFF65F5dD75,0x47f2f5636cD2B8DEA65dB7b952321c37C18E9aAe,0xEb5F2f75b16ABe19C84A12Fe56e2dbc93809CF98,0x7C1d57f7Fb727268ee50A9031538535e3259E7F7,0x85485ED82471F4FCEd63D93814c7058223771B75,0x4d61Ec7a87cEF2b4D397dCA096C17d9a28367242,0xEfCcC9d42b243da8736988170A9995bb28D52b93,0xFc6bd87C5aa8e4F1fa74f0A9cBD5f2C3F5687b77,0x1fBa9E9F6176001a9F704D03ccA5aE7Ba3E4E7c4,0x4eC8BaAA2E7690C2400b1a38130fDa5bAA16c42E,0x24c030FDf53aE2A45fCC1221Bf2188C1Eb10b4a5,0x227Fb8e802055399F2C3f9a7B16C540411ab5053,0xAC67a4fEE66f1a696d33Bcb424688C6eDA2530b8,0xbf58B76Ff5e3337EfAb7c83C931Ea122541B71e3,0x0478E6Cbb15ED87E57038DA9fc43eE56B62E6A57,0x3Eb0cb4afe709f92040d78fd41166c9Ca009aff8,0xD6243922F3d1f40f4688DE748Ff5a3A2223EDFCB,0x80B2cB9Ad3f5Cfa59609B5fc0dDD0128b9603813]);
```
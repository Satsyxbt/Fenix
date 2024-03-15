# Deployed Addresses List

Last updated date: **15.03.2024**


## Addresses
- `0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30` - Deployer
- `0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30` - BlastPoints operator

External:
- `0x4300000000000000000000000000000000000004` - WETH
- `0x4300000000000000000000000000000000000003` - USDB
- `0x4300000000000000000000000000000000000002` - BLAST
- `0x2536FE9ab3F511540F2f9e2eC2A805005C3Dd800` - BlastPoints
- `0x8bb4c975ff3c250e0ceea271728547f3802b36fd` - Merkle Distribution Creator
  
## Core
| Contract Name         | Address                                  | Short Description              | Type         |
|-----------------------|------------------------------------------|--------------------------------|--------------|
| Fenix                 | `0x52f847356b38720B55ee18Cb3e094ca11C85A192` | Main token contract            | Default      |
| ProxyAdmin            | `0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5` | Manages proxy contracts        | Default      |
| BribeFactory          | `0x0136d0b6E3a3fA7fabCb809fc1697a89D451f97f` | Factory for bribe contracts    | Upgradeable  |
| PairFactory           | `0x6E5A858a65AF18BC85935944E6BaE9A97ee2f59c` | Factory for v2 pair contracts  | Upgradeable  |
| Voter                 | `0xf35065A60fA9C1faf6fCCa28522c932cB9468D80` | Voting contract                | Upgradeable  |
| VotingEscrow          | `0x99988De25e33A2CAF1B8d0A13fa67558059dd937` | Lock tokens for voting         | Upgradeable  |
| VeArtProxy            | `0xdc24C85A65580fF0d6c9178534e98ac4C8eCE8f8` | Proxy for art tokens           | Upgradeable  |
| Minter                | `0xa4FF6fe53212e8da028e0a34819006A26615D9f8` | FNX Emission manager           | Upgradeable  |
| FeesVaultFactory      | `0xC202E30A55a85FdD00270D033AaE8CF9D44612C2` | Factory for fees vaults        | Default      |
| RouterV2              | `0xc1792D8C5ec987f2E801A8B39D87DF569118F605` | Router for token swaps         | Default      |
| MerklGaugeMiddleman   | `0x0145C48FC4c0BB3034f332B3171124d607D6Bd2C` | Middleman for Merkl integration | Default      |
| GaugeFactoryType      | `0xbe30369717700A2C5Ab87B79C696476F0e8C68a5` | Gauge Factory for Gauges Type 1 (v2) | Upgradeable |
| GaugeFactoryType2     | `0xDa8eBD4f13bBD89EFA70Fa522612f3A1ba6b2756` | Gauge Factory for Gauges Type 2 (ICHI) | Upgradeable |
| GaugeFactoryType3     | `0xd6e1a5154D0d4B26e7F8d14dcFd715287aEeDAf5` | Gauge Factory for Gauges Type 3 (v3) | Upgradeable |



## Implementations for Proxy

| Contract Name                | Address                                  | Short Description                |
|------------------------------|------------------------------------------|----------------------------------|
| MinterImplementation         | `0x014e818AA9C222F9D8e1c2EF6A7da2f6D6bd10b3` | Implementation for minter        |
| VeArtProxyImplementation     | `0x3eD36254b340B39c5150fBc97e1d96593Aa38770` | Implementation for art proxy     |
| VoterImplementation          | `0x015FD12D47241DC6766315fB033b8DE7D043e705` | Implementation for voter         |
| VotingEscrowImplementation   | `0x77B485433DB4cf314929A36DC3c3601c579091B6` | Implementation for voting escrow |
| VeFnxDistributorImplementation | `0x3c772ee7Ab45BD106f6af53DE20548df58C3829d` | Implementation for distribution  |
| BribeFactoryImplementation   | `0xA2E5cd7D56d4e97614c6e0fBB708a8ecaA7437e3` | Implementation for bribe factory |
| BribeImplementation          | `0xBB3A43D792cDCB3d810c0e500c21bD958686B90b` | Implementation for bribes        |
| GaugeFactoryImplementation   | `0xAfBA5614db7d3708c61a63B23E53c37217e52f82` | Implementation for gauge factory |
| GaugeImplementation          | `0x5f95aF3EE7cA36Eea7D34dEe30F3CaCbBCe7D657` | Implementation for gauges        |
| PairFactoryImplementation    | `0x6349fAb8624a0fF654a91C7B0bd4A55A1E1Dc957` | Implementation for pair factory  |
| PairImplementation           | `0xDa902D5763BcF82218FDeB7DF32Ec91ab989A7eE` | Implementation for pairs         |
| FeesVaultImplementation      | `0x5CAD868fb930d733B407211a1F15D65635964A19` | Implementation for fees vault    |


## Settings
### Ownership

| Contract Name           | Type          | Current Authorized Addresses                        |
|-------------------------|---------------|-----------------------------------------------------|
| Fenix                   | Ownable       | Minter                                              |
| ProxyAdmin              | Ownable       | Deployer                                            |
| BribeFactory            | Ownable       | Deployer                                            |
| PairFactory             | AccessControl | Admin, PairAdministrator, PairsCreator, FeesManager - Deployer |
| Voter                   | Custom        | team, admin, governance - Deployer                  |
| VotingEscrow            | Custom        | team - Deployer                                     |
| Minter                  | Ownable2Step  | Deployer                                            |
| FeesVaultFactory        | Ownable       | Deployer                                            |
| MerklGaugeMiddleman     | Ownable       | Deployer                                            |
| GaugeFactoryType        | Ownable       | Deployer                                            |
| GaugeFactoryType2       | Ownable       | Deployer                                            |
| GaugeFactoryType3       | Ownable       | Deployer   


### Blast governor

| Contract Name            | Current Gas Mode  | BlastGovernor Address |
|--------------------------|---------------|----------------|
| Minter                   | Claimable     | Deployer       |
| VotingEscrow             | Claimable     | Deployer       |
| Voter                    | Claimable     | Deployer       |
| BribeFactory             | Claimable     | Deployer       |
| GaugeFactoryType         | Claimable     | Deployer       |
| GaugeFactoryType2        | Claimable     | Deployer       |
| GaugeFactoryType3        | Claimable     | Deployer       |
| PairFactory              | Claimable     | Deployer       |
| Fenix                    | Claimable     | Deployer       |
| FeesVaultFactory         | Claimable     | Deployer       |
| MerklGaugeMiddleman      | Claimable     | Deployer       |
| RouterV2                 | Claimable     | Deployer       |


### Other settings
#### General
1. `Creating a gauge` - restricted
2. `Creating pair v2` - restricted
3. `Minting and emission proccess` - **not started**
4. `Default BlastGovernor for v2 pairs` - Deployer
5. `Default BlastPoints operator for v2 pairs` - Deployer

#### Dex v2
- `volatileFee: 18`
- `stableFee: 4`
- `fee to FeesVault` - `100%`
  
#### FeesVault creators
- `0x77f6637d2279b1c122d13DC92aAcb7fF168ff959` - `true` - AlgebraV3Factory
- `0x6E5A858a65AF18BC85935944E6BaE9A97ee2f59c` - `true` - PairFactory


#### Default rebase token config for v2 pairs
- `0x4300000000000000000000000000000000000004` - `WETH` - Claimable mode
- `0x4300000000000000000000000000000000000003` - `USDB` - Claimable mode


#### Gauge types
- `0` - **Dex v2 pair**
  - `pairFactory` - `0x6E5A858a65AF18BC85935944E6BaE9A97ee2f59c` 
  - `gaugeFactory` - `0xbe30369717700A2C5Ab87B79C696476F0e8C68a5` - GaugeFactory Type 1
- `1` - **ICHI**
  - `pairFactory` - `0x77f6637d2279b1c122d13DC92aAcb7fF168ff959` 
  - `gaugeFactory` - `0xDa8eBD4f13bBD89EFA70Fa522612f3A1ba6b2756` - GaugeFactory Type 2
  - `distribute by merkl` - `true`
- `2` - **Dex v3 pools**
  - `pairFactory` - `0x77f6637d2279b1c122d13DC92aAcb7fF168ff959` 
  - `gaugeFactory` - `0xd6e1a5154D0d4B26e7F8d14dcFd715287aEeDAf5` - GaugeFactory Type 3
  - `distribute by merkl` - `true`
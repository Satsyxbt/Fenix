# Deployed Addresses List

Last updated date: **18.03.2024**

## Addresses
- `0x9140D359f2855E6540609dd4A93773ED1f45f509` - Deployer
- `0x9140D359f2855E6540609dd4A93773ED1f45f509` - BlastPoints operator

External:
- `0x4200000000000000000000000000000000000023` - WETH
- `0x4200000000000000000000000000000000000022` - USDB
- `0x4300000000000000000000000000000000000002` - BLAST
- `0x2fc95838c71e76ec69ff817983BFf17c710F34E0` - BlastPoints
- `0xf76Ac08eCd91fa84D7093F52dCD09EF3AE5a5a42` - **Mock** Merkle Distribution Creator

## Core

| Contract Name         | Address                                  | Short Description              | Type         |
|-----------------------|------------------------------------------|--------------------------------|--------------|
| Fenix                        | `0xA12E4649fdDDEFD0FB390e4D4fb34fFbd2834fA6` | Main token contract            | Default      |
| ProxyAdmin                   | `0x9502993595815b1Fa674C5133F42C3919a696bEc` | Manages proxy contracts        | Default      |
| BribeFactory                 | `0x4044d19418d30FFE4eE6900C2AD83F57225fE387` | Factory for bribe contracts    | Upgradeable  |
| PairFactory                  | `0xe19D414E2A994D21d2b2c495812fBf4fdA38558f` | Factory for v2 pair contracts  | Upgradeable  |
| Voter                        | `0x81a2d913B4eF510f241a3F0522B7727Cf3189135` | Voting contract                | Upgradeable  |
| VotingEscrow                 | `0x4dD9e7dd344a309030B22d36A567f0d99C6a5403` | Lock tokens for voting         | Upgradeable  |
| VeArtProxy                   | `0xF959E9af422217796CdF3BAc405e38AA1C922143` | Proxy for art tokens           | Upgradeable  |
| Minter                       | `0xDA283872Fc205f56cE5b0268D719373dc33e35dA` | FNX Emission manager           | Upgradeable  |
| FeesVaultFactory             | `0xabc03eF501C3eeF03Bb0a1338653A8DfF7f1e36E` | Factory for fees vaults        | Default      |
| RouterV2                     | `0x58DA44Da9af06d43378440549cEd8712125D49B5` | Router for token swaps         | Default      |
| MerklGaugeMiddleman          | `0x6cA5683422A1A5A854e213120E8bd72cB2FdDf85` | Middleman for Merkl integration | Default      |
| GaugeFactoryType             | `0x64569E85d807DC7Ce8D44d14A156976C72e7e145` | Gauge Factory for Gauges Type 1 (v2) | Upgradeable |
| GaugeFactoryType2            | `0x6CfEF9Fce688682f05D111b990a3EBC41DeC9f70` | Gauge Factory for Gauges Type 2 (ICHI) | Upgradeable |
| GaugeFactoryType3            | `0x0E284f3D945498F4C69ccb68e4529b9EED79d333` | Gauge Factory for Gauges Type 3 (v3) | Upgradeable |




## Implementations for Proxy

| Contract Name                | Address                                  |
|------------------------------|------------------------------------------|
| MinterImplementation         | `0x30448e49743c55af3C83d2A7011df36E0438F0Ae` |
| VeArtProxyImplementation     | `0x716D5F63654F1F072e7DFAB8190D03FbFf4213BD` |
| VoterImplementation          | `0x24a4f8816e5de9a6840bD4f542f5b55c29CEc3F7` |
| VotingEscrowImplementation   | `0x68fd5aD741597ccCd510BFb526E0ef3f03787F9C` |
| VeFnxDistributorImplementation | `0x6CB746214D07a894Dfd4306FD509265B5b64baD7` |
| BribeFactoryImplementation   | `0xdb83A57274B4D839C363e1C8827518979F7C160e` |
| BribeImplementation          | `0x2E110B8a6C0a4f6df49344fD3d7b2Bb796E4cF4a` |
| GaugeFactoryImplementation   | `0xF69C1f4D10B1016F3519C8514b86080d84e7f5A0` |
| GaugeImplementation          | `0x1c3795CbF09ff0eE0b5bA5Aa160ed3c23028e2Bc` |
| PairFactoryImplementation    | `0x50342C7AE6Edd78aE1837B6345ccA837D5FF80f5` |
| PairImplementation           | `0xfE4752F1980aBF493ee3dc335096d5e319DE5B0b` |
| FeesVaultImplementation      | `0x405518aDC7cecE6c0E8e2929138e7b4531Cc72F1` |

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
| GaugeFactoryType3       | Ownable       | Deployer                                            | 

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

## Setup
* `0xf76Ac08eCd91fa84D7093F52dCD09EF3AE5a5a42` - Mock Merkl Distribution Creator
* `Minter:start()` - The emission mechanism has been launched
* `Creating a gauge` - restricted
* `Creating pair v2` - restricted
* `Default BlastGovernor for v2 pairs` - Deployer
* `Default BlastPoints operator for v2 pairs` - Deployer

#### Dex v2
- `volatileFee: 18`
- `stableFee: 4`
- `fee to FeesVault` - `100%`


#### FeesVault creators
- `0xE3b3CcDaC95f83602FeE385Caf8C8cA037bBCA16` - `true` - AlgebraV3Factory
- `0xe19D414E2A994D21d2b2c495812fBf4fdA38558f` - `true` - PairFactory

#### Default rebase token config for v2 pairs
- `0x4200000000000000000000000000000000000023` - `WETH` - Claimable mode
- `0x4200000000000000000000000000000000000022` - `USDB` - Claimable mode

#### Gauge types
- `0` - **Dex v2 pair**
  - `pairFactory` - `0xe19D414E2A994D21d2b2c495812fBf4fdA38558f` 
  - `gaugeFactory` - `0x64569E85d807DC7Ce8D44d14A156976C72e7e145` - GaugeFactory Type 1
- `1` - **ICHI**
  - `pairFactory` - `0xE3b3CcDaC95f83602FeE385Caf8C8cA037bBCA16` 
  - `gaugeFactory` - `0x6CfEF9Fce688682f05D111b990a3EBC41DeC9f70` - GaugeFactory Type 2
  - `distribute by merkl` - `true`
- `2` - **Dex v3 pools**
  - `pairFactory` - `0xE3b3CcDaC95f83602FeE385Caf8C8cA037bBCA16` 
  - `gaugeFactory` - `0x0E284f3D945498F4C69ccb68e4529b9EED79d333` - GaugeFactory Type 3
  - `distribute by merkl` - `true`
  

## Test & Mocks

### Tokens
- `0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a` - fnUSDT
- `0x9Fe9D260262331807D0aa0fb06Fda1fa1b5E2ce5` - fnTOK

### Pairs
- Pair V2 `fnUSDT/fnTOK, Stable`
- Pair V2 `FNX/fnTOK, Stable`
- Pair V2 `FNX/fnUSDT, Stable`
- Pair V2 `FNX/fnTOK, Volatility`
- Pair V2 `fnTOK/fnUSDT, Volatility`

- Pool v3 `FNX/fnUSDT`
- Pool v3 `FNX/fnTOK`


### Gauges
- Gauge for `Pair V2 FNX/fnTOK, Volatility`
- Gauge for `Pair V2 fnUSDT/fnTOK, Stable`
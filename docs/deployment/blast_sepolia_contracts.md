# Deployed Addresses List

Last updated date: **31.03.2024**

## Addresses
- `0x9140D359f2855E6540609dd4A93773ED1f45f509` - Deployer
- `0x5888eEe48C0173681109Be60396D75bA2c02f632` - BlastPoints operator

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
| PairFactory                  | `0x514AeBB1526a08DB1dB97616F281fa30F7FAB6B3` | Factory for v2 pair contracts  | Upgradeable  |
| Voter                        | `0x6cCe3E45CCe11bE2CD4715442b0d1c3675C5D055` | Voting contract                | Upgradeable  |
| VotingEscrow                 | `0x4dD9e7dd344a309030B22d36A567f0d99C6a5403` | Lock tokens for voting         | Upgradeable  |
| VeArtProxy                   | `0xF959E9af422217796CdF3BAc405e38AA1C922143` | Proxy for art tokens           | Upgradeable  |
| Minter                       | `0xDA283872Fc205f56cE5b0268D719373dc33e35dA` | FNX Emission manager           | Upgradeable  |
| FeesVaultFactory             | `0xa3103248290399cc2655b68f0038ce590ce8639E` | Factory for fees vaults        | Upgradeable      |
| RouterV2                     | `0xAC0D01f49798426d2cDff417835a3feA80B9e698` | Router for token swaps         | Default      |
| MerklGaugeMiddleman          | `0x6cA5683422A1A5A854e213120E8bd72cB2FdDf85` | Middleman for Merkl integration | Default      |
| GaugeFactoryType             | `0x1abD24d6ea95BC2ea78e5BE16608B8068F0324D8` | Gauge Factory for Gauges Type 1 (v2) | Upgradeable |
| GaugeFactoryType2            | `0x0cC86Eb2dFB324cd7bFcAdA7F7819Ad72a059F0A` | Gauge Factory for Gauges Type 2 (ICHI) | Upgradeable |
| GaugeFactoryType3            | `0xD6Fe1FCb8f8F231Ce6dBF332e697E798bEC6fa79` | Gauge Factory for Gauges Type 3 (v3) | Upgradeable |
| VeBoost                      | `0x23b400098864300B3c2EB40255559c750109f24c` | VeBoost                              | Upgradeable |
| AlgebraFNXPriceProvider      | `0x968106c45b72eB84A1Abc799CC4AaFf618495c76` | AlgebraFNXPriceProvider              | Upgradeable |
| VeFnxDistributor | `0x3B23472ad7134508cb24DAB353Cfb7097D33C706` |   FNX Distributor in veFNX NFT | Upgradeable|
| rFNX | `0x0CBc34cDd5d177c813068fD01D11B419D794eE96` | rFNX with convert to FNX & veFNX | Default |
| FenixRaise                      | `0x1e3c17b0195fE019C46b62ED293Ad8F431bf676A` | Fenix Raise contract | Upgradeable |

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
| PairFactoryImplementation    | `0xb99EBAcaED6C0B5292E31653f5470F033bB28e1d` |
| PairImplementation           | `0x9AF9988701d106CB576D36B4c36C72519214a7Ac` |
| FeesVaultImplementation      | `0xC27CaC5A9e874b7E8dBE32Bc7b9bFc8451420707` |
| VeBoostImplementation        | `0x1EdaC08F0B5a60110Bebab6977afB9ACBe65C0C9` |
| AlgebraFNXPriceProviderImplementation  | `0x1AE69A793A4e20997dd76a51D909859ca869482C` |
| FenixRaiseUpgradeableImplementation  | `0x8E6B23Ce25454CFc88a27babac4e7F82Db8dd676` |

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
| FeesVaultFactory        | AccessControl | Deployer                                            |
| MerklGaugeMiddleman     | Ownable       | Deployer                                            |
| GaugeFactoryType        | Ownable       | Deployer                                            |
| GaugeFactoryType2       | Ownable       | Deployer                                            |
| GaugeFactoryType3       | Ownable       | Deployer                                            | 
| VeFnxDistributor       | Ownable       | Deployer                                            | 
| VeBoost       | Ownable       | Deployer                                            | 
| rFNX       | Ownable2Step       | Deployer                                            | 
| FenixRaise       | Ownable2Step       | Deployer                                            | 

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
| VeBoost                  | Claimable     | Deployer       |
| AlgebraFNXPriceProvider  | Claimable     | Deployer       |
| VeFnxDistributor         | Claimable     | Deployer       |
| rFNX | Claimable | Deployer |
| FenixRaise | Claimable | Deployer |

## Setup
* `0xf76Ac08eCd91fa84D7093F52dCD09EF3AE5a5a42` - Mock Merkl Distribution Creator
* `Minter:start()` - The emission mechanism has been launched
* `Creating a gauge` - restricted
* `Creating pair v2` - permissionessly
* `Default BlastGovernor for v2 pairs` - Deployer
* `Default BlastPoints operator for v2 pairs` - `0x5888eEe48C0173681109Be60396D75bA2c02f632`

#### Dex v2
- `volatileFee: 18`
- `stableFee: 4`
- `fee to FeesVault` - `100%`


#### FeesVault creators
- `0x242A0C57EAf78A061db42D913DE7FA4eA648a1Ef` - `true` - AlgebraV3Factory
- `0x514AeBB1526a08DB1dB97616F281fa30F7FAB6B3` - `true` - PairFactory

#### Default rebase token config for v2 pairs
- `0x4200000000000000000000000000000000000023` - `WETH` - Claimable mode
- `0x4200000000000000000000000000000000000022` - `USDB` - Claimable mode

#### VeBoost
- `Pool price provder` - `0x968106c45b72eB84A1Abc799CC4AaFf618495c76`
- `Min USD for boost` - 10$
- `Boost percentage` - 10%
- `FNX boost supply` - 100_000 FNX for boosting
  
## Test & Mocks
### Tokens
- `0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a` - fnUSDT
- `0x9Fe9D260262331807D0aa0fb06Fda1fa1b5E2ce5` - fnTOK
- `0xF80a52151d69D0552d10751D8C4efAF8ADA8dA6c` - fnxUSDB
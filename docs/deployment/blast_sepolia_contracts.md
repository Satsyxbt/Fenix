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
[[0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a]
[0x7e1C73E1FAED242F7E2882323ca2641e17B7F185]
[0xCE286b104F86733B24c02a5CDA9483176BcE02d6]
[0x4200000000000000000000000000000000000023]
[0x4200000000000000000000000000000000000024]
[0x9Fe9D260262331807D0aa0fb06Fda1fa1b5E2ce5]]
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
| ManagedNFTManager | `0xE905de6ee7252b502170e9105491BFB590Be1388` | Managed NFT Manager | Upgradeable |
| RouterV2PathProvider | `0xf49b7D01E9A5d3331b2995Fc049e9CBF29db0648` | Route provider for buyback functionality | Upgradeable |
| CompoundVeFNXManagedNFTStrategyFactory | `0xA1657A57638694bF2cF777aD534FEd66dA22131F` | Compound strategy factory |Upgradeable |
| rFNX | `0x0CBc34cDd5d177c813068fD01D11B419D794eE96` | rFNX with convert to FNX & veFNX | Default |
| FenixRaise                      | `0x1e3c17b0195fE019C46b62ED293Ad8F431bf676A` | Fenix Raise contract | Upgradeable |
| PerpetualsGauge| `0xD484a5AF8F3a55468E311BdD5aEc4634F2d7E8CC` | _ | Upgradeable|
| PerpetualsTradersRewarder| `0xa7B28975d7eF0fF1D406BE36A7D5E5647Ff469ca` | _ | Upgradeable|
| VeNFTAPI| `0x73D504CF496CFEE25e035de93C7c7535c90f3528` | _ | Upgradeable|
| RewardAPI| `0x33Ac4D2ae35299072C7f20d5bBd4F75f6D0aFe89` | _ | Upgradeable|
| PairAPI| `0x6E96E9e074568151Ee3ECA520849b1FE760d398B` | _ | Upgradeable|
| BlastGovernor| `0xDecA6B7277356F37f0aF44609F8D82DEabD444dB` | _ | Upgradeable|
| VeFnxSplitMerklAidrop| `0x4BcC88B000C02075115275d5BB1e4133Ed1BD068` | _ | Upgradeable|
| MDCBlastMock | `0x384da1d3e1a80a2bD49A3d3E36C74c7b4032dD01` | _ | _ |



## Implementations for Proxy

| Contract Name                | Address                                  |
|------------------------------|------------------------------------------|
| MinterImplementation         | `0x30448e49743c55af3C83d2A7011df36E0438F0Ae` |
| VeArtProxyImplementation     | `0x716D5F63654F1F072e7DFAB8190D03FbFf4213BD` |
| VoterImplementation          | `0x24a4f8816e5de9a6840bD4f542f5b55c29CEc3F7` |
| VotingEscrowImplementation   | `0x68fd5aD741597ccCd510BFb526E0ef3f03787F9C` |
| VeFnxDistributorImplementation | `0x6CB746214D07a894Dfd4306FD509265B5b64baD7` |
| BribeFactoryImplementation   | `0x2f48645cef79dD3cd54cf1eC7Ee318DC17Bf9cEC` |
| BribeImplementation          | `0x941d6dcF1Fe7cf08a2cBc8E65b62047a1645E939` |
| GaugeFactoryImplementation   | `0xF69C1f4D10B1016F3519C8514b86080d84e7f5A0` |
| GaugeImplementation          | `0x1c3795CbF09ff0eE0b5bA5Aa160ed3c23028e2Bc` |
| PairFactoryImplementation    | `0xb99EBAcaED6C0B5292E31653f5470F033bB28e1d` |
| PairImplementation           | `0x9AF9988701d106CB576D36B4c36C72519214a7Ac` |
| FeesVaultImplementation      | `0xC27CaC5A9e874b7E8dBE32Bc7b9bFc8451420707` |
| VeBoostImplementation        | `0x1EdaC08F0B5a60110Bebab6977afB9ACBe65C0C9` |
| AlgebraFNXPriceProviderImplementation  | `0x1AE69A793A4e20997dd76a51D909859ca869482C` |
| SingelTokenVirtualRewarderUpgradeableImplementation  | `0x0B4B20da90b6B4DD6e451682A1b8B5aF30175BCc` |
| CompoundVeFNXManagedNFTStrategyUpgradeableImplementation  | `0x34D15c19210d31d35904CF94e24197F504C5B976` |
| CompoundVeFNXManagedNFTStrategyFactoryUpgradeableImplementation  | `0x3b54C14236EB0758888c19966ac1254B796d7577` |
| ManagedNFTManagerUpgradeableImplementation  | `0x7759097a047e8116603f57260f42037959C12DBE` |
| RouterV2PathProviderUpgradeableImplementation  | `0xAe3cEB9cCCedE499940AD8B01ca57D08F65FeD1D` |
| VoterUpgradeableV1_2Implementation  | `0x9740704ea45740D2c50b2FBC3D7FfeBBDF1dd117` |
| VotingEscrowUpgradeableV1_2Implementation  | `0x9B7d50fc5e8e5866182ec4DbdcCc1933F889F68F` |
| FenixRaiseUpgradeableImplementation  | `0x8E6B23Ce25454CFc88a27babac4e7F82Db8dd676` |
| PerpetualsGaugeImplementation  | `0x1eBac806eEEc7Dd2940FdaD74BFFA078Ca3CaE15` |
| PerpetualsTradersRewarderImplementation  | `0x4b5F9CD6BAaa585D5dbd4A4F0069FaC4Fc048776` |
| VeNFTAPIUpgradeableImplementation | `0x44854BA30e75C31e1bF543d4221C181Ee920F8D5` |
| PairAPIUpgradeableImplementation | `0x74802c4b7739b68378311490d129a733A1d7aBf7` |
| RewardAPIUpgradeableImplementation | `0x3C4a31cc6987D7f3CEF5319799e2cC9341365A24` |
| VeNFTAPIUpgradeableImplementation | `0x44854BA30e75C31e1bF543d4221C181Ee920F8D5` |
| BlastGovernorImplementation | `0xbb71F88B3B5EC69E465a07B5D53e41D14f883EAe` |
| VeFnxSplitMerklAidropImplementation | `0x4E8cd2a8f3097decB85Faa0Ca97263f90758b7C5` |

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

### Voter
- `Distribution window` - 3600 seconds
  
## Test & Mocks

### Managed NFTS
- **Strategy**: 0x40BfCfd444c4085E939688A78b451761018B01a7
- **veFNX Nft Id**: 4
- **Type**: Compound
  
### Tokens
- `0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a` - fnUSDT
- `0x9Fe9D260262331807D0aa0fb06Fda1fa1b5E2ce5` - fnTOK
- `0xF80a52151d69D0552d10751D8C4efAF8ADA8dA6c` - fnxUSDB
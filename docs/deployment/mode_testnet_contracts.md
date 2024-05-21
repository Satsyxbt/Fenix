# Deployed Addresses List

Last updated date: **17.05.2024**

## Addresses
- `0x9140D359f2855E6540609dd4A93773ED1f45f509` - Deployer
- `0xBBd707815a7F7eb6897C7686274AFabd7B579Ff6` - Mode Sequence Fee Sharing address

## External:
- `0xc7b06F55FBCD31cd691504f3DFc4efa9082616B7 ` - WETH

## Core
| Contract Name         | Address                                    |
|-----------------------|--------------------------------------------|
| Solex                 | `0x8f985CC459afD12561b0ABCf8A5a070C37646baC` |
| ProxyAdmin            | `0xa37ce70d930BE73cC906A0dAbE1496A4A0fCc2eB` |
| Minter                | `0x094759DbBf8daCE67dD21fc730f02e091306ede9` |
| VeArtProxy            | `0x07Dd538a12BC2ac0606f530450107F4Ec529EA14` |
| Voter                 | `0x68F90976ee914aEE884b63EB434C07110BB75964` |
| VotingEscrow          | `0xA825031d8dc537618bd902F4949BFB4aa08aB3dd` |
| VeTokenDistributor    | `0x9C372f36DE74B719599d344cC0D3826D54D2CD50` |
| BribeFactory          | `0xE555b8daDa19e45b6EcbEEDf150bAC4099a9Ed86` |
| GaugeFactoryType      | `0x9f3c2C1E980c34baDD3a752Cde092b08dE400093` |
| GaugeFactoryType2     | `0x10FD0C9A6A01B7283e9d98a3aABca5C093f4a98a` |
| GaugeFactoryType3     | `0x0b48f726E39BCa73ad8653e59524D7C7f3b24995` |
| PairFactory           | `0x0Cfe2c6a4E5836845E3b69DB5d6d20E8BF7F8B63` |
| FeesVaultFactoryV2    | `0xdcf12C7E510aDcA630C500172e9C716983E1e748` |
| FeesVaultFactoryV3    | `0xf60E464166D6AbDC56C9ce9CC792F3aD38fcF8b7` |
| AlgebraTokenPriceProvider | `0x87ce253dB26E638B28A33ADA47558711CA2c6034` |
| VeBoost               | `0x2025b18693e8F77AE402D9547647460b897BF503` |
| RouterV2              | `0x68d418f22FD33a0CD834010B10Ca54d56d21eEd1` |

## Implementations for Proxy
| Contract Name                  | Address                                    |
|--------------------------------|--------------------------------------------|
| MinterImplementation           | `0xC3c50C7A212c9320b185d09E790138407a0102cC` |
| VeArtProxyImplementation       | `0xA2f6C997ea66F179C6b83C9Eb3AF887266711D37` |
| VoterImplementation            | `0x008D28A2206F01828ea59C3d39A4Eb1aa15d072D` |
| VotingEscrowImplementation     | `0x23A64d5e5a6934EA5553Dad75B9bf9247b3d959D` |
| VeTokenDistributorImplementation | `0x32Cd9C25e0225922FFF6E4DA56EDC2A9C899F714` |
| BribeFactoryImplementation     | `0x11C054c382c51e89b773E89EC1891AF7C63Be74c` |
| BribeImplementation            | `0x1112e7bECA00303Fc18d435FB93e19c0cDB9bef4` |
| GaugeFactoryImplementation     | `0xFdB418abf9FDC23B531551D76E91EcDb4f959b79` |
| GaugeImplementation            | `0x0e8263E09466a3F1b8f17f157CD8b9B180d0a70B` |
| PairFactoryImplementation      | `0x43A03baaE5333ba68cdffdCEb8fD474304d61D5b` |
| PairImplementation             | `0x3190D3e6c721991662AEE55eF915239ecB991301` |
| FeesVaultImplementation        | `0xD4E679ED8C21C2273dE6CbD955a8901EEB9A0B6b` |
| FeesVaultFactoryImplementation | `0xdaEbe4b167AF9ef5f9D9df0F0D6Be088DA090F0d` |
| AlgebraTokenPriceProviderImplementation | `0x3926e98Ef35DD507b0fC49c901c198d2b087B279` |
| VeBoostImplementation          | `0xDAe1136E05198368F0fd9948937d5D9F039D83E9` |



## Initial/Default settings
#### General

- Public Pool Creation Mode: `true`
- Default Community Fee: `1000` => 10%
- Stable fee: `4` => 0.04%
- VolatileFee fee: `18` => 0.18%
- Setted FeesVault Factory for Pair: `0x0Cfe2c6a4E5836845E3b69DB5d6d20E8BF7F8B63`
- FeesVaultFactoty default distribution config:
```json
{
    toGaugeRate: 0,
    recipients: ['0x9140D359f2855E6540609dd4A93773ED1f45f509'],
    rates: [10000],
  }
```

#### Emission
- Team rate - `5%`
- Tail emission - `0.2%`
- Inflation rate  - `1.5%`
- Inflation period count - `8`
- Start weekly emisison - `225_000` 
- Decay rate - `1%`

## Test & Mocks
### Tokens
- `0x135506Baf0cdc9611fd4EFD3abD0A919686458eE` - fnUSDT
- `0x850Afb50C56c49E7C5132018B46446De62D60A84` - fnTOK
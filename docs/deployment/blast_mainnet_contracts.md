# Deployed Addresses List

Last updated date: **02.04.2024**


## Addresses
- `0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30` - Deployer
- `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` - Default/Setted blast points operator address
- `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` - Default/Setted blast governor address
- `0xAC12571907b0aEE0eFd2BC13505B88284d5854db` - Fenix tresuary
  
## External:
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
| PairFactory           | `0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f` | Factory for v2 pair contracts  | Upgradeable  |
| Voter                 | `0xd7ad4143f32523a6878eD01d7E07e71CeAB22430` | Voting contract                | Upgradeable  |
| VotingEscrow          | `0x99988De25e33A2CAF1B8d0A13fa67558059dd937` | Lock tokens for voting         | Upgradeable  |
| VeArtProxy            | `0xdc24C85A65580fF0d6c9178534e98ac4C8eCE8f8` | Proxy for art tokens           | Upgradeable  |
| Minter                | `0xa4FF6fe53212e8da028e0a34819006A26615D9f8` | FNX Emission manager           | Upgradeable  |
| FeesVaultFactory      | `0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB` | Factory for fees vaults        | Default      |
| RouterV2              | `0x0998bEc51D95EAa75Ffdf465D5deD16aEd2ba2fe` | Router for token swaps         | Default      |
| MerklGaugeMiddleman   | `0x0145C48FC4c0BB3034f332B3171124d607D6Bd2C` | Middleman for Merkl integration | Default      |
| GaugeFactoryType      | `0x0639ecB0B82D7fb625b9598956EE93e1FC4398cE` | Gauge Factory for Gauges Type 0 (v2) | Upgradeable |
| GaugeFactoryType2     | `0x30d245a690B2E2105bd22Bd475BBa09921D59EAB` | Gauge Factory for Gauges Type 1 (V3) | Upgradeable |
| GaugeFactoryType3     | `0xA57B11E7fF9A13Bb2A367dd507D4BB469a3C426d` | Gauge Factory for Gauges Type 2 (ICHI) | Upgradeable |
| VeFnxDistributor      | `0x4F5BdBc19025bBa0244C764F52CC064AbC76eC96` | FNX distribution without boosts in max lock veFNX | Upgradeable |
| rFNX      | `0xEDB4f9CB084B0dc4B06EB0c588697a2CCa2E6532` | rFNX | Default |

## Implementations for Proxy

| Contract Name                | Address                                  | Short Description                |
|------------------------------|------------------------------------------|----------------------------------|
| MinterImplementation         | `0x2F9cb1AdE5A3c615e3fb346a3137B2A6C21c4A3F` | Implementation for minter        |
| VeArtProxyImplementation     | `0x3eD36254b340B39c5150fBc97e1d96593Aa38770` | Implementation for art proxy     |
| VoterImplementation          | `0xfCc39698d6FDF7DD53a21e50ae1Af6a221B87DE9` | Implementation for voter         |
| VotingEscrowImplementation   | `0x77B485433DB4cf314929A36DC3c3601c579091B6` | Implementation for voting escrow |
| VeFnxDistributorImplementation | `0x3c772ee7Ab45BD106f6af53DE20548df58C3829d` | Implementation for distribution  |
| BribeFactoryImplementation   | `0xA2E5cd7D56d4e97614c6e0fBB708a8ecaA7437e3` | Implementation for bribe factory |
| BribeImplementation          | `0xBB3A43D792cDCB3d810c0e500c21bD958686B90b` | Implementation for bribes        |
| GaugeFactoryImplementation   | `0xAfBA5614db7d3708c61a63B23E53c37217e52f82` | Implementation for gauge factory |
| GaugeImplementation          | `0x5f95aF3EE7cA36Eea7D34dEe30F3CaCbBCe7D657` | Implementation for gauges        |
| PairFactoryImplementation    | `0x050faB54aaaEBf0F8DA36ffb69036C59B19a5b7e` | Implementation for pair factory  |
| PairImplementation           | `0x2c3f891c0ca3635B6C5eA303a9cd7f29c7Fcd00E` | Implementation for pairs         |
| FeesVaultImplementation      | `0xeD685caDAFf29520c27e3965D67AF14F00639A98` | Implementation for fees vault    |
| FeesVaultFactoryImplementation      | `0xAbAD1E34dE64e0C06017A856F94EdEf0913c5D0a` | Implementation for fees vault    |

## Blast configuration
### Blast governor
| Contract Name     | Current Gas Mode | Current ETH Yield Mode | Blast governor Address                       |
|-------------------|------------------|------------------------|----------------------------------------------|
| Fenix             | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| BribeFactory      | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| PairFactory       | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| Voter             | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| VotingEscrow      | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| Minter            | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| FeesVaultFactory  | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| RouterV2          | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| GaugeFactoryType  | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| GaugeFactoryType2 | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| GaugeFactoryType3 | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| VeFnxDistributor  | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| rFNX              | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| MerklGaugeMiddleman              | Claimable        | Claimable              | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |

### Default blast governor
Seted the address that will be set when deploys contracts (pools, plug-ins, etc.) from the specified contracts
| Contract Name                       | Blast governor Address              |
|-------------------------------------|----------------------------------------------|
| PairFactoryUpgradeable             | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| FeesVaultFactory             | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| GaugeFactoryUpgradeable             | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| GaugeFactoryUpgradeable 2             | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| GaugeFactoryUpgradeable 3             | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| BribeFactoryUpgradeable             | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |

### Default blast points operator
Seted the address that will be set when deploying new pools as an operator for blast points of this pool
| Contract Name                       | Blast points Address              |
|-------------------------------------|----------------------------------------------|
| PairFactory                      | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |
| FeesVaultFactory                      | `0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4` |


## Initial/Default settings
#### General

- Public Pool Creation Mode: `false`
- Default Community Fee: `1000` => 10%
- Stable fee: `4` => 0.04%
- VolatileFee fee: `18` => 0.18%
- Setted FeesVault Factory: `0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB`
- PairFactory WETH: `isRebase: true, mode: Clamable`
- PairFactory USDB: `isRebase: true, mode: Clamable`
- FeesVaultFactory WETH: `isRebase: true, mode: Clamable`
- FeesVaultFactory USDB: `isRebase: true, mode: Clamable`
- FeesVaultFactoty default distribution config:
```json
{
    toGaugeRate: 0,
    recipients: ['0xAC12571907b0aEE0eFd2BC13505B88284d5854db'],
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

#### GaugesTypes
- `0` for V2 pairs
  - PairFactory v2 - `0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f`
  - GaugeFactory - `0x0639ecB0B82D7fb625b9598956EE93e1FC4398cE`
  - Distribution to Merkle - `false`
- `1` for V3 pools
  - PairFactory v2 - `0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`
  - GaugeFactory - `0x30d245a690B2E2105bd22Bd475BBa09921D59EAB`
  - Distribution to Merkle - `true`
- `2` for ICHI vaults
  - PairFactory v2 - `0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df`
  - GaugeFactory - `0xA57B11E7fF9A13Bb2A367dd507D4BB469a3C426d`
  - Distribution to Merkle - `true`
  
#### rFNX
- veFNX part lock period - `182 days`
- Applying veBoosts to veFNX - `No`
- Rate of ***rFNX -> FNX/veFNX*** convertation - `rFNX -> 40% FNX, 60% veFNX `
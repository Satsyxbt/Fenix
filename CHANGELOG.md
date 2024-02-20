# [02/20/2024] Fenix Features Implementation

## Sources:
- [THENA Contracts](https://github.com/ThenafiBNB/THENA-Contracts)
- [Chronos Contracts V2](https://github.com/ChronosEx/Chronos-ContractsV2/blob/main/contracts/Chronos.sol)
- [Chronos Contract Addresses Documentation](https://docs.chronos.exchange/product-docs/additional-information/contract-addresses)
- [Angle Protocol Merkl Contracts](https://github.com/AngleProtocol/merkl-contracts/blob/main/contracts/middleman/MerklGaugeMiddleman.sol)
- [Algebra Contracts](https://github.com/cryptoalgebra/Algebra)
- [Blast Contracts](https://github.com/blast-io/blast/tree/78003ff2bd78cb07d3c830a24929d7670b2a1f4d/blast-optimism/packages/contracts-bedrock/src/L2)

## Global Changes:
- Added inheritance from `BlastGovernorManage` to major contracts for supporting gas reception and yield farming within the Blast network, along with control address initialization. For factory contracts, the functionality to set the address for future deployed contracts is also provided.
- Introduced `BlastERC20RebasingManage` for managing rebasing tokens of the Blast protocol in pools.
- Updated the minimum Solidity version to `0.8.19`.
- Upgraded OpenZeppelin dependencies to `4.9.5`.

## BlastERC20RebasingManage [New]
A new contract designed to allow an authorized address to manage and claim excess rebase tokens on inheriting contracts. It supports Blast network features.
### Features:
- Provides an interface for managing rebase token settings within the Blast network.

## BlastGovernorSetup [New]
A new contract for setting up the governor address within the Blast network.
### Features:
- Sets the governor address within the Blast network for the contract.

## FeesVaultFactory [New]
This contract inherits from `@cryptoalgebra/integral-core/contracts/interfaces/vault/IAlgebraVaultFactory` and aims to create `FeeVaults` for dex v2/v3 pools.
### Features:
- **Vault Creation:** Allows specified users (whitelisted creators) to deploy new `Fee Vaults` for specific pools.
- **Upgradeable Proxy Pattern**: Implements the beacon proxy pattern to facilitate Fee Vault implementation upgrades without the need for data migration.
- Sets the Blast governor address for created `FeeVaults`.

## FeesVaultUpgradeable [New]
This contract's purpose is to collect fees from pools and distribute them according to configuration, defaulting to 100% of all commission income to the gauge.
### Features:
- Allows an authorized person to withdraw funds.
- Enables configuration changes.
- Grants the gauge the right to distribute fees among recipients.

## MerklGaugeMiddleman
Source: [Angle Protocol Merkl Contracts](https://github.com/AngleProtocol/merkl-contracts/blob/main/contracts/middleman/MerklGaugeMiddleman.sol)
Aims to distribute FNX issuance on Merkle. The main flow involves the gauge calling `notifyReward` and transferring issuance with the creation of a distribution on Merkle.
### Changes:
- Authorized addresses can configure supported gauge addresses.
- Supports the transfer of issuance from Gauge to `Merkle`.

## BribeFactoryUpgradeable
Previously [BribeFactoryV3]
### Changes:
- Split into multiple files.
- Removed the default `defaultRewardToken`.
- Bribe no longer has an explicit identifier indicating it as internal/external.

## GaugeFactoryUpgradeable
Previously `[GaugeFactoryV2_CL, GaugeFactoryV2, CLGaugeFactoryV3, GaugeFactoryV3]`
### Changes:
- Split into multiple files.
- Supports setting up `merklGaugeMiddleman` in newly created `Gauges`.
- Limits the creation of `Gauges`.

## GaugeUpgradeable
Previously `[GaugeV2, GaugeV2_CL, CLMaGaugeV2Upgradeable, MaGaugeV2Upgradeable]`
### Removed:
- Removed the Chronos approach to maturity gauges.

### Added:
- Added the ability to configure whether the emission will be sent to Merkle or distributed among.

### Changes:
- Split into multiple files.
- Changed the token acquisition path by now only withdrawing swap fees from `FeeVault`.

## VeArtProxyUpgradeable
### Changes:
- Completely redesigned the appearance of `NFTs`.

## VoterUpgradeable
### Changes:
- Supports the creation of a third type of gauge, which does not involve normal Gauge usage but rather simple manual positions in v3 pools.

## Pair
### Changes:
- Changed the fee distribution path to now use `FeeVault`.

### Added:
- Ability to set the swap fee recipient address.

## PairFactoryUpgradeable
### Added:
- Creates a `FeeVault` for pairs during their creation.
- Allows custom fee settings for pairs and distribution between LP providers and `FeeVault`.
- Enables the factory to configure and claim rebasing tokens in the Blast system for pairs.
- Added a mock method `getHookTarget` for possible future extensions of v2 pairs, specifically to notify `FeeVault` about swaps in the pool.

### Removed:
- Removed fee settings for nftStaking, referral fees, etc.

## PairFees
### Removed:
- Returned to the standard implementation, removing the functionality for calculating fees for nft staking.

## VotingEscrowUpgradeable
### Changes:
- Implemented `ReentrancyGuard` from `OpenZeppelin`.
- Contract updated to be `Upgradeable`.
- Changed the maximum lock time to `6 months` from the previous `2 years`.

## Fenix Token
### Changed:
- Completely overhauled the token implementation `[Thena.sol, Chronos.sol]`, adopting a standard implementation from `OpenZeppelin`.
- Supported an initial `totalSupply` of `7,500,000 Fenix` tokens.

### Removed:
- Removed dead variables.
- Removed one-time functions, transferring minting to the deployment phase.

### Added:
- Inherited `ERC20Burnable` functionality, as well as `Ownable` for minting rights management.

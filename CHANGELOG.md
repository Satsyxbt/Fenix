# Changelog
## [1.1.0] - 2024-27-03 Fenix Improvments and new Feautures
### Added
- Implemented `RFenix.sol` contract.
- Implemented `BlastERC20FactoryManager.sol` contract.
- Implemented `FeesVaultProxy.sol` contract.
- Documentation updates.
- Support for BlastPoints logic in `PairFees`.
- Support for BlastPoints logic in `FeesVault`.
- Added `afterPoolInitialize` logic in `FeesVaultFactoryUpgradeable.sol` for automatic configuration of rebase tokens mode in created `FeesVault`.
- Automatic configuration of rebase tokens mode for `PairFees` during pool creation.
- !! Complete change of commission distribution logic in FeeVault contract
  
### Changed
- Updated to the latest commit of the Fenix v3 library.
- Added additional parameters (blastPoints, blastPointsOperator) to `Pair.sol`.
- Added additional parameters (blastPoints, blastPointsOperator) to `PairFees.sol`.
- Added additional parameters (blastPoints, blastPointsOperator) to `FeesVault.sol`.
- Updated `FeesVault` to use the Upgradeable pattern.
- Changed access control logic in `FeesVaultFactoryUpgradeable.sol` from `Ownable` to `AccessControl`.
- Moved logic for default blast address to a separate abstract parent contract.
- Relocated `FeesVault` contract to a separate folder.
  
### Removed
- Unused test fixtures.

## [1.0.0] - 2024-22-02 Fenix Features Implementation

### Sources
- [THENA Contracts](https://github.com/ThenafiBNB/THENA-Contracts)
- [Chronos Contracts V2](https://github.com/ChronosEx/Chronos-ContractsV2/blob/main/contracts/Chronos.sol)
- [Chronos Contract Addresses Documentation](https://docs.chronos.exchange/product-docs/additional-information/contract-addresses)
- [Angle Protocol Merkl Contracts](https://github.com/AngleProtocol/merkl-contracts/blob/main/contracts/middleman/MerklGaugeMiddleman.sol)
- [Algebra Contracts](https://github.com/cryptoalgebra/Algebra)
- [Blast Contracts](https://github.com/blast-io/blast/tree/78003ff2bd78cb07d3c830a24929d7670b2a1f4d/blast-optimism/packages/contracts-bedrock/src/L2)

### Global Changes
- Inheritance from `BlastGovernorManage` added to major contracts for gas reception and yield farming support within the Blast network, including control address initialization. Factory contracts now have the functionality to set the address for future deployed contracts.
- `BlastERC20RebasingManage` introduced for managing rebasing tokens of the Blast protocol in pools.
- Updated the minimum Solidity version to `0.8.19`.
- Upgraded OpenZeppelin dependencies to `4.9.5`.

### New Contracts
#### BlastERC20RebasingManage
Designed to allow an authorized address to manage and claim excess rebase tokens on inheriting contracts, supporting Blast network features.
##### Features
- Interface for managing rebase token settings within the Blast network.

#### BlastGovernorSetup
Sets up the governor address within the Blast network.
##### Features
- Sets the governor address for the contract within the Blast network.

#### FeesVaultFactory
Inherits from `@cryptoalgebra/integral-core/contracts/interfaces/vault/IAlgebraVaultFactory` to create `FeeVaults` for dex v2/v3 pools.
##### Features
- Vault Creation: Allows specified users (whitelisted creators) to deploy new `Fee Vaults` for specific pools.
- Upgradeable Proxy Pattern: Implements the beacon proxy pattern for Fee Vault implementation upgrades without data migration.
- Sets the Blast governor address for created `FeeVaults`.

#### FeesVaultUpgradeable
Collects fees from pools and distributes them according to configuration, defaulting to 100% of commission income to the gauge.
##### Features
- Authorized withdrawals.
- Configuration changes.
- Grants the gauge the right to distribute fees.

### Updated Contracts
#### MerklGaugeMiddleman
Distributes FNX issuance on Merkle with the gauge calling `notifyReward` and transferring issuance with Merkle distribution creation.
##### Changes
- Configuration of supported gauge addresses by authorized addresses.
- Transfer of issuance from Gauge to `Merkle`.

#### BribeFactoryUpgradeable
Previously `BribeFactoryV3`, based on Chronos implementation.
##### Added
- Ability to add default reward tokens to bribe.
##### Changes
- Gas optimization.
- Split into multiple files.
- Removal of the default `defaultRewardToken`.
- No explicit identifier for internal/external bribe.

#### GaugeFactoryUpgradeable
Previously `GaugeFactoryV2_CL`, `GaugeFactoryV2`, `CLGaugeFactoryV3`, `GaugeFactoryV3`, based on Chronos.
##### Added
- Support for `merklGaugeMiddleman` setup in newly created `Gauges`.
- Zero address checks.
##### Changes
- Split into multiple files.
- Limitation on the creation of `Gauges`.

#### GaugeUpgradeable
Previously `GaugeV2`, `GaugeV2_CL`, `CLMaGaugeV2Upgradeable`, `MaGaugeV2Upgradeable`, based on Thena.
##### Added
- Ability to configure emission distribution to Merkle or among.
##### Changes
- Converted contract to Upgradeable.
- Split into multiple files.
- Changed token acquisition path to only withdraw swap fees from `FeeVault`.

#### VeArtProxyUpgradeable
##### Added
- `NumberFormatter` implementation for desired number formats in SVG.
- `DateTime` implementation for timestamp conversion to standard date format.
##### Changes
- Complete redesign of `NFTs` appearance.


### VoterUpgradeable
Based on the `Thena` Voter3 implementation

#### Changes:
- Supports the creation of a third type of gauge, which does not involve normal Gauge usage but rather simple manual positions in v3 pools.
- Enhanced symbol/name creation method for gauges, generating symbols from token symbols in pools where direct extraction is not possible.
- Parameter updates for gauge creation according to factory updates and new functionality.

#### Added:
- Support for a new type of Gauge, resulting in:
  - Gauges for v2 pools where users stake their LP in the Gauge.
  - Gauges for v3 pools directly without CLM, etc., with standard emission distribution through Merkle.
  - Gauges for ICHIVault, with emission distribution through Merkle.
- Added storage slots for future updates with storage.
- Creation of gauges limited to Governance address only.

### Pair
#### Removed:
- Removal of fee distribution related to stakingNFTFee and ReferralFee.

#### Changes:
- Changed the fee distribution path to now use `FeeVault`.
- Added initialization method and changes to support deployment via proxy.

#### Added:
- Ability to set the swap fee recipient address.
- Hook call during swap for future updates.
- Authorized address can configure settings for Blast rebase tokens.

### PairFactoryUpgradeable
#### Added:
- Creates a `FeeVault` for pairs during their creation.
- Allows custom fee settings for pairs and distribution between LP providers and `FeeVault`.
- Added a mock method `getHookTarget` for possible future extensions of v2 pairs, specifically to notify `FeeVault` about swaps in the pool.
- Added capability to configure base configuration for rebase tokens in pairs.
- Restrictions on pair creation, role management, and public pair creation mode.

#### Changed:
- Changed the pair creation principle to circumvent contract size issues, now using OpenZeppelin clones for proxy creation.
- Changed the maximum fee to 5% from 0.25%.

#### Removed:
- Removed fee settings for nftStaking, referral fees, etc.
- Removed the method for returning pair code hash, due to irrelevance.

### PairFees
#### Removed:
- Returned to the standard implementation, removing the functionality for calculating fees for nft staking.

### VotingEscrowUpgradeable
Based on the implementation from [Thena](https://github.com/ThenafiBNB/THENA-Contracts/blob/main/contracts/VotingEscrow.sol).

#### Added:
- Added auxiliary functions from Chronos implementation [totalTokens(), totalTokensMinted, totalTokensBurned, tokensOfOwner].
- Added reserved space for future implementations.

#### Changes:
- Replaced internal `nonreentrant` implementation with `ReentrancyGuardUpgradeable` from `OpenZeppelin`.
- Updated the contract to be `Upgradeable`.
- Changed the maximum lock time to `6 months` from the previous `2 years`.

### Fenix Token
#### Changed:
- Completely overhauled the token implementation `[Thena.sol, Chronos.sol]`, adopting a standard implementation from `OpenZeppelin`.
- Supported an initial `totalSupply` of `7,500,000 Fenix` tokens.
- Supported token minting by the contract owner, with `MinterUpgradeable` set as the minting authority post-deployment.

#### Removed:
- Removed dead variables.
- Removed one-time functions, transferring initial minting to the deployment phase.

#### Added:
- Inherited `ERC20Burnable` functionality, as well as `Ownable` for minting rights management.

### Minter Upgradeable
The emission calculation algorithm was reworked, now increasing up to a certain epoch and then decreasing according to the configuration.

#### Changed:
- Replaced access control mechanism with `Ownable2StepUpgradeable`.
- Implemented and changed to a new emission calculation algorithm.
- Replaced `_initialize` implementation for clearer approach.

### RouterV2
Inherits from Chronos/Thena.

#### Changed:
- Changed `pairFor` implementation for pair address retrieval, adapted to `PairFactoryUpgradeable` implementation.
- Supported setting the Blast governor address for gas fee configurations.
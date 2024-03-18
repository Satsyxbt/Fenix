# Protocol Contract Deployment Procedure

## Gas Price Determination

The gas price is taken from the network's current `target` values and assumes a 10-20% overestimation for normal deployment. This is achieved by hardcoding the gas price or entering specific configurations in `hardhat.config`.

## Clearing Previous Deployment Residues

The `scripts/deploys.json` file must be cleared before starting a fresh protocol deployment. If there are existing entries, they will be used in the subsequent deployment.

## Deployment of Implementations to Existing Contracts for Proxy/Upgradeable

This includes the following list:

- **Core:**
  - `MinterUpgradeable`
  - `VeArtProxyUpgradeable`
  - `VoterUpgradeable`
  - `VotingEscrowUpgradeable`

- **Additional:**
  - `VeBoostUpgradeable`
  - `VeFnxDistributorUpgradeable`

- **Bribes:**
  - `BribeFactoryUpgradeable`
  - `BribeUpgradeable`

- **Gauges:**
  - `GaugeFactoryUpgradeable`
  - `GaugeUpgradeable`

- **DexV2:**
  - `PairFactoryUpgradeable`
  - `Pair`

- **Integration:**
  - `AlgebraFNXPriceProviderUpgradeable`
  - `FeesVaultUpgradeable`

Deploy simply by running the contract deployment script without any configurations or changes. The deployed contracts will be used as implementation addresses for the final contracts.

`npx hardhat run .\scripts\1_deploy_implementations.ts`

## Deployment of ProxyAdmin

To manage implementation changes etc., from the `Deployer` side, deploy the ProxyAdmin from OZ simply on the network. Ownership of the contract remains with `Deployer`.

`npx hardhat run .\scripts\2_deploy_proxy_admin.ts`

## Deployment of TransparentUpgradeableProxy for Specified Contracts

!!! IMPORTANT: Implementations and Proxy Admin must be deployed in previous steps.
!!! IMPORTANT: Deployment does not entail immediate initialization, thus allowing malicious users the potential to front-run or DOS the deployed proxy.

Contracts for which TransparentUpgradeableProxy is deployed:

- **Core:**
  - `MinterUpgradeable`
  - `VeArtProxyUpgradeable`
  - `VoterUpgradeable`
  - `VotingEscrowUpgradeable`

- **Additional, Bribes, Gauges, DexV2, Integration** as previously listed.

Constructor arguments for deployment include:
- `implementation` for the given contract from previous deployment steps
- `proxyAdmin` the address of the contract deployed in previous steps
- `data` is `0x`, implying no initial initialization, hence it remains empty

`npx hardhat run .\scripts\3_deploy_proxies.ts`

## Deployment of Fenix

This occurs simply by deploying the `Fenix` contract on the network. After deployment, `Deployer` receives `7,500,000 FNX` on the balance.

**Parameters include:**
- `blastGovernor_` - the management address
- `minter_` - the address to be granted minting rights and token ownership. Initially set to `Deployer`, then changed to the actual minter contract address.

## Deployment of FeesVaultFactory

Deploy the contract simply on the network.

**Parameters include:**
- `blastGovernor_` - the management address
- `FeesVault - implementation`
- `Voter - proxy` - the address of the uninitialized proxy

## Initialization of Main Contracts

At this stage, the already deployed proxies are initialized. It is assumed that the contracts can be initialized by the addresses of other contracts which are not yet initialized.

The order and initialization include:

1. `BribeFactory`
2. `GaugeFactory #1`
3. `GaugeFactory #2`
4. `GaugeFactory #3`
5. `VotingEscrow`
6. `PairFactory`
7. `Minter`
8. `Voter`

Details for each are based on specific contract requirements.

## Deployment of MerklGaugeMiddleman

Deploy with set parameters such as `governor_`, `token_` (fenix token address), and `merklDistributionCreator_` (actual merkle distributor creator address on target network).

## Deployment of RouterV2

Deploy simply and set parameters like `BlastGovernor`, `PairFactory`, and `WETH` (address of WETH in the selected network).

## Setting Gas Mode in All Contracts

Set the mode to Claimable in all deployed contracts for gas optimization.

## Initial Settings and Configurations

Includes transferring ownership from Deployer to the Minter contract over Fenix token, adding PairFactory as a creator in FeesVaultFactory, establishing correct Minter address in Voter contract, and setting up various configurations for operational efficiency.

Initialize PriceProvider, VeBoost, and set up VeBoost in VotingEscrow contract.
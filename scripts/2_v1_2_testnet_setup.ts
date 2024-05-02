import { deployBase, deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';
import hre from 'hardhat';

const V2_FACTORY = '0x514AeBB1526a08DB1dB97616F281fa30F7FAB6B3';
const V2_ROUTER = '0xAC0D01f49798426d2cDff417835a3feA80B9e698';
const BLAST_GOVERNOR = '0x9140D359f2855E6540609dd4A93773ED1f45f509';
const VOTING_ESCROW = '0x4dD9e7dd344a309030B22d36A567f0d99C6a5403';
const VOTER = '0x6cCe3E45CCe11bE2CD4715442b0d1c3675C5D055';

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log('13_v1_2_testnet_setup -- started');

  let data = getDeploysData();

  let ProxyAdmin = await hre.ethers.getContractAt('ProxyAdmin', data['ProxyAdmin']);
  let CompoundVeFNXManagedNFTStrategyFactory = await hre.ethers.getContractAt(
    'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
    data['CompoundVeFNXManagedNFTStrategyFactory'],
  );
  let RouterV2PathProvider = await hre.ethers.getContractAt('RouterV2PathProviderUpgradeable', data['RouterV2PathProvider']);
  let ManagedNFTManager = await hre.ethers.getContractAt('ManagedNFTManagerUpgradeable', data['ManagedNFTManager']);

  await RouterV2PathProvider.initialize(BLAST_GOVERNOR, V2_FACTORY, V2_ROUTER);

  await CompoundVeFNXManagedNFTStrategyFactory.initialize(
    BLAST_GOVERNOR,
    data['CompoundVeFNXManagedNFTStrategyUpgradeableImplementation'],
    data['SingelTokenVirtualRewarderUpgradeableImplementation'],
    ManagedNFTManager.target,
    RouterV2PathProvider.target,
  );

  await ManagedNFTManager.initialize(BLAST_GOVERNOR, VOTING_ESCROW, VOTER);

  await ProxyAdmin.upgrade(VOTING_ESCROW, data['VotingEscrowUpgradeableV1_2Implementation']);
  await ProxyAdmin.upgrade(VOTER, data['VoterUpgradeableV1_2Implementation']);

  let VoterUpgradeableV1_2 = await hre.ethers.getContractAt('VoterUpgradeableV1_2', VOTER);
  let VotingEscrowUpgradeableV1_2 = await hre.ethers.getContractAt('VotingEscrowUpgradeableV1_2', VOTING_ESCROW);

  await VoterUpgradeableV1_2.setManagedNFTManager(ManagedNFTManager.target);

  await VoterUpgradeableV1_2.setDistributionWindowDuration(3600);

  await VotingEscrowUpgradeableV1_2.setManagedNFTManager(ManagedNFTManager.target);

  console.log('13_v1_2_testnet_setup -- finished');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { deployBase, deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';
import hre from 'hardhat';

import artifact from '../artifacts/contracts/core/VotingEscrowUpgradeableV1_2.sol/VotingEscrowUpgradeableV1_2.json';
async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log('12_v1_2_testnet_nest_new_implementations_and_proxy -- started');

  await deployBase('SingelTokenVirtualRewarderUpgradeable', 'SingelTokenVirtualRewarderUpgradeableImplementation');
  await deployBase('CompoundVeFNXManagedNFTStrategyFactoryUpgradeable', 'CompoundVeFNXManagedNFTStrategyFactoryUpgradeableImplementation');
  await deployBase('ManagedNFTManagerUpgradeable', 'ManagedNFTManagerUpgradeableImplementation');
  await deployBase('RouterV2PathProviderUpgradeable', 'RouterV2PathProviderUpgradeableImplementation');
  await deployBase('VoterUpgradeableV1_2', 'VoterUpgradeableV1_2Implementation');
  await deployBase('VotingEscrowUpgradeableV1_2', 'VotingEscrowUpgradeableV1_2Implementation');

  let data = getDeploysData();

  await deployProxy(
    data['ProxyAdmin'],
    data['CompoundVeFNXManagedNFTStrategyFactoryUpgradeableImplementation'],
    'CompoundVeFNXManagedNFTStrategyFactory',
  );
  await deployProxy(data['ProxyAdmin'], data['ManagedNFTManagerUpgradeableImplementation'], 'ManagedNFTManager');
  await deployProxy(data['ProxyAdmin'], data['RouterV2PathProviderUpgradeableImplementation'], 'RouterV2PathProvider');

  console.log('12_v1_2_testnet_nest_new_implementations_and_proxy -- finished');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

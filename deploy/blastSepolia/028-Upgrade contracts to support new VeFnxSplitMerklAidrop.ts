import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import hre, { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { IAlgebraFactory } from '@cryptoalgebra/integral-core/typechain';

import { AccessControlEnumerableUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();
  const ProxyAdmin = await getProxyAdminAddress();

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.VoterUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.VoterUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
    proxyAdmin: ProxyAdmin,
    verify: true,
  });

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.VeFnxSplitMerklAidropUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Proxy],
    proxyAdmin: ProxyAdmin,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { GaugeType } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const Tasks = [
    {
      contract: InstanceName.VeFnxSplitMerklAidropUpgradeable,
      saveAlias: AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.VoterUpgradeable,
      saveAlias: AliasDeployedContracts.VoterUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
  ];

  for await (const task of Tasks) {
    await deploy({
      name: task.contract,
      deployer: deployer,
      constructorArguments: task.constructorArguments || [],
      saveAlias: task.saveAlias,
      verify: true,
    });
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

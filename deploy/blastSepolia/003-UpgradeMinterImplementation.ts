import {
  AliasDeployedContracts,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const Tasks = [
    {
      contract: InstanceName.MinterUpgradeable,
      saveAlias: AliasDeployedContracts.MinterUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.MinterUpgradeable_Proxy,
    },
  ];

  for await (const task of Tasks) {
    await deployNewImplementationAndUpgradeProxy({
      implementationName: task.contract,
      deployer: deployer,
      implementationConstructorArguments: [BlastGovernor],
      implementationSaveAlias: task.saveAlias,
      proxyAddress: DeployedContracts[task.proxyTarget],
      proxyAdmin: ProxyAdmin,
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

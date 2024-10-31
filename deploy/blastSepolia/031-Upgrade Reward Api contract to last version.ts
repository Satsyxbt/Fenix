import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deployNewImplementationAndUpgradeProxy,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const ProxyAdmin = await getProxyAdminAddress();

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.RewardAPIUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [],
    implementationSaveAlias: AliasDeployedContracts.RewardAPIUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.RewardAPIUpgradeable_Proxy],
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

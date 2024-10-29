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
    implementationName: InstanceName.VeNFTAPIUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [],
    implementationSaveAlias: AliasDeployedContracts.VeNFTAPIUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.VeNFTAPIUpgradeable_Proxy],
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

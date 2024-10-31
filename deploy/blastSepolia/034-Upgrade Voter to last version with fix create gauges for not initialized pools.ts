import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

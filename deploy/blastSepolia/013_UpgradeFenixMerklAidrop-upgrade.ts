import {
  AliasDeployedContracts,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  upgradeProxy,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.VeFnxSplitMerklAidropUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Proxy],
    proxyAdmin: await getProxyAdminAddress(),
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

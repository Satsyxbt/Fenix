import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
  upgradeProxy,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.VeNFTAPIUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [],
    implementationSaveAlias: AliasDeployedContracts.VeNFTAPIUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.VeNFTAPIUpgradeable_Proxy],
    proxyAdmin: await getProxyAdminAddress(),
    verify: true,
  });

  const VeNFTAPIUpgradeable = await ethers.getContractAt(
    InstanceName.VeNFTAPIUpgradeable,
    DeployedContracts[AliasDeployedContracts.VeNFTAPIUpgradeable_Proxy],
  );

  await logTx(
    VeNFTAPIUpgradeable,
    VeNFTAPIUpgradeable.setManagedNFTManager(DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

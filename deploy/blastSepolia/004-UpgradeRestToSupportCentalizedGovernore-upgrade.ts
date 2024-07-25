import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTransaction,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdminAddress = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let GaugeFactoryUpgradeableImplementation = await deploy({
    name: InstanceName.GaugeFactoryUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation,
  });

  const ProxyAdmin = await ethers.getContractAt(InstanceName.ProxyAdmin, ProxyAdminAddress);

  await logTx(
    ProxyAdmin,
    ProxyAdmin.connect(deployer).upgrade(
      DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_1],
      GaugeFactoryUpgradeableImplementation.target,
    ),
  );

  await logTx(
    ProxyAdmin,
    ProxyAdmin.connect(deployer).upgrade(
      DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_2],
      GaugeFactoryUpgradeableImplementation.target,
    ),
  );

  await logTx(
    ProxyAdmin,
    ProxyAdmin.connect(deployer).upgrade(
      DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_3],
      GaugeFactoryUpgradeableImplementation.target,
    ),
  );

  let PairFactoryUpgradeable_Implementation = await deploy({
    name: InstanceName.PairFactoryUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.PairFactoryUpgradeable_Implementation,
  });

  await logTx(
    ProxyAdmin,
    ProxyAdmin.connect(deployer).upgrade(
      DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
      PairFactoryUpgradeable_Implementation.target,
    ),
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

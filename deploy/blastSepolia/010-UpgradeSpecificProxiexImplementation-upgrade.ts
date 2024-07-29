import {
  AliasDeployedContracts,
  deploy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  await deploy({
    name: InstanceName.BribeUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.BribeUpgradeable_Implementation,
  });

  await deploy({
    name: InstanceName.FeesVaultUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.FeesVaultUpgradeable_Implementation,
  });

  await deploy({
    name: InstanceName.GaugeUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.GaugeUpgradeable_Implementation,
  });

  const GaugeFactoryUpgradeable_Proxy_1 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_1],
  );

  await logTx(
    GaugeFactoryUpgradeable_Proxy_1,
    GaugeFactoryUpgradeable_Proxy_1.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation]),
  );

  const GaugeFactoryUpgradeable_Proxy_2 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_2],
  );
  await logTx(
    GaugeFactoryUpgradeable_Proxy_2,
    GaugeFactoryUpgradeable_Proxy_2.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation]),
  );

  const GaugeFactoryUpgradeable_Proxy_3 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_3],
  );
  await logTx(
    GaugeFactoryUpgradeable_Proxy_3,
    GaugeFactoryUpgradeable_Proxy_3.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation]),
  );

  const FeesVaultFactoryUpgradeable = await ethers.getContractAt(
    InstanceName.FeesVaultFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
  );
  await logTx(
    FeesVaultFactoryUpgradeable,
    FeesVaultFactoryUpgradeable.changeImplementation(DeployedContracts[AliasDeployedContracts.FeesVaultUpgradeable_Implementation]),
  );

  const BribeFactoryUpgradeable = await ethers.getContractAt(
    InstanceName.BribeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.BribeFactoryUpgradeable_Proxy],
  );
  await logTx(
    BribeFactoryUpgradeable,
    BribeFactoryUpgradeable.changeImplementation(DeployedContracts[AliasDeployedContracts.BribeUpgradeable_Implementation]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

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
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const DeployedContracts = await getDeployedContractsAddressList();
  const BlastGovernor = await getBlastGovernorAddress();

  await deploy({
    name: InstanceName.CompoundVeFNXManagedNFTStrategyUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation,
  });

  await deploy({
    name: InstanceName.SingelTokenVirtualRewarderUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.SingelTokenVirtualRewarderUpgradeable_Implementation,
  });

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.ManagedNFTManagerUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
    proxyAdmin: ProxyAdmin,
    verify: true,
  });

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy],
    proxyAdmin: ProxyAdmin,
    verify: true,
  });

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.RouterV2PathProviderUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.RouterV2PathProviderUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.RouterV2PathProviderUpgradeable_Proxy],
    proxyAdmin: ProxyAdmin,
    verify: true,
  });

  const CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy],
  );

  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.changeStrategyImplementation(
      DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation],
    ),
  );

  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.changeVirtualRewarderImplementation(
      DeployedContracts[AliasDeployedContracts.SingelTokenVirtualRewarderUpgradeable_Implementation],
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

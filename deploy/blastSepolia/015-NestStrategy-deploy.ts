import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation = await deploy({
    name: InstanceName.CompoundVeFNXManagedNFTStrategyUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation,
    constructorArguments: [BlastGovernor],
    verify: true,
  });

  let CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Implementation = await deploy({
    name: InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Implementation,
    constructorArguments: [BlastGovernor],
    verify: true,
  });

  let CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: await CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    verify: true,
  });

  let CompoundVeFNXManagedNFTStrategyFactoryUpgradeable = await ethers.getContractAt(
    InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.target,
  );

  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable.initialize(
      BlastGovernor,
      CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation,
      DeployedContracts[AliasDeployedContracts.SingelTokenVirtualRewarderUpgradeable_Implementation],
      DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.RouterV2PathProviderUpgradeable_Proxy],
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

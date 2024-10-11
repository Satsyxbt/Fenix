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
import { RouterV2PathProviderUpgradeable__factory } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let RouterV2PathProviderUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.RouterV2PathProviderUpgradeable_Implementation],
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.RouterV2PathProviderUpgradeable_Proxy,
    verify: true,
  });

  let RouterV2PathProviderUpgradeable = await ethers.getContractAt(
    InstanceName.RouterV2PathProviderUpgradeable,
    RouterV2PathProviderUpgradeable_Proxy.target,
  );
  await logTx(
    RouterV2PathProviderUpgradeable,
    RouterV2PathProviderUpgradeable.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.RouterV2],
    ),
  );

  let CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Implementation],
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
      DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation],
      DeployedContracts[AliasDeployedContracts.SingelTokenVirtualRewarderUpgradeable_Implementation],
      DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
      RouterV2PathProviderUpgradeable_Proxy.target,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

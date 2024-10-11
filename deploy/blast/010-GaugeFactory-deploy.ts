import {
  AliasDeployedContracts,
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
  const ProxyAdmin = await getProxyAdminAddress();

  const Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation],
    admin: ProxyAdmin,
    saveAlias: AliasDeployedContracts.GaugeFactory_V2Pools_Proxy,
    verify: true,
  });

  const Proxy2 = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation],
    admin: ProxyAdmin,
    saveAlias: AliasDeployedContracts.GaugeFactory_V3Pools_Proxy,
    verify: true,
  });

  const GaugeFactory_V2Pools_Proxy = await ethers.getContractAt(InstanceName.GaugeFactoryUpgradeable, Proxy.target);
  const GaugeFactory_V3Pools_Proxy = await ethers.getContractAt(InstanceName.GaugeFactoryUpgradeable, Proxy2.target);

  await logTx(
    GaugeFactory_V2Pools_Proxy,
    GaugeFactory_V2Pools_Proxy.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation],
      DeployedContracts[AliasDeployedContracts.MerklGaugeMiddleman],
    ),
  );
  await logTx(
    GaugeFactory_V3Pools_Proxy,
    GaugeFactory_V3Pools_Proxy.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation],
      DeployedContracts[AliasDeployedContracts.MerklGaugeMiddleman],
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

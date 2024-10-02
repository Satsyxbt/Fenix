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
import { GaugeFactoryUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const GaugeUpgradeable_Implementation = await deploy({
    name: InstanceName.GaugeUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.GaugeUpgradeable_Implementation,
    verify: true,
  });

  const GaugeFactoryUpgradeable_Implementation = (await deploy({
    name: InstanceName.GaugeFactoryUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation,
    verify: true,
  })) as GaugeFactoryUpgradeable;

  const Proxy = await deployProxy({
    deployer: deployer,
    logic: await GaugeFactoryUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.GaugeFactory_V2Pools_Proxy,
    verify: true,
  });

  const Proxy2 = await deployProxy({
    deployer: deployer,
    logic: await GaugeFactoryUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
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
      GaugeUpgradeable_Implementation.target,
      DeployedContracts[AliasDeployedContracts.MDCBlastMock],
    ),
  );
  await logTx(
    GaugeFactory_V3Pools_Proxy,
    GaugeFactory_V3Pools_Proxy.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
      GaugeUpgradeable_Implementation.target,
      DeployedContracts[AliasDeployedContracts.MDCBlastMock],
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

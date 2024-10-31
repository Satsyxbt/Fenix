import { ethers } from 'hardhat';
import { GaugeType } from '../../utils/Constants';
import { AliasDeployedContracts, deploy, getBlastGovernorAddress, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const BlastGovernor = await getBlastGovernorAddress();

  let V2GaugeUpgradeable_Implementation = await deploy({
    name: InstanceName.GaugeUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.GaugeUpgradeable_V2Pools_Implementation,
    verify: true,
    constructorArguments: [BlastGovernor, GaugeType.V2PairsGauge],
  });

  let V3GaugeUpgradeable_Implementation = await deploy({
    name: InstanceName.GaugeUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.GaugeUpgradeable_V3Pools_Implementation,
    verify: true,
    constructorArguments: [BlastGovernor, GaugeType.V3PairsGauge],
  });

  const GaugeFactory_V2Pools_Proxy = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactory_V2Pools_Proxy],
  );

  await logTx(GaugeFactory_V2Pools_Proxy, GaugeFactory_V2Pools_Proxy.changeImplementation(V2GaugeUpgradeable_Implementation.target));

  const GaugeFactory_V3Pools_Proxy = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactory_V3Pools_Proxy],
  );
  await logTx(GaugeFactory_V3Pools_Proxy, GaugeFactory_V3Pools_Proxy.changeImplementation(V3GaugeUpgradeable_Implementation.target));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

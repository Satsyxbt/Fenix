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

  let GaugeFactoryV2 = await ethers.getContractAt(
    'GaugeFactoryUpgradeable',
    DeployedContracts[AliasDeployedContracts.GaugeFactory_V2Pools_Proxy],
  );
  let GaugeFactoryV3 = await ethers.getContractAt(
    'GaugeFactoryUpgradeable',
    DeployedContracts[AliasDeployedContracts.GaugeFactory_V3Pools_Proxy],
  );

  await logTx(GaugeFactoryV2, GaugeFactoryV2.setMerklGaugeMiddleman(DeployedContracts[AliasDeployedContracts.GaugeRewader_Proxy]));

  await logTx(GaugeFactoryV3, GaugeFactoryV3.setMerklGaugeMiddleman(DeployedContracts[AliasDeployedContracts.GaugeRewader_Proxy]));

  console.log('Set GaugeRewarder as Middleman in all deployed Gauges');
  let VoterUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.VoterUpgradeable,
    DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );

  let counts = await VoterUpgradeable_Proxy.poolsCounts();

  for (let i = 0; i < counts.totalCount; i++) {
    let pool = await VoterUpgradeable_Proxy.pools(i);
    let gauge = await VoterUpgradeable_Proxy.poolToGauge(pool);

    let GaugeUpgradeable = await ethers.getContractAt(InstanceName.GaugeUpgradeable, gauge);
    await logTx(GaugeUpgradeable, GaugeUpgradeable.setMerklGaugeMiddleman(DeployedContracts[AliasDeployedContracts.GaugeRewader_Proxy]));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

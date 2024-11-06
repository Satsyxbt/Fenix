import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import { AliasDeployedContracts, InstanceName } from '../utils/Names';
import { getDeployedContractsAddressList } from '../utils/Utils';
import { getPools } from './utils';

import AllConfigs from './config';
const Config = AllConfigs['get-state'];

task('gauge-middleman-params-check', 'gauge-middleman-params-check').setAction(async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  const deployData = await getDeployedContractsAddressList(hre);
  const [deployer] = await hre.ethers.getSigners();

  const VoterUpgradeable = await hre.ethers.getContractAt(
    InstanceName.VoterUpgradeable,
    deployData[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );
  const MerklGaugeMiddleman = await hre.ethers.getContractAt(
    InstanceName.MerklGaugeMiddleman,
    deployData[AliasDeployedContracts.MerklGaugeMiddleman],
  );
  const pools = await getPools(Config.chains[hre.network.name].algebraTheGraph);
  let poolsInfo: any[] = await Promise.all(
    pools.map(async (pool: string) => {
      let gauge = await hre.ethers.getContractAt('GaugeUpgradeable', await VoterUpgradeable.poolToGauge(pool));
      let gaugeParams = await MerklGaugeMiddleman.gaugeParams(gauge);

      return {
        gauge: gauge.target.toString(),
        pool: pool,
        uniV3Pool: gaugeParams.uniV3Pool,
        eq: pool.toLocaleLowerCase() === gaugeParams.uniV3Pool.toLocaleLowerCase(),
        rewardToken: gaugeParams.rewardToken,
        numEpooch: gaugeParams.numEpoch,
      };
    }),
  );

  console.log(JSON.stringify(poolsInfo, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2));
});

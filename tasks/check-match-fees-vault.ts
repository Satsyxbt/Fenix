import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import { AliasDeployedContracts, InstanceName } from '../utils/Names';
import { getDeployedContractsAddressList } from '../utils/Utils';
import { getPools } from './utils';

import AllConfigs from './config';
const Config = AllConfigs['get-state'];

task('check-match-fees-vault', 'check-match-fees-vault').setAction(async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  const deployData = await getDeployedContractsAddressList(hre);
  const [deployer] = await hre.ethers.getSigners();

  const PairFactory = await hre.ethers.getContractAt(
    InstanceName.PairFactoryUpgradeable,
    deployData[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
  );
  const VoterUpgradeable = await hre.ethers.getContractAt(
    InstanceName.VoterUpgradeable,
    deployData[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );
  const FeesVaultFactoryUpgradeable = await hre.ethers.getContractAt(
    InstanceName.FeesVaultFactoryUpgradeable,
    deployData[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
  );
  const pairs: string[] = await PairFactory.pairs();
  const pools = await getPools(Config.chains[hre.network.name].algebraTheGraph);
  let poolsInfo: any[] = await Promise.all(
    pools.map(async (pool: string) => {
      let vaultInPool = await (await hre.ethers.getContractAt('IAlgebraPool', pool)).communityVault();
      let vaultInGauge = await (await hre.ethers.getContractAt('GaugeUpgradeable', await VoterUpgradeable.poolToGauge(pool))).feeVault();
      let vaultInFactory = await FeesVaultFactoryUpgradeable.getVaultForPool(pool);
      let eq: boolean =
        vaultInPool.toLocaleLowerCase() === vaultInGauge.toLocaleLowerCase() &&
        vaultInPool.toLocaleLowerCase() === vaultInFactory.toLocaleLowerCase();
      return {
        equal: eq,
        vaultInPool: vaultInPool,
        vaultInGauge: vaultInGauge,
        vaultInFactory: vaultInFactory,
      };
    }),
  );
  let pairsInfo: any[] = await Promise.all(
    pairs.map(async (pair: string) => {
      let vaultInPool = await (await hre.ethers.getContractAt('Pair', pair)).communityVault();
      let vaultInGauge = await (await hre.ethers.getContractAt('GaugeUpgradeable', await VoterUpgradeable.poolToGauge(pair))).feeVault();
      let vaultInFactory = await FeesVaultFactoryUpgradeable.getVaultForPool(pair);
      let eq: boolean =
        vaultInPool.toLocaleLowerCase() === vaultInGauge.toLocaleLowerCase() &&
        vaultInPool.toLocaleLowerCase() === vaultInFactory.toLocaleLowerCase();
      return {
        equal: eq,
        vaultInPool: vaultInPool,
        vaultInGauge: vaultInGauge,
        vaultInFactory: vaultInFactory,
      };
    }),
  );

  const result = {
    poolsInfo,
    pairsInfo,
  };

  console.log(JSON.stringify(result, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2));
});

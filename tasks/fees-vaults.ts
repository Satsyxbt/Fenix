import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getDeployedContractsAddressList } from '../utils/Utils';
import { AliasDeployedContracts, InstanceName } from '../utils/Names';

import Pools from './pools.json';

// Define the custom task
task('fees-vault', 'get fees vaults for target addresses').setAction(async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  const deployData = await getDeployedContractsAddressList(hre);
  const [deployer] = await hre.ethers.getSigners();
  console.log('Current deployer:', deployer.address);
  console.log('Proccessing...');

  const FeesVaultFactoryUpgradeable = await hre.ethers.getContractAt(
    InstanceName.FeesVaultFactoryUpgradeable,
    deployData[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
  );

  type Result = {
    pool: string;
    vault: string;
  };
  let results: Result[] = [];
  for (let i = 0; i < Pools.length; i++) {
    const pool = Pools[i];
    try {
      const vault = await FeesVaultFactoryUpgradeable.getVaultForPool(pool);
      results.push({ pool, vault });
    } catch (error) {
      results.push({ pool, vault: 'Error' });
      console.error(`Failed to get FeesVaullt for ${pool}`, error);
    }
  }

  const table = new Table({
    head: [chalk.cyan('Pool'), chalk.cyan('Vault')],
    colWidths: [60, 60],
  });

  for (const result of results) {
    table.push([result.pool, result.vault]);
  }
  results = Array.of(...results.map((t) => t.vault));
  console.log(JSON.stringify(results, null, 2));
  console.log(table.toString());
});

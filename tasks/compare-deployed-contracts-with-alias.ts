import { task } from 'hardhat/config';
import type { TaskArguments } from 'hardhat/types';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getDeployedContractsAddressList } from '../utils/Utils';
import { AliasDeployedContracts } from '../utils/Names';

// Function to get deploy data

// Define the custom task
task('compare-deployed-contracts-with-alias', 'Compares AliasDeployedContracts with deploys.json').setAction(async function (
  taskArguments: TaskArguments,
  hre,
) {
  const deployData = await getDeployedContractsAddressList(hre);
  const aliasKeys = Object.keys(AliasDeployedContracts);
  const deployKeys = Object.keys(deployData);

  const missingInAlias: string[] = [];
  const missingInDeploys: string[] = [];

  for (const key of deployKeys) {
    if (!aliasKeys.includes(key)) {
      missingInAlias.push(key);
    }
  }

  for (const key of aliasKeys) {
    if (!deployKeys.includes(key)) {
      missingInDeploys.push(key);
    }
  }

  missingInAlias.sort();
  missingInDeploys.sort();

  const table = new Table({
    head: [chalk.cyan('Missing in deploys.json'), chalk.cyan('Missing in AliasDeployedContracts')],
    colWidths: [60, 60],
  });

  const maxLength = Math.max(missingInAlias.length, missingInDeploys.length);

  for (let i = 0; i < maxLength; i++) {
    table.push([missingInDeploys[i] || '', missingInAlias[i] || '']);
  }

  console.log(table.toString());

  if (missingInAlias.length === 0 && missingInDeploys.length === 0) {
    console.log(chalk.green('All aliases and deploys match!'));
  }
});

export default {};

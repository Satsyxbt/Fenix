import { task } from 'hardhat/config';
import type { TaskArguments } from 'hardhat/types';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import Table from 'cli-table3';

// Function to get deploy data
function getDeploysData(deployDataPath: string): any {
  if (!fs.existsSync(deployDataPath)) {
    throw new Error(`Deploy data file does not exist at path: ${deployDataPath}`);
  }
  return JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));
}

// Define the custom task
task('list-deployed-contracts', 'Lists all deployed contracts').setAction(async function (
  taskArguments: TaskArguments,
  { config, network },
) {
  const deployDataPath = path.join(config.paths.root, 'deployments', network.name, 'deploys.json');

  try {
    const deployData = getDeploysData(deployDataPath);

    const table = new Table({
      head: [chalk.cyan('Contract Name'), chalk.cyan('Address')],
      colWidths: [40, 60],
    });

    for (const [contractName, contractAddress] of Object.entries(deployData)) {
      table.push([contractName, contractAddress]);
    }

    console.log(table.toString());
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(chalk.red(`File not found: ${deployDataPath}`));
    } else if (error instanceof SyntaxError) {
      console.error(chalk.red(`Error parsing JSON at ${deployDataPath}: ${error.message}`));
    } else {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  }
});

export default {};

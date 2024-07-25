import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getDeployedContractsAddressList } from '../utils/Utils';
import { InstanceName } from '../utils/Names';
import { THIRD_PART_CONTRACTS } from '../utils/Constants';

// Define the custom task
task('blast-governor-map', 'Calls governorMap(target) on the Blast contract for each deployed contract').setAction(async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  const deployData = await getDeployedContractsAddressList(hre);
  const [deployer] = await hre.ethers.getSigners();
  console.log('Current deployer:', deployer.address);
  console.log('Proccessing...');

  const Blast = await hre.ethers.getContractAt(InstanceName.Blast, THIRD_PART_CONTRACTS.Blast);

  let results = [];

  for (const [contractName, contractAddress] of Object.entries(deployData)) {
    try {
      const governor = await Blast.governorMap(contractAddress);
      results.push({ contractName, contractAddress, governor });
    } catch (error) {
      results.push({ contractName, contractAddress, governor: 'Error' });
      console.error(`Failed to call governorMap on ${contractName} (${contractAddress}):`, error);
    }
  }

  // Sort results by governor address
  results.sort((a, b) => a.governor.localeCompare(b.governor));

  const table = new Table({
    head: [chalk.cyan('Contract Name'), chalk.cyan('Address'), chalk.cyan('Governor')],
    colWidths: [40, 60, 60],
  });

  for (const result of results) {
    table.push([result.contractName, result.contractAddress, result.governor]);
  }

  console.log(table.toString());
});

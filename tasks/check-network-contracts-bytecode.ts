import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import chalk from 'chalk';
import { getDeployedContractsAddressList } from '../utils/Utils';
import fs from 'fs';

// Define the custom task
task('check-network-contracts-bytecode', 'Checks if deployed contracts bytecode matches compiled artifacts').setAction(async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  const deployData = await getDeployedContractsAddressList(hre);
  for (const [alias, contractAddress] of Object.entries(deployData)) {
    try {
      const deployedBytecode = await hre.ethers.provider.getCode(contractAddress as string);

      let matchFound = false;
      const artifactPaths = await hre.artifacts.getArtifactPaths();
      for (const artifactPath of artifactPaths) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

        if (deployedBytecode === artifact.deployedBytecode) {
          console.log(`${alias} (${contractAddress}): ${chalk.green('Match')} with artifact ${artifact.contractName}`);
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        console.log(`${alias} (${contractAddress}): ${chalk.red('No match found')}`);
      }
    } catch (error) {
      console.error(`Failed to check bytecode for ${alias} (${contractAddress}):`, error);
      console.log(`${alias} (${contractAddress}): ${chalk.red('Error')}`);
    }
  }
});

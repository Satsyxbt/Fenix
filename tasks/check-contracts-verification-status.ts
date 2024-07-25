import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import chalk from 'chalk';
import { getDeployedContractsAddressList } from '../utils/Utils';
import { Etherscan } from '@nomicfoundation/hardhat-verify/etherscan';

// Define the custom task
task('check-contracts-verification-status', 'Checks if all deployed contracts are verified on ***scan').setAction(async function (
  taskArguments: TaskArguments,
  hre: HardhatRuntimeEnvironment,
) {
  const deployData = await getDeployedContractsAddressList(hre);

  const chainConfig = await Etherscan.getCurrentChainConfig(hre.network.name, hre.network.provider, hre.config.etherscan.customChains);

  const etherscan = Etherscan.fromChainConfig(hre.config.etherscan.apiKey, chainConfig);

  function t(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  for (const [contractName, contractAddress] of Object.entries(deployData)) {
    try {
      const verified = await etherscan.isVerified(contractAddress as string);
      console.log(`${contractName}(${contractAddress}): ${verified ? chalk.green('Yes') : chalk.red('No')}`);
    } catch (error) {
      console.error(`Failed to check verification status for ${contractName} (${contractAddress}):`, error);
      console.log(`${contractName}(${contractAddress}): ${chalk.red('Error')}`);
    }
    await t(1000);
  }
});

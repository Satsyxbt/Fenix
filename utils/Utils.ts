import { HardhatRuntimeEnvironment } from 'hardhat/types';

import path from 'path';
import fs from 'fs';

export const getDeploysDataPath = ({ config, network }: HardhatRuntimeEnvironment) => {
  return path.join(config.paths.root, 'deployments', network.name, 'deploys.json');
};

export const getDeployedContractsAddressList = async (hre: HardhatRuntimeEnvironment) => {
  const deployDataPath = getDeploysDataPath(hre);
  if (!fs.existsSync(deployDataPath)) {
    throw new Error(`Deploy data file does not exist at path: ${deployDataPath}`);
  }
  return JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));
};

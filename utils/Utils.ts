import { HardhatRuntimeEnvironment } from 'hardhat/types';

import path from 'path';
import fs from 'fs';
import { AliasDeployedContracts, InstanceName } from './Names';

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

export const getGauges = async (hre: HardhatRuntimeEnvironment) => {
  const deployedContracts = await getDeployedContractsAddressList(hre);

  const voter = await hre.ethers.getContractAt(
    InstanceName.VoterUpgradeable,
    deployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );

  const poolCount = (await voter.poolsCounts()).totalCount;
  const pools = [];
  for (let index = 0; index < poolCount; index++) {
    pools.push(await voter.pools(index));
  }
  const gauges = await Promise.all(pools.map((pool) => voter.poolToGauge(pool)));

  return gauges;
};

import { task } from 'hardhat/config';
import type { HardhatRuntimeEnvironment, TaskArguments } from 'hardhat/types';
import { getDeployedContractsAddressList } from '../utils/Utils';
import { AliasDeployedContracts, InstanceName } from '../utils/Names';
import { getPairFactoryState, getPairs, getPairsProtocolFeesState } from './utils';

task('get-state:pairFactory', '').setAction(async function (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) {
  const deployData = await getDeployedContractsAddressList(hre);
  const [deployer] = await hre.ethers.getSigners();

  const PairFactory = await hre.ethers.getContractAt(
    InstanceName.PairFactoryUpgradeable,
    deployData[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
  );

  console.log(await getPairFactoryState(PairFactory));
});

task('get-state:pairsProtocolFees', '').setAction(async function (taskArguments: TaskArguments, hre: HardhatRuntimeEnvironment) {
  const deployData = await getDeployedContractsAddressList(hre);
  const [deployer] = await hre.ethers.getSigners();
  const PairFactory = await hre.ethers.getContractAt(
    InstanceName.PairFactoryUpgradeable,
    deployData[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
  );
  console.log(await getPairsProtocolFeesState(PairFactory, await getPairs(PairFactory)));
});

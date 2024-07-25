import hre, { ethers, config, network } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import path from 'path';
import fs from 'fs';
import { verify } from './Verify';
import { AliasDeployedContracts, InstanceName } from './Names';
import * as utils from './Utils';

interface BaseDeployOptions {
  deployer: HardhatEthersSigner;
  name: InstanceName;
  constructorArguments?: any[];
  verify?: boolean;
  saveAlias?: string;
}

interface TransparentProxyDeployOptions {
  deployer: HardhatEthersSigner;
  logic: string;
  admin: string;
  data?: string;
  verify?: boolean;
  saveAlias: string;
}

export const getDeployedContractsAddressList = async () => {
  return utils.getDeployedContractsAddressList(hre);
};

export const getDeployedContractAddress = async (name: AliasDeployedContracts | string) => {
  return (await getDeployedContractsAddressList())[name];
};

export const saveToDeployedContractsAddressList = async (name: string, address: string) => {
  console.log(`Save to deploys.json deployed address of ${name}:${address}`);
  const deployDataPath = utils.getDeploysDataPath(hre);
  let deployData = JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));
  deployData[name] = address;
  fs.writeFileSync(deployDataPath, JSON.stringify(deployData, null, 2), 'utf-8');
  return deployData;
};

export const deploy = async (options: BaseDeployOptions) => {
  console.log(`Starting deployment of ${options.name}...`);

  const constructorArguments = options.constructorArguments || [];

  console.log(`\tConstructor arguments: ${JSON.stringify(constructorArguments)}`);

  const factory = await ethers.getContractFactory(options.name);

  const instance = await factory.connect(options.deployer).deploy(...constructorArguments);

  await instance.waitForDeployment();

  const address = await instance.getAddress();

  const saveAlias = options.saveAlias || options.name;

  console.log(`${options.name} deployed at ${address}`);

  await saveToDeployedContractsAddressList(saveAlias, address);

  if (options.verify || false) {
    await verify(address, constructorArguments);
  }

  return instance;
};

export const deployProxy = async (options: TransparentProxyDeployOptions) => {
  console.log(`Starting deployment of TransparentUpgradeableProxy...`);
  console.log(`\tLogic address: ${options.logic}`);
  console.log(`\tAdmin address: ${options.admin}`);

  const data = options.data || '0x';

  console.log(`\tData: ${data}`);

  const factory = await ethers.getContractFactory(InstanceName.TransparentUpgradeableProxy);

  const instance = await factory.connect(options.deployer).deploy(options.logic, options.admin, data);

  await instance.waitForDeployment();

  const address = await instance.getAddress();

  console.log(`TransparentUpgradeableProxy deployed at ${address}`);

  await saveToDeployedContractsAddressList(options.saveAlias, address);

  if (options.verify || false) {
    await verify(address, [options.logic, options.admin, data]);
  }

  return instance;
};
export { AliasDeployedContracts };

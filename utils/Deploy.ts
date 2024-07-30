import hre, { ethers, config, network } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import path from 'path';
import fs from 'fs';
import { verify } from './Verify';
import { AliasDeployedContracts, InstanceName } from './Names';
import * as utils from './Utils';
import chalk from 'chalk';
import { BaseContract, ContractTransactionResponse } from 'ethers';

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

interface DeployAndUpgradeOptions {
  deployer: HardhatEthersSigner;
  implementationName: InstanceName;
  implementationSaveAlias?: string;
  implementationConstructorArguments?: any[];
  proxyAddress: string;
  proxyAdmin: string;
  verify?: boolean;
}

export const getDeployedContractsAddressList = async () => {
  return utils.getDeployedContractsAddressList(hre);
};

export const getProxyAdminAddress = async () => {
  return await getDeployedContractAddress(AliasDeployedContracts.ProxyAdmin);
};

export const getBlastGovernorAddress = async () => {
  return await getDeployedContractAddress(AliasDeployedContracts.BlastGovernorUpgradeable_Proxy);
};

export const getDeployedContractAddress = async (name: AliasDeployedContracts | string) => {
  return (await getDeployedContractsAddressList())[name];
};

export const saveToDeployedContractsAddressList = async (name: string, address: string) => {
  console.log(`Save to deploys.json deployed address of ${name}:${address}`);
  const deployDataPath = utils.getDeploysDataPath(hre);
  let deployData = JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));

  if (deployData[name]) {
    const existingAddress = deployData[name];
    if (existingAddress.toLowerCase() !== address.toLowerCase()) {
      console.warn(chalk.yellow(`Warning: Address for ${name} is already in the list. It will be replaced.`));
      console.warn(chalk.yellow(`\tExisting address: ${existingAddress}`));
      console.warn(chalk.yellow(`\tNew address: ${address}`));
    }
  }
  deployData[name] = address;
  fs.writeFileSync(deployDataPath, JSON.stringify(deployData, null, 2), 'utf-8');
  return deployData;
};

export async function logTx(contract: BaseContract, transaction: Promise<any>) {
  const tx = await transaction;
  await tx.wait();

  let logMessage = `\tSuccessful transaction`;
  let decodedData;

  try {
    decodedData = contract.interface.parseTransaction({ data: tx.data, value: tx.value });
  } catch (error) {
    console.error(`Error decoding transaction:`, error);
  }

  if (decodedData) {
    const methodName = decodedData.name;
    const args = decodedData.args
      .map((arg: any, index: number) => {
        const argName = decodedData.fragment.inputs[index]?.name || `arg${index}`;
        return `${argName}: ${JSON.stringify(arg.toString())}`;
      })
      .join(', ');
    logMessage = `\tCalled ${contract.constructor.name}(${await contract.getAddress()}).${methodName}(${args})`;
  }

  console.log(logMessage);
  console.log(`\tTransaction hash: ${tx.hash}`);
}

export async function logTransaction(transaction: Promise<any>, methodName: string) {
  console.log(`Calling ${methodName}...`);
  const tx = await transaction;
  await tx.wait();
  console.log(`${methodName} transaction hash: ${tx.hash}`);
}

export const upgradeProxy = async (deployer: HardhatEthersSigner, proxyAdmin: string, proxy: string, newLogic: string) => {
  const ProxyAdmin = await ethers.getContractAt(InstanceName.ProxyAdmin, proxyAdmin);
  console.log(`Upgrading proxy at ${proxy} to new logic at ${newLogic} using ProxyAdmin at ${proxyAdmin}...`);
  await logTransaction(ProxyAdmin.connect(deployer).upgrade(proxy, newLogic), `ProxyAdmin.upgrade(proxy: ${proxy}, newLogic: ${newLogic})`);
};

export const deployNewImplementationAndUpgradeProxy = async (options: DeployAndUpgradeOptions) => {
  console.log(`Start deploy new impelmentations...`);

  const implementation = await deploy({
    deployer: options.deployer,
    name: options.implementationName,
    constructorArguments: options.implementationConstructorArguments,
    verify: options.verify,
    saveAlias: options.implementationSaveAlias,
  });
  console.log(`Start deploy new impelmentations...`);

  await upgradeProxy(options.deployer, options.proxyAdmin, options.proxyAddress, await implementation.getAddress());
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

import fs from 'fs';
import path from 'path';
import hre from 'hardhat';
import { ethers } from 'hardhat';

export function getDeploysData(): any {
  const deployDataPath = path.resolve(__dirname, './deploys.json');
  return JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));
}
export function saveDeploysData(newData: any) {
  const deployDataPath = path.resolve(__dirname, './deploys.json');

  fs.writeFileSync(deployDataPath, JSON.stringify(newData), 'utf-8');
}

export async function deployBase(contractFactoryName: string, name: string) {
  const NAME = name;
  console.log(`Start deploy ${NAME} contract...`);

  let deploysData = getDeploysData();
  if (deploysData[NAME]) {
    console.warn(`${NAME} contract already deployed, skip deployment, address: ${deploysData[NAME]}`);
  } else {
    const factory = await ethers.getContractFactory(contractFactoryName);

    const signers = await ethers.getSigners();
    const deployer = signers[0];
    console.log(`deployer: ${deployer.address}`);

    let contract = await factory.connect(deployer).deploy();
    await contract.waitForDeployment();

    deploysData[NAME] = await contract.getAddress();

    saveDeploysData(deploysData);

    console.log(`Successful deploy ${NAME} contract: ${await contract.getAddress()}`);
    try {
      await hre.run('verify:verify', {
        address: deploysData[NAME],
        constructorArguments: [],
      });
    } catch (e) {
      console.warn('Error with verification proccess');
    }
  }
}
export async function deployProxy(proxyAdmin: string, implementation: string, name: string) {
  const NAME = name;
  console.log(`Start deploy proxy for ${NAME} contract...`);

  let deploysData = getDeploysData();
  if (deploysData[NAME]) {
    console.warn(`${NAME} contract already deployed, skip deployment, address: ${deploysData[NAME]}`);
  } else {
    const factory = await ethers.getContractFactory('TransparentUpgradeableProxy');

    const signers = await ethers.getSigners();
    const deployer = signers[0];
    console.log(`deployer: ${deployer.address}`);
    console.log(`implementation: ${implementation}`);
    console.log(`proxyAdmin: ${proxyAdmin}`);

    let contract = await factory.connect(deployer).deploy(implementation, proxyAdmin, '0x');
    await contract.waitForDeployment();

    deploysData[NAME] = await contract.getAddress();

    saveDeploysData(deploysData);

    console.log(`Successful deploy ${NAME} contract: ${await contract.getAddress()}`);
    return contract;
  }
}

export async function getDeployedDataFromDeploys() {
  let deploysData = getDeploysData();
  return {
    Fenix: await ethers.getContractAt('Fenix', deploysData['Fenix']),
    ProxyAdmin: await ethers.getContractAt('ProxyAdmin', deploysData['ProxyAdmin']),
    BribeFactoryImplementation: await ethers.getContractAt('BribeFactoryUpgradeable', deploysData['BribeFactoryImplementation']),
    BribeImplementation: await ethers.getContractAt('BribeUpgradeable', deploysData['BribeImplementation']),
    FeesVaultImplementation: await ethers.getContractAt('FeesVaultUpgradeable', deploysData['FeesVaultImplementation']),
    GaugeFactoryImplementation: await ethers.getContractAt('GaugeFactoryUpgradeable', deploysData['GaugeFactoryImplementation']),
    GaugeImplementation: await ethers.getContractAt('GaugeUpgradeable', deploysData['GaugeImplementation']),
    MinterImplementation: await ethers.getContractAt('MinterUpgradeable', deploysData['MinterImplementation']),
    PairFactoryImplementation: await ethers.getContractAt('PairFactoryUpgradeable', deploysData['PairFactoryImplementation']),
    VeArtProxyImplementation: await ethers.getContractAt('VeArtProxyUpgradeable', deploysData['VeArtProxyImplementation']),
    VoterImplementation: await ethers.getContractAt('VoterUpgradeable', deploysData['VoterImplementation']),
    VotingEscrowImplementation: await ethers.getContractAt('VotingEscrowUpgradeable', deploysData['VotingEscrowImplementation']),
    BribeFactory: await ethers.getContractAt('BribeFactoryUpgradeable', deploysData['BribeFactory']),
    GaugeFactory: await ethers.getContractAt('GaugeFactoryUpgradeable', deploysData['GaugeFactory']),
    PairFactory: await ethers.getContractAt('PairFactoryUpgradeable', deploysData['PairFactory']),
    Voter: await ethers.getContractAt('VoterUpgradeable', deploysData['Voter']),
    VotingEscrow: await ethers.getContractAt('VotingEscrowUpgradeable', deploysData['VotingEscrow']),
    VeArtProxy: await ethers.getContractAt('VeArtProxyUpgradeable', deploysData['VeArtProxy']),
    Minter: await ethers.getContractAt('MinterUpgradeable', deploysData['Minter']),
    FeesVaultFactory: await ethers.getContractAt('FeesVaultFactory', deploysData['FeesVaultFactory']),
  };
}
export async function deployERC20Faucet(name: string, symbol: string, decimals: number) {
  console.log(`Start deploy ${name} contract...`);

  const factory = await ethers.getContractFactory('ERC20Faucet');

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let contract = await factory.connect(deployer).deploy(name, symbol, decimals);
  await contract.waitForDeployment();

  console.log(`Successful deploy ${name} contract: ${await contract.getAddress()}`);
}

export async function deployERC20Mock(name: string, symbol: string, decimals: number) {
  console.log(`Start deploy ${name} contract...`);

  let deploysData = getDeploysData();
  if (deploysData[name]) {
    console.warn(`${name} contract already deployed, skip deployment, address: ${deploysData[name]}`);
  } else {
    const factory = await ethers.getContractFactory('ERC20Mock');

    const signers = await ethers.getSigners();
    const deployer = signers[0];

    let contract = await factory.connect(deployer).deploy(name, symbol, decimals);
    await contract.waitForDeployment();

    deploysData[name] = await contract.getAddress();

    saveDeploysData(deploysData);

    console.log(`Successful deploy ${name} contract: ${await contract.getAddress()}`);
    try {
      await hre.run('verify:verify', {
        address: deploysData[name],
        constructorArguments: [deployer.address, deployer.address],
      });
    } catch (e) {
      console.warn('Error with verification proccess');
    }
  }
}

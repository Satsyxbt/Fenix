import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable,
  BribeUpgradeable__factory,
  ERC20Mock,
  ERC20Mock__factory,
  EmissionManagerUpgradeable__factory,
  Fenix,
  Fenix__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
  VeArtProxyUpgradeable,
  VeArtProxyUpgradeable__factory,
  EmissionManagerUpgradeable,
  DynamicFeeModuleTest,
} from '../../typechain-types/index';
import { PairFactoryUpgradeable } from '../../typechain-types/contracts/dex/v2/thena';
import { UniswapV3Pool } from '../../typechain-types/contracts/dex/v3/core';

async function deployToken(name: string, symbol: string, decimals: number) {
  const erc20Factory = (await ethers.getContractFactory('ERC20Mock')) as ERC20Mock__factory;
  return await erc20Factory.deploy(name, symbol, decimals);
}
async function factoryV3Fixture(deployer: HardhatEthersSigner, proxyAdmin: HardhatEthersSigner): Promise<FenixV3Factory> {
  const DynamicFeeModuleFactory = await ethers.getContractFactory('DynamicFeeModuleTest');

  const poolFactory = await ethers.getContractFactory('UniswapV3Pool');
  const feeSplitterTestFactory = await ethers.getContractFactory('FeeSplitterTest');
  const voterTestFactory = await ethers.getContractFactory('VoterTest');
  const voter = (await voterTestFactory.deploy()) as any as VoterTest;
  const feeSplitterImplementation = (await feeSplitterTestFactory.deploy()) as any as FeeSplitterTest;
  const poolImplementation = (await poolFactory.deploy()) as any as UniswapV3Pool;
  const factoryFactory = (await ethers.getContractFactory('FenixV3Factory')) as any as FenixV3Factory__factory;

  const feeModule = (await DynamicFeeModuleFactory.deploy()) as any as DynamicFeeModuleTest;

  return (await factoryFactory.deploy(
    poolImplementation.target,
    feeModule.target,
    feeSplitterImplementation.target,
    voter.target,
    deployer.address,
  )) as FenixV3Factory;
}

async function factoryV2Fixture(deployer: HardhatEthersSigner, proxyAdmin: HardhatEthersSigner): Promise<PairFactoryUpgradeable> {
  const PairFactoryUpgradeable = await ethers.getContractFactory('PairFactoryUpgradeable');
  const factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
  const factoryImpl = await PairFactoryUpgradeable.connect(deployer).deploy();
  const proxy = await factoryProxy.connect(deployer).deploy(factoryImpl.target, proxyAdmin.address, '0x');
  const typedFactory = PairFactoryUpgradeable.attach(proxy.target) as PairFactoryUpgradeable;
  await typedFactory.initialize();
  return typedFactory;
}

async function completeFixture(): Promise<{
  wallets: {
    deployer: HardhatEthersSigner;
    otherUser: HardhatEthersSigner;
    others: HardhatEthersSigner[];
  };
  tokens: {
    token18: ERC20Mock;
    token9: ERC20Mock;
    token6: ERC20Mock;
    token21: ERC20Mock;
  };

  proxyAdmin: ProxyAdmin;

  fenix: Fenix;

  emissionManagerProxy: EmissionManagerUpgradeable;
  emissionManagerImplementation: EmissionManagerUpgradeable;

  veArtProxy: VeArtProxyUpgradeable;
  veArtProxyImplementation: VeArtProxyUpgradeable;

  bribeFactoryImplementation: BribeFactoryUpgradeable;
  bribeFactoryProxy: BribeFactoryUpgradeable;

  bribeImplementation: BribeUpgradeable;
}> {
  const [deployer, otherUser, ...others] = await ethers.getSigners();

  const erc20Factory = (await ethers.getContractFactory('ERC20Mock')) as ERC20Mock__factory;

  const tokens = {
    token18: await erc20Factory.deploy('Token18', 'T18', 18),
    token9: await erc20Factory.deploy('Token9', 'T9', 9),
    token6: await erc20Factory.deploy('Token6', 'T6', 6),
    token21: await erc20Factory.deploy('Token21', 'T21', 21),
  };

  const fenixFactory = (await ethers.getContractFactory('Fenix')) as Fenix__factory;

  const fenix = await fenixFactory.connect(deployer).deploy(deployer.address);

  const proxyAdminFacotry = (await ethers.getContractFactory('ProxyAdmin')) as ProxyAdmin__factory;
  const proxyAdmin = await proxyAdminFacotry.deploy();

  const proxyFactory = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;

  const emFactory = (await ethers.getContractFactory('EmissionManagerUpgradeable')) as EmissionManagerUpgradeable__factory;
  const emFactoryImplementation = await emFactory.deploy();
  const emissionManagerProxy = await proxyFactory.deploy(await emFactoryImplementation.getAddress(), await proxyAdmin.getAddress(), '0x');

  const veArtProxyUpgradeableFactory = (await ethers.getContractFactory('VeArtProxyUpgradeable')) as VeArtProxyUpgradeable__factory;
  const veArtProxyImplementation = await veArtProxyUpgradeableFactory.deploy();
  const veArtProxy = await proxyFactory.deploy(await veArtProxyImplementation.getAddress(), await proxyAdmin.getAddress(), '0x');

  const bribeFactoryUpgradeableFactory = (await ethers.getContractFactory('BribeFactoryUpgradeable')) as BribeFactoryUpgradeable__factory;
  const bribeFactoryImplementation = await bribeFactoryUpgradeableFactory.deploy();
  const bribeFactoryProxy = await proxyFactory.deploy(await bribeFactoryImplementation.getAddress(), await proxyAdmin.getAddress(), '0x');

  const bribeUpgradeableFactory = (await ethers.getContractFactory('BribeUpgradeable')) as BribeUpgradeable__factory;
  const bribeUpgradeableImplementation = await bribeUpgradeableFactory.deploy();

  return {
    wallets: {
      deployer: deployer,
      otherUser: otherUser,
      others: others,
    },
    tokens: tokens,
    proxyAdmin: proxyAdmin,
    fenix: fenix,
    emissionManagerProxy: emFactory.attach(await emissionManagerProxy.getAddress()) as EmissionManagerUpgradeable,
    emissionManagerImplementation: emFactoryImplementation,
    veArtProxyImplementation: veArtProxyImplementation,
    veArtProxy: veArtProxyUpgradeableFactory.attach(await veArtProxy.getAddress()) as VeArtProxyUpgradeable,
    bribeFactoryProxy: bribeFactoryUpgradeableFactory.attach(await bribeFactoryProxy.getAddress()) as BribeFactoryUpgradeable,
    bribeFactoryImplementation: bribeFactoryImplementation,
    bribeImplementation: bribeUpgradeableImplementation,
  };
}

export { deployToken, factoryV2Fixture, factoryV3Fixture };
export default completeFixture;

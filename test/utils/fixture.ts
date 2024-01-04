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
} from '../../typechain-types/index';
import { BaseContract } from 'ethers';

async function getImplAndProxyFor(proxyAdmin: ProxyAdmin, contractName: string): Promise<{ implementation; proxy }> {
  const proxyFactory = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
  const factory = await ethers.getContractFactory(contractName);
  const impl = await factory.deploy();
  const proxy = await proxyFactory.deploy(await impl.getAddress(), await proxyAdmin.getAddress(), '0x');
  return {
    implementaions: impl,
    proxy: factory.attach(await proxy.getAddress()),
  };
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

export default completeFixture;

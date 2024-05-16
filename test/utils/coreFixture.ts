import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { getCreateAddress } from 'ethers';
import {
  abi as FACTORY_ABI,
  bytecode as FACTORY_BYTECODE,
} from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraFactoryUpgradeable.sol/AlgebraFactoryUpgradeable.json';

import {
  abi as POOL_DEPLOYER_ABI,
  bytecode as POOL_DEPLOYER_BYTECODE,
} from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPoolDeployer.sol/AlgebraPoolDeployer.json';
import {
  abi as ALGEBRA_COMMUNITY_VAULT_ABI,
  bytecode as ALGEBRA_COMMUNITY_VAULT_BYTECODE,
} from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraCommunityVault.sol/AlgebraCommunityVault.json';

import {
  ERC20Mock,
  Solex,
  PairFactoryUpgradeable,
  TransparentUpgradeableProxy,
  VeArtProxyUpgradeable,
  VoterUpgradeable,
  VoterUpgradeable__factory,
  VotingEscrowUpgradeable,
  PairFactoryUpgradeable__factory,
  FeesVaultUpgradeable,
  GaugeFactoryUpgradeable,
  GaugeUpgradeable,
  BribeUpgradeable,
  BribeFactoryUpgradeable,
  MerklGaugeMiddleman,
  MerkleDistributionCreatorMock,
  MinterUpgradeable,
  Pair,
  VeBoostUpgradeable,
  VeTokenDistributorUpgradeable,
  FeesVaultFactoryUpgradeable,
  FeesVaultFactoryUpgradeable__factory,
  ModeSfsMock,
} from '../../typechain-types';
import {
  AlgebraCommunityVault,
  IAlgebraFactory,
  AlgebraPoolDeployer,
  AlgebraFactoryUpgradeable,
} from '../../lib/fenix-dex-v3/src/core/typechain';

export type SignersList = {
  deployer: HardhatEthersSigner;
  fenixTeam: HardhatEthersSigner;
  proxyAdmin: HardhatEthersSigner;
  otherUser1: HardhatEthersSigner;
  otherUser2: HardhatEthersSigner;
  otherUser3: HardhatEthersSigner;
  otherUser4: HardhatEthersSigner;
  otherUser5: HardhatEthersSigner;
};
export type CoreFixtureDeployed = {
  signers: SignersList;
  voter: VoterUpgradeable;
  solex: Solex;
  minter: MinterUpgradeable;
  veArtProxy: VeArtProxyUpgradeable;
  veArtProxyImplementation: VeArtProxyUpgradeable;
  votingEscrow: VotingEscrowUpgradeable;
  v2PairFactory: PairFactoryUpgradeable;
  v2PairImplementation: Pair;
  gaugeFactory: GaugeFactoryUpgradeable;
  gaugeImplementation: GaugeUpgradeable;
  bribeFactory: BribeFactoryUpgradeable;
  bribeImplementation: BribeUpgradeable;
  merklGaugeMiddleman: MerklGaugeMiddleman;
  merklDistributionCreator: MerkleDistributionCreatorMock;
  feesVaultImplementation: FeesVaultUpgradeable;
  feesVaultFactory: FeesVaultFactoryUpgradeable;
  veBoost: VeBoostUpgradeable;
  veTokenDistributor: VeTokenDistributorUpgradeable;
  modeSfs: ModeSfsMock;
  sfsAssignTokenId: 1;
  fenix: Solex;
};

export async function deployERC20MockToken(
  deployer: HardhatEthersSigner,
  name: string,
  symbol: string,
  decimals: number,
): Promise<ERC20Mock> {
  const factory = await ethers.getContractFactory('ERC20Mock');
  return await factory.connect(deployer).deploy(name, symbol, decimals);
}

export async function deployMerklDistributionCreatorMock(deployer: HardhatEthersSigner): Promise<MerkleDistributionCreatorMock> {
  const factory = await ethers.getContractFactory('MerkleDistributionCreatorMock');
  return await factory.connect(deployer).deploy();
}

export async function deployTransaperntUpgradeableProxy(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  implementation: string,
): Promise<TransparentUpgradeableProxy> {
  const factory = await ethers.getContractFactory('TransparentUpgradeableProxy');
  return (await factory.connect(deployer).deploy(implementation, proxyAdmin, '0x')) as any as TransparentUpgradeableProxy;
}

export async function deployMinter(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  voter: string,
  votingEscrow: string,
): Promise<MinterUpgradeable> {
  const factory = await ethers.getContractFactory('MinterUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as MinterUpgradeable;
  await attached.initialize(modeSfs, assignTokenId, voter, votingEscrow);
  return attached;
}

export async function deployVeFnxDistributor(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  fenix: string,
  votingEscrow: string,
): Promise<VeTokenDistributorUpgradeable> {
  const factory = await ethers.getContractFactory('VeTokenDistributorUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as VeTokenDistributorUpgradeable;
  await attached.initialize(modeSfs, assignTokenId, fenix, votingEscrow);
  return attached;
}

export async function deployFenixToken(deployer: HardhatEthersSigner, modeSfs: string, minter: string): Promise<Solex> {
  const factory = await ethers.getContractFactory('Solex');
  return await factory.connect(deployer).deploy(modeSfs, minter);
}

export async function deployArtProxy(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
): Promise<{ instance: VeArtProxyUpgradeable; implementation: VeArtProxyUpgradeable }> {
  const factory = await ethers.getContractFactory('VeArtProxyUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as VeArtProxyUpgradeable;

  return { instance: attached, implementation: implementation };
}

export async function deployVotingEscrow(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  tokenAddr: string,
  veArtProxy: string,
): Promise<VotingEscrowUpgradeable> {
  const factory = await ethers.getContractFactory('VotingEscrowUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as VotingEscrowUpgradeable;

  await attached.initialize(modeSfs, assignTokenId, tokenAddr, veArtProxy);
  return attached;
}

export async function deployVoterWithoutInitialize(deployer: HardhatEthersSigner, proxyAdmin: string): Promise<VoterUpgradeable> {
  const factory = (await ethers.getContractFactory('VoterUpgradeable')) as VoterUpgradeable__factory;
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  return factory.attach(proxy.target) as any as VoterUpgradeable;
}
export async function deployVoter(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  votingEscrow: string,
  v2PairFactory: string,
  v2GaugeFactory: string,
  bribeFactory: string,
): Promise<VoterUpgradeable> {
  const factory = (await ethers.getContractFactory('VoterUpgradeable')) as VoterUpgradeable__factory;
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as VoterUpgradeable;
  await attached.initialize(modeSfs, assignTokenId, votingEscrow, v2PairFactory, v2GaugeFactory, bribeFactory);

  return attached;
}

export async function deployCommunityVaultFeeImplementation(deployer: HardhatEthersSigner): Promise<FeesVaultUpgradeable> {
  const factory = await ethers.getContractFactory('FeesVaultUpgradeable');
  return await factory.connect(deployer).deploy();
}

export async function deployCommunityVaultFeeFactory(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  voter: string,
  communityFeeVaultImplementation: string,
): Promise<FeesVaultFactoryUpgradeable> {
  const factory = (await ethers.getContractFactory('FeesVaultFactoryUpgradeable')) as FeesVaultFactoryUpgradeable__factory;
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as FeesVaultFactoryUpgradeable;
  await attached.connect(deployer).initialize(modeSfs, assignTokenId, voter, communityFeeVaultImplementation, {
    toGaugeRate: 10000,
    recipients: [],
    rates: [],
  });

  return attached;
}

export async function deployV2PairFactory(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  pairImplementation: string,
  communityVaultFeeFactory: string,
): Promise<PairFactoryUpgradeable> {
  const factory = (await ethers.getContractFactory('PairFactoryUpgradeable')) as PairFactoryUpgradeable__factory;
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as PairFactoryUpgradeable;
  await attached.connect(deployer).initialize(modeSfs, assignTokenId, pairImplementation, communityVaultFeeFactory);

  return attached;
}

export async function deployGaugeImplementation(deployer: HardhatEthersSigner): Promise<GaugeUpgradeable> {
  const factory = await ethers.getContractFactory('GaugeUpgradeable');
  return await factory.connect(deployer).deploy();
}

export async function deployBribeImplementation(deployer: HardhatEthersSigner): Promise<BribeUpgradeable> {
  const factory = await ethers.getContractFactory('BribeUpgradeable');
  return await factory.connect(deployer).deploy();
}

export async function deployBribeFactory(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  voter: string,
  bribeImplementation: string,
): Promise<BribeFactoryUpgradeable> {
  const factory = await ethers.getContractFactory('BribeFactoryUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as BribeFactoryUpgradeable;
  await attached.connect(deployer).initialize(modeSfs, assignTokenId, voter, bribeImplementation);
  return attached;
}
export async function deployV2PairImplementation(deployer: HardhatEthersSigner): Promise<Pair> {
  return await ethers.deployContract('Pair');
}
export async function deployGaugeFactory(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  modeSfs: string,
  assignTokenId: number,
  voter: string,
  gaugeImplementation: string,
  merklGaugeMiddleman: string,
): Promise<GaugeFactoryUpgradeable> {
  const factory = await ethers.getContractFactory('GaugeFactoryUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as GaugeFactoryUpgradeable;
  await attached.connect(deployer).initialize(modeSfs, assignTokenId, voter, gaugeImplementation, merklGaugeMiddleman);
  return attached;
}

export async function deployMerklGaugeMiddleman(
  deployer: HardhatEthersSigner,
  modeSfs: string,
  assignTokenId: number,
  solex: string,
  merklDistributionCreator: string,
): Promise<MerklGaugeMiddleman> {
  const factory = await ethers.getContractFactory('MerklGaugeMiddleman');
  return await factory.connect(deployer).deploy(modeSfs, assignTokenId, solex, merklDistributionCreator);
}

export async function getSigners() {
  const signers = await ethers.getSigners();

  return {
    deployer: signers[0],
    fenixTeam: signers[1],
    proxyAdmin: signers[2],
    otherUser1: signers[3],
    otherUser2: signers[4],
    otherUser3: signers[5],
    otherUser4: signers[6],
    otherUser5: signers[7],
  };
}

export interface FactoryFixture {
  factory: AlgebraFactoryUpgradeable;
  vault: AlgebraCommunityVault;
}

export async function deployAlgebraCore(modeSfs: string, sfsAssignTokenId: number): Promise<FactoryFixture> {
  const signers = await getSigners();

  const poolDeployerAddress = getCreateAddress({
    from: signers.deployer.address,
    nonce: (await ethers.provider.getTransactionCount(signers.deployer.address)) + 3,
  });
  const factoryFactory = await ethers.getContractFactory(FACTORY_ABI, FACTORY_BYTECODE);
  const factoryImplementation = await factoryFactory.deploy();

  const factory = factoryFactory.attach(
    (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await factoryImplementation.getAddress()))
      .target,
  ) as any;

  await factory.initialize(modeSfs, sfsAssignTokenId, poolDeployerAddress);

  const poolDeployerFactory = await ethers.getContractFactory(POOL_DEPLOYER_ABI, POOL_DEPLOYER_BYTECODE);
  const poolDeployer = (await poolDeployerFactory.deploy(modeSfs, sfsAssignTokenId, factory)) as any as AlgebraPoolDeployer;

  const vaultFactory = await ethers.getContractFactory(ALGEBRA_COMMUNITY_VAULT_ABI, ALGEBRA_COMMUNITY_VAULT_BYTECODE);
  const vault = (await vaultFactory.deploy(modeSfs, sfsAssignTokenId, factory, signers.deployer.address)) as any as AlgebraCommunityVault;
  return { factory, vault };
}

export async function completeFixture(): Promise<CoreFixtureDeployed> {
  const modeSfs = await ethers.deployContract('ModeSfsMock');
  const modeSfsAddress = await modeSfs.getAddress();
  const sfsAssignTokenId = 1;
  const signers = await getSigners();

  const fenix = await deployFenixToken(signers.deployer, modeSfsAddress, signers.deployer.address);
  const resultArtProxy = await deployArtProxy(signers.deployer, signers.proxyAdmin.address);

  const voter = await deployVoterWithoutInitialize(signers.deployer, signers.proxyAdmin.address);

  const votingEscrow = await deployVotingEscrow(
    signers.deployer,
    signers.proxyAdmin.address,
    modeSfsAddress,
    sfsAssignTokenId,
    await fenix.getAddress(),
    await resultArtProxy.instance.getAddress(),
  );

  const minter = await deployMinter(
    signers.deployer,
    signers.proxyAdmin.address,
    modeSfsAddress,
    sfsAssignTokenId,
    await voter.getAddress(),
    await votingEscrow.getAddress(),
  );
  await votingEscrow.setVoter(voter.target);

  const communityFeeVaultImplementation = await deployCommunityVaultFeeImplementation(signers.deployer);

  const feesVaultFactory = await deployCommunityVaultFeeFactory(
    signers.deployer,
    signers.proxyAdmin.address,
    modeSfsAddress,
    sfsAssignTokenId,
    await voter.getAddress(),
    await communityFeeVaultImplementation.getAddress(),
  );

  const v2PairImplementation = await deployV2PairImplementation(signers.deployer);

  const v2PairFactory = await deployV2PairFactory(
    signers.deployer,
    signers.proxyAdmin.address,
    modeSfsAddress,
    sfsAssignTokenId,
    await v2PairImplementation.getAddress(),
    await feesVaultFactory.getAddress(),
  );

  const bribeImplementation = await deployBribeImplementation(signers.deployer);
  const bribeFactory = await deployBribeFactory(
    signers.deployer,
    signers.proxyAdmin.address,
    modeSfsAddress,
    sfsAssignTokenId,
    await voter.getAddress(),
    await bribeImplementation.getAddress(),
  );

  const merklDistributionCreator = await deployMerklDistributionCreatorMock(signers.deployer);
  const merklGaugeMiddleman = await deployMerklGaugeMiddleman(
    signers.deployer,
    modeSfsAddress,
    sfsAssignTokenId,
    await fenix.getAddress(),
    await merklDistributionCreator.getAddress(),
  );
  const gaugeImplementation = await deployGaugeImplementation(signers.deployer);
  const gaugeFactory = await deployGaugeFactory(
    signers.deployer,
    signers.proxyAdmin.address,
    modeSfsAddress,
    sfsAssignTokenId,
    await voter.getAddress(),
    await gaugeImplementation.getAddress(),
    await merklGaugeMiddleman.getAddress(),
  );

  await voter.initialize(
    modeSfsAddress,
    sfsAssignTokenId,
    await votingEscrow.getAddress(),
    await v2PairFactory.getAddress(),
    await gaugeFactory.getAddress(),
    await bribeFactory.getAddress(),
  );

  await voter.setMinter(minter.target);
  await minter.start();
  await fenix.transferOwnership(minter.target);
  await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), v2PairFactory.target);

  await v2PairFactory.grantRole(await v2PairFactory.PAIRS_CREATOR_ROLE(), signers.deployer.address);
  await v2PairFactory.grantRole(await v2PairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.deployer.address);
  await v2PairFactory.grantRole(await v2PairFactory.FEES_MANAGER_ROLE(), signers.deployer.address);

  let veBoostImpl = await (await ethers.getContractFactory('VeBoostUpgradeable')).deploy();
  let veBoost = (await ethers.getContractFactory('VeBoostUpgradeable')).attach(
    await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await veBoostImpl.getAddress()),
  ) as VeBoostUpgradeable;

  let veFnxDistributor = await deployVeFnxDistributor(
    signers.deployer,
    signers.proxyAdmin.address,
    modeSfsAddress,
    sfsAssignTokenId,
    await fenix.getAddress(),
    await votingEscrow.getAddress(),
  );

  return {
    signers: signers,
    voter: voter,
    solex: fenix,
    minter: minter,
    veArtProxy: resultArtProxy.instance,
    veArtProxyImplementation: resultArtProxy.implementation,
    votingEscrow: votingEscrow,
    v2PairFactory: v2PairFactory,
    v2PairImplementation: v2PairImplementation,
    gaugeFactory: gaugeFactory,
    gaugeImplementation: gaugeImplementation,
    bribeFactory: bribeFactory,
    bribeImplementation: bribeImplementation,
    merklGaugeMiddleman: merklGaugeMiddleman,
    merklDistributionCreator: merklDistributionCreator,
    feesVaultImplementation: communityFeeVaultImplementation,
    feesVaultFactory: feesVaultFactory,
    veBoost: veBoost,
    veTokenDistributor: veFnxDistributor,
    modeSfs: modeSfs,
    sfsAssignTokenId: sfsAssignTokenId,
    fenix: fenix,
  };
}

export default completeFixture;

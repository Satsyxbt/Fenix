import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {
  ERC20Mock,
  Fenix,
  PairFactoryUpgradeable,
  TransparentUpgradeableProxy,
  VeArtProxyUpgradeable,
  VoterUpgradeable,
  VoterUpgradeable__factory,
  VotingEscrowUpgradeable,
  PairFactoryUpgradeable__factory,
  FeesVaultFactory,
  FeesVaultFactory__factory,
  FeesVaultUpgradeable,
  GaugeFactoryUpgradeable,
  GaugeUpgradeable,
  BribeUpgradeable,
  BribeFactoryUpgradeable,
  MerklGaugeMiddleman,
  MerkleDistributionCreatorMock,
  BlastMock__factory,
  MinterUpgradeable,
  Pair,
  ERC20RebasingMock__factory,
} from '../../typechain-types';
import { setCode } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { BLAST_PREDEPLOYED_ADDRESS, USDB_PREDEPLOYED_ADDRESS, WETH_PREDEPLOYED_ADDRESS } from './constants';
import { algebraFactoryFixture } from '../../lib/fenix-dex-v3/src/farming/test/shared';

export type SignersList = {
  deployer: HardhatEthersSigner;
  blastGovernor: HardhatEthersSigner;
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
  fenix: Fenix;
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
  feesVaultFactory: FeesVaultFactory;
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
  return await factory.connect(deployer).deploy(implementation, proxyAdmin, '0x');
}

export async function deployMinter(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  governor: string,
  team: string,
  voter: string,
  votingEscrow: string,
): Promise<MinterUpgradeable> {
  const factory = await ethers.getContractFactory('MinterUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as MinterUpgradeable;
  await attached.initialize(governor, team, voter, votingEscrow);
  return attached;
}

export async function deployFenixToken(deployer: HardhatEthersSigner, governor: string, minter: string): Promise<Fenix> {
  const factory = await ethers.getContractFactory('Fenix');
  return await factory.connect(deployer).deploy(governor, minter);
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
  governor: string,
  tokenAddr: string,
  veArtProxy: string,
): Promise<VotingEscrowUpgradeable> {
  const factory = await ethers.getContractFactory('VotingEscrowUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as VotingEscrowUpgradeable;

  await attached.initialize(governor, tokenAddr, veArtProxy);
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
  governor: string,
  votingEscrow: string,
  v2PairFactory: string,
  v2GaugeFactory: string,
  bribeFactory: string,
): Promise<VoterUpgradeable> {
  const factory = (await ethers.getContractFactory('VoterUpgradeable')) as VoterUpgradeable__factory;
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as VoterUpgradeable;
  await attached.initialize(governor, votingEscrow, v2PairFactory, v2GaugeFactory, bribeFactory);

  return attached;
}

export async function deployCommunityVaultFeeImplementation(deployer: HardhatEthersSigner): Promise<FeesVaultUpgradeable> {
  const factory = await ethers.getContractFactory('FeesVaultUpgradeable');
  return await factory.connect(deployer).deploy();
}

export async function deployCommunityVaultFeeFactory(
  deployer: HardhatEthersSigner,
  governor: string,
  communityFeeVaultImplementation: string,
  voter: string,
): Promise<FeesVaultFactory> {
  const factory = (await ethers.getContractFactory('FeesVaultFactory')) as FeesVaultFactory__factory;
  const instance = await factory.connect(deployer).deploy(governor, communityFeeVaultImplementation, voter);
  return instance;
}

export async function deployV2PairFactory(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  governor: string,
  pairImplementation: string,
  communityVaultFeeFactory: string,
): Promise<PairFactoryUpgradeable> {
  const factory = (await ethers.getContractFactory('PairFactoryUpgradeable')) as PairFactoryUpgradeable__factory;
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as PairFactoryUpgradeable;
  await attached.connect(deployer).initialize(governor, pairImplementation, communityVaultFeeFactory);

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
  governor: string,
  voter: string,
  bribeImplementation: string,
): Promise<BribeFactoryUpgradeable> {
  const factory = await ethers.getContractFactory('BribeFactoryUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as BribeFactoryUpgradeable;
  await attached.connect(deployer).initialize(governor, voter, bribeImplementation);
  return attached;
}
export async function deployV2PairImplementation(deployer: HardhatEthersSigner): Promise<Pair> {
  return await ethers.deployContract('Pair');
}
export async function deployGaugeFactory(
  deployer: HardhatEthersSigner,
  proxyAdmin: string,
  governor: string,
  voter: string,
  gaugeImplementation: string,
  merklGaugeMiddleman: string,
): Promise<GaugeFactoryUpgradeable> {
  const factory = await ethers.getContractFactory('GaugeFactoryUpgradeable');
  const implementation = await factory.connect(deployer).deploy();
  const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
  const attached = factory.attach(proxy.target) as any as GaugeFactoryUpgradeable;
  await attached.connect(deployer).initialize(governor, voter, gaugeImplementation, merklGaugeMiddleman);
  return attached;
}

export async function deployMerklGaugeMiddleman(
  deployer: HardhatEthersSigner,
  governor: string,
  fenix: string,
  merklDistributionCreator: string,
): Promise<MerklGaugeMiddleman> {
  const factory = await ethers.getContractFactory('MerklGaugeMiddleman');
  return await factory.connect(deployer).deploy(governor, fenix, merklDistributionCreator);
}

export async function getSigners() {
  const signers = await ethers.getSigners();

  return {
    deployer: signers[0],
    blastGovernor: signers[1],
    fenixTeam: signers[2],
    proxyAdmin: signers[3],
    otherUser1: signers[4],
    otherUser2: signers[5],
    otherUser3: signers[6],
    otherUser4: signers[7],
    otherUser5: signers[8],
  };
}

export async function completeFixture(isFork: boolean = false): Promise<CoreFixtureDeployed> {
  if (!isFork) {
    await setCode(BLAST_PREDEPLOYED_ADDRESS, BlastMock__factory.bytecode);
  }

  const signers = await getSigners();

  const fenix = await deployFenixToken(signers.deployer, signers.blastGovernor.address, signers.deployer.address);
  const resultArtProxy = await deployArtProxy(signers.deployer, signers.proxyAdmin.address);

  const voter = await deployVoterWithoutInitialize(signers.deployer, signers.proxyAdmin.address);

  const votingEscrow = await deployVotingEscrow(
    signers.deployer,
    signers.proxyAdmin.address,
    signers.blastGovernor.address,
    await fenix.getAddress(),
    await resultArtProxy.instance.getAddress(),
  );

  const minter = await deployMinter(
    signers.deployer,
    signers.proxyAdmin.address,
    signers.blastGovernor.address,
    signers.fenixTeam.address,
    await voter.getAddress(),
    await votingEscrow.getAddress(),
  );
  await votingEscrow.setVoter(voter.target);

  const communityFeeVaultImplementation = await deployCommunityVaultFeeImplementation(signers.deployer);

  const feesVaultFactory = await deployCommunityVaultFeeFactory(
    signers.deployer,
    signers.blastGovernor.address,
    await communityFeeVaultImplementation.getAddress(),
    await voter.getAddress(),
  );

  const v2PairImplementation = await deployV2PairImplementation(signers.deployer);

  const v2PairFactory = await deployV2PairFactory(
    signers.deployer,
    signers.proxyAdmin.address,
    signers.blastGovernor.address,
    await v2PairImplementation.getAddress(),
    await feesVaultFactory.getAddress(),
  );

  const bribeImplementation = await deployBribeImplementation(signers.deployer);
  const bribeFactory = await deployBribeFactory(
    signers.deployer,
    signers.proxyAdmin.address,
    signers.blastGovernor.address,
    await voter.getAddress(),
    await bribeImplementation.getAddress(),
  );

  const merklDistributionCreator = await deployMerklDistributionCreatorMock(signers.deployer);
  const merklGaugeMiddleman = await deployMerklGaugeMiddleman(
    signers.deployer,
    signers.blastGovernor.address,
    await fenix.getAddress(),
    await merklDistributionCreator.getAddress(),
  );
  const gaugeImplementation = await deployGaugeImplementation(signers.deployer);
  const gaugeFactory = await deployGaugeFactory(
    signers.deployer,
    signers.proxyAdmin.address,
    signers.blastGovernor.address,
    await voter.getAddress(),
    await gaugeImplementation.getAddress(),
    await merklGaugeMiddleman.getAddress(),
  );

  await voter.initialize(
    signers.blastGovernor.address,
    await votingEscrow.getAddress(),
    await v2PairFactory.getAddress(),
    await gaugeFactory.getAddress(),
    await bribeFactory.getAddress(),
  );

  await voter.setMinter(minter.target);
  await minter._initialize(1);
  await fenix.transferOwnership(minter.target);
  await feesVaultFactory.setWhitelistedCreatorStatus(v2PairFactory.target, true);

  await v2PairFactory.grantRole(await v2PairFactory.PAIRS_CREATOR_ROLE(), signers.deployer.address);
  await v2PairFactory.grantRole(await v2PairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.deployer.address);
  await v2PairFactory.grantRole(await v2PairFactory.FEES_MANAGER_ROLE(), signers.deployer.address);

  return {
    signers: signers,
    voter: voter,
    fenix: fenix,
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
  };
}

export default completeFixture;

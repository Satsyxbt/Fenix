import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  BribeUpgradeable,
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  ERC20Mock,
  Fenix,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import { WETH_PREDEPLOYED_ADDRESS, ZERO } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  getSigners,
} from '../utils/coreFixture';

describe('Nest Main Contract', function () {
  let signers: SignersList;

  let voter: VoterUpgradeableV2;
  let votingEscrow: VotingEscrowUpgradeableV2;

  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let deployed: CoreFixtureDeployed;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;
  let USDT: ERC20Mock;
  let WETH: ERC20Mock;
  let FENIX: Fenix;
  let USDT_WETH_PAIR: string;
  let WETH_FENIX_PAIR: string;

  let nftToken1 = BigInt(1);
  let nftToken2 = BigInt(2);
  let managedNftId = BigInt(3);
  let nftToken3 = BigInt(4);
  let managedNftId2 = BigInt(5);
  let firstStrategy: CompoundVeFNXManagedNFTStrategyUpgradeable;
  let secondStrategy: CompoundVeFNXManagedNFTStrategyUpgradeable;
  let gauge: string;
  let bribe: BribeUpgradeable;

  const _WEEK = 86400 * 7;

  async function currentEpoch() {
    return Math.floor(Math.floor((await time.latest()) / _WEEK) * _WEEK);
  }

  async function nextEpoch() {
    return Math.floor((await currentEpoch()) + _WEEK);
  }

  async function previuesEpoch() {
    return Math.floor((await currentEpoch()) - _WEEK);
  }

  async function newStrategy() {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await strategyFactory.createStrategy.staticCall('VeMax'),
    );
    await strategyFactory.createStrategy('VeMax');
    return strategy;
  }

  before(async function () {
    deployed = await loadFixture(completeFixture);
    managedNFTManager = deployed.managedNFTManager;
    voter = deployed.voter;
    votingEscrow = deployed.votingEscrow;
    signers = await getSigners();
    USDT = await deployERC20MockToken(signers.deployer, 'USDT', 'USDT', 6);
    WETH = await deployERC20MockToken(signers.deployer, 'WETH', 'WETH', 18);
    FENIX = deployed.fenix;

    strategyFactory = (await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (
            await ethers.deployContract('CompoundVeFNXManagedNFTStrategyFactoryUpgradeable', [signers.blastGovernor.address])
          ).getAddress(),
        )
      ).target,
    )) as CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
    routerV2PathProvider = (await ethers.getContractFactory('RouterV2PathProviderUpgradeable')).attach(
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (await ethers.deployContract('RouterV2PathProviderUpgradeable', [signers.blastGovernor.address])).getAddress(),
        )
      ).target,
    ) as RouterV2PathProviderUpgradeable;

    routerV2 = await ethers.deployContract('RouterV2', [
      signers.blastGovernor.address,
      deployed.v2PairFactory.target,
      WETH_PREDEPLOYED_ADDRESS,
    ]);

    await routerV2PathProvider.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target);

    await strategyFactory.initialize(
      signers.blastGovernor.address,
      (
        await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address])
      ).target,
      (
        await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address])
      ).target,
      managedNFTManager.target,
      routerV2PathProvider.target,
    );
    await voter.setDistributionWindowDuration(3600);
    await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('100'));
    await deployed.v2PairFactory.createPair(USDT.target, WETH.target, false);
    await deployed.v2PairFactory.createPair(FENIX.target, WETH.target, false);

    USDT_WETH_PAIR = await deployed.v2PairFactory.getPair(USDT.target, WETH.target, false);
    await voter.createV2Gauge(USDT_WETH_PAIR);

    WETH_FENIX_PAIR = await deployed.v2PairFactory.getPair(WETH.target, FENIX.target, false);
    await voter.createV2Gauge(WETH_FENIX_PAIR);

    secondStrategy = await newStrategy();
    firstStrategy = await newStrategy();

    await deployed.fenix.approve(votingEscrow.target, ethers.parseEther('100000'));

    await votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
    await votingEscrow.create_lock_for(ethers.parseEther('2'), 182 * 86400, signers.otherUser2.address);
    await managedNFTManager.createManagedNFT(firstStrategy.target);
    await votingEscrow.create_lock_for(ethers.parseEther('3'), 182 * 86400, signers.otherUser3.address);
    await managedNFTManager.createManagedNFT(secondStrategy.target);

    gauge = await voter.poolToGauge(USDT_WETH_PAIR);
    bribe = await ethers.getContractAt('BribeUpgradeable', (await voter.gaugesState(gauge)).externalBribe);
  });

  it('check state before', async () => {
    expect(await votingEscrow.lastMintedTokenId()).to.be.eq(5);
    expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
    expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));
    expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ZERO);
    expect(await votingEscrow.balanceOfNFT(managedNftId2)).to.be.eq(ZERO);
    expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);
    expect(await votingEscrow.balanceOfNFT(nftToken1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));
    expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.2'));
    expect(await votingEscrow.balanceOfNFT(nftToken3)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('0.3'));
  });

  it('check tokens balance', async () => {
    expect(await FENIX.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6'));
    expect(await FENIX.balanceOf(firstStrategy.target)).to.be.eq(ZERO);
    expect(await FENIX.balanceOf(secondStrategy.target)).to.be.eq(ZERO);
  });

  it('first user vote for WETH_FENIX pool', async () => {
    await voter.connect(signers.otherUser1).vote(nftToken1, [WETH_FENIX_PAIR], [1000]);
    expect((await votingEscrow.nftStates(nftToken1)).isVoted).to.be.true;
    expect(await voter.poolVote(nftToken1, 0)).to.be.eq(WETH_FENIX_PAIR);
    expect(await voter.votes(nftToken1, WETH_FENIX_PAIR)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));
  });

  it('fail if user try attach to managed nft', async () => {
    await expect(voter.connect(signers.otherUser1).attachToManagedNFT(nftToken1, managedNftId)).to.be.revertedWithCustomError(
      votingEscrow,
      'TokenVoted',
    );
  });

  it('state before attach', async () => {
    expect(await managedNFTManager.tokensInfo(nftToken2)).to.be.deep.eq([false, 0, 0]);
  });

  it('second user attach to first managed nft', async () => {
    await voter.connect(signers.otherUser2).attachToManagedNFT(nftToken2, managedNftId);
    expect(await managedNFTManager.isAttachedNFT(nftToken2)).to.be.true;
    expect(await managedNFTManager.getAttachedManagedTokenId(nftToken2)).to.be.eq(managedNftId);
  });

  it('state after attach', async () => {
    expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
    expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));
    expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('2'));
    expect(await votingEscrow.balanceOfNFT(managedNftId2)).to.be.eq(ZERO);
    expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('2'));
    expect(await votingEscrow.balanceOfNFT(nftToken1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));
    expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.eq(ZERO);
    expect(await votingEscrow.balanceOfNFT(nftToken3)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('0.3'));

    expect(await managedNFTManager.tokensInfo(nftToken2)).to.be.deep.eq([true, managedNftId, ethers.parseEther('2')]);
    expect(await firstStrategy.balanceOf(nftToken2)).to.be.eq(ethers.parseEther('2'));
    expect(await firstStrategy.totalSupply()).to.be.eq(ethers.parseEther('2'));
  });

  it('check tokens balance', async () => {
    expect(await FENIX.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6'));
    expect(await FENIX.balanceOf(firstStrategy.target)).to.be.eq(ZERO);
    expect(await FENIX.balanceOf(secondStrategy.target)).to.be.eq(ZERO);
  });

  it('authorized user vote by managed nft vote power', async () => {
    expect((await votingEscrow.nftStates(managedNftId)).isVoted).to.be.false;
    expect(await voter.votes(managedNftId, WETH_FENIX_PAIR)).to.be.eq(ZERO);

    await managedNFTManager.setAuthorizedUser(managedNftId, signers.deployer.address);

    await firstStrategy.vote([WETH_FENIX_PAIR, USDT_WETH_PAIR], [500, 500]);

    expect((await votingEscrow.nftStates(managedNftId)).isVoted).to.be.true;
    expect(await voter.votes(managedNftId, WETH_FENIX_PAIR)).to.be.eq(ethers.parseEther('1'));
    expect(await voter.votes(managedNftId, USDT_WETH_PAIR)).to.be.eq(ethers.parseEther('1'));
  });

  it('third user attach to first managed nft', async () => {
    await voter.connect(signers.otherUser3).attachToManagedNFT(nftToken3, managedNftId);
    expect(await managedNFTManager.isAttachedNFT(nftToken3)).to.be.true;
    expect(await managedNFTManager.getAttachedManagedTokenId(nftToken3)).to.be.eq(managedNftId);
  });

  it('state after attach', async () => {
    expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
    expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));
    expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('5'));
    expect(await votingEscrow.balanceOfNFT(managedNftId2)).to.be.eq(ZERO);
    expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('5'));
    expect(await votingEscrow.balanceOfNFT(nftToken1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));
    expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.eq(ZERO);
    expect(await votingEscrow.balanceOfNFT(nftToken3)).to.be.eq(ZERO);

    expect(await managedNFTManager.tokensInfo(nftToken2)).to.be.deep.eq([true, managedNftId, ethers.parseEther('2')]);
    expect(await managedNFTManager.tokensInfo(nftToken3)).to.be.deep.eq([true, managedNftId, ethers.parseEther('3')]);

    expect(await firstStrategy.balanceOf(nftToken2)).to.be.eq(ethers.parseEther('2'));
    expect(await firstStrategy.balanceOf(nftToken3)).to.be.eq(ethers.parseEther('3'));
    expect(await firstStrategy.totalSupply()).to.be.eq(ethers.parseEther('5'));
  });

  it('check tokens balance', async () => {
    expect(await FENIX.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6'));
    expect(await FENIX.balanceOf(firstStrategy.target)).to.be.eq(ZERO);
    expect(await FENIX.balanceOf(secondStrategy.target)).to.be.eq(ZERO);
  });

  it('check update managed nft votes power', async () => {
    expect((await votingEscrow.nftStates(managedNftId)).isVoted).to.be.true;
    expect(await voter.votes(managedNftId, WETH_FENIX_PAIR)).to.be.eq(ethers.parseEther('2.5'));
    expect(await voter.votes(managedNftId, USDT_WETH_PAIR)).to.be.eq(ethers.parseEther('2.5'));
  });

  it('add bribes', async () => {
    await FENIX.approve(bribe.target, ethers.parseEther('1000'));
    await USDT.mint(signers.deployer.address, 100e6);
    await USDT.approve(bribe.target, 50e6);

    await bribe.addRewardToken(USDT.target);
    await bribe.addRewardToken(FENIX.target);
    await bribe.notifyRewardAmount(FENIX.target, ethers.parseEther('100'));
    await bribe.notifyRewardAmount(USDT.target, 50e6);
  });

  it('new epoch', async () => {
    await time.increaseTo((await nextEpoch()) + 3600);

    await voter.distributeAll();
  });

  it('call to get rewards for strategy and users', async () => {
    await firstStrategy.connect(signers.otherUser3).claimBribes([bribe.target], [[USDT.target, FENIX.target]]);
  });

  it('balance after distribute bribes', async () => {
    expect(await FENIX.balanceOf(firstStrategy.target)).to.be.eq(ethers.parseEther('100'));
    expect(await USDT.balanceOf(firstStrategy.target)).to.be.eq(50e6);
  });

  it('compound FENIX for user like rewards', async () => {
    expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('5'));
    await firstStrategy.connect(signers.otherUser2).compound();
    expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('105'));
  });

  it('right calculate user rewards', async () => {
    expect(await firstStrategy.getLockedRewardsBalance(nftToken2)).to.be.eq(ethers.parseEther('40')); // 2-5, from 100
    expect(await firstStrategy.getLockedRewardsBalance(nftToken3)).to.be.eq(ethers.parseEther('60')); // 3-4, from 100
  });

  it('convert USDT to FENIX and compound', async () => {
    await firstStrategy.erc20Recover(USDT.target, signers.deployer.address);
    await FENIX.transfer(firstStrategy.target, ethers.parseEther('10'));
  });

  it('balance after buyback', async () => {
    expect(await FENIX.balanceOf(firstStrategy.target)).to.be.eq(ethers.parseEther('10'));
  });

  it('right calculate user rewards before compound', async () => {
    expect(await firstStrategy.getLockedRewardsBalance(nftToken2)).to.be.eq(ethers.parseEther('40')); // 1-4, from 100
    expect(await firstStrategy.getLockedRewardsBalance(nftToken3)).to.be.eq(ethers.parseEther('60')); // 1-4, from 100
  });

  it('right calculate user rewards after compound', async () => {
    await firstStrategy.compound();
    expect(await firstStrategy.getLockedRewardsBalance(nftToken2)).to.be.eq(ethers.parseEther('44')); // 1-4, from 110
    expect(await firstStrategy.getLockedRewardsBalance(nftToken3)).to.be.eq(ethers.parseEther('66')); // 3-4, from 110
  });

  it('rewards add to permannet lock managed nft balance', async () => {
    expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('115'));
    expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('115'));
  });

  it('second user dettach from managed nft', async () => {
    expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.eq(ZERO);

    await voter.connect(signers.otherUser2).dettachFromManagedNFT(nftToken2);

    expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('69'));

    expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.closeTo(ethers.parseEther('46'), ethers.parseEther('1'));

    expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.closeTo(ethers.parseEther('69'), ethers.parseEther('1'));

    expect(await firstStrategy.balanceOf(nftToken2)).to.be.eq(ZERO);
    expect(await firstStrategy.totalSupply()).to.be.eq(ethers.parseEther('3'));
    expect(await firstStrategy.getLockedRewardsBalance(nftToken2)).to.be.eq(ZERO);
    expect(await firstStrategy.getLockedRewardsBalance(nftToken3)).to.be.eq(ethers.parseEther('66'));

    expect(await FENIX.balanceOf(firstStrategy.target)).to.be.eq(ZERO);
    expect(await FENIX.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('116'));
    expect(await FENIX.balanceOf(signers.otherUser2.address)).to.be.eq(ZERO);
    expect(await FENIX.balanceOf(signers.otherUser3.address)).to.be.eq(ZERO);
  });

  it('check update managed nft votes power', async () => {
    expect((await votingEscrow.nftStates(managedNftId)).isVoted).to.be.true;
    expect(await voter.votes(managedNftId, WETH_FENIX_PAIR)).to.be.eq(ethers.parseEther('34.5'));
    expect(await voter.votes(managedNftId, USDT_WETH_PAIR)).to.be.eq(ethers.parseEther('34.5'));
    await voter.connect(signers.otherUser3).dettachFromManagedNFT(nftToken3);

    expect((await votingEscrow.nftStates(managedNftId)).isVoted).to.be.true;
    expect(await voter.votes(managedNftId, WETH_FENIX_PAIR)).to.be.eq(ZERO);
    expect(await voter.votes(managedNftId, USDT_WETH_PAIR)).to.be.eq(ZERO);
  });
});

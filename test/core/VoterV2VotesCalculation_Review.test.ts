import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect, use } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ONE_ETHER, WEEK, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployAlgebraCore,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../utils/coreFixture';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  Fenix,
  ManagedNFTManagerUpgradeable,
  Pair,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import { ContractTransactionResponse } from 'ethers';
import { pool } from '@cryptoalgebra/integral-core/typechain/contracts/interfaces';
import { bigint } from 'hardhat/internal/core/params/argumentTypes';

describe('VoterV2VotesCalculation_Review', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let Voter: VoterUpgradeableV2;
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let ManagedNFTManager: ManagedNFTManagerUpgradeable;
  let Fenix: Fenix;
  let StrategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;

  async function deployStrategyFactory() {
    StrategyFactory = (await ethers.getContractAt(
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

    await StrategyFactory.initialize(
      signers.blastGovernor.address,
      (
        await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address])
      ).target,
      (
        await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address])
      ).target,
      ManagedNFTManager.target,
      routerV2PathProvider.target,
    );
  }

  async function newStrategy(name: string) {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await StrategyFactory.createStrategy.staticCall(name),
    );
    await StrategyFactory.createStrategy(name);
    return strategy;
  }

  async function newPool(token0: string, token1: string) {
    let t0 = await deployERC20MockToken(signers.deployer, token0, token0, 18);
    let t1 = await deployERC20MockToken(signers.deployer, token1, token1, 18);
    await deployed.v2PairFactory.createPair(t0.target, t1.target, false);
    return deployed.v2PairFactory.getPair(t0.target, t1.target, false);
  }

  let strategies: CompoundVeFNXManagedNFTStrategyUpgradeable[] = [];
  let pools: string[] = [];
  let mVeNfts: bigint[] = [];
  let otherUser1VeNftTokenId: bigint;
  let otherUser2VeNftTokenId: bigint;
  let otherUser3VeNftTokenId: bigint;
  let otherUser4VeNftTokenId: bigint;
  let otherUser5VeNftTokenId: bigint;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    Fenix = deployed.fenix;
    Voter = deployed.voter;
    VotingEscrow = deployed.votingEscrow;
    ManagedNFTManager = deployed.managedNFTManager;

    await deployStrategyFactory();

    for (let index = 0; index < 10; index++) {
      let strategi = await newStrategy('Strategi' + index);
      strategies.push(strategi);
      await ManagedNFTManager.createManagedNFT(strategi.target);
      let mVeNft = await VotingEscrow.lastMintedTokenId();
      mVeNfts.push(mVeNft);

      await ManagedNFTManager.setWhitelistedNFT(mVeNft, true);
      await ManagedNFTManager.setAuthorizedUser(mVeNft, signers.deployer.address);

      let pool = await newPool('token0' + index, 'token1' + index);
      await Voter.createV2Gauge(pool);
      pools.push(pool);
    }

    await Fenix.approve(VotingEscrow.target, ethers.MaxUint256);

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser1.address, false, true, 0);
    otherUser1VeNftTokenId = await VotingEscrow.lastMintedTokenId();

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser2.address, false, true, 0);
    otherUser2VeNftTokenId = await VotingEscrow.lastMintedTokenId();

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser3.address, false, true, 0);
    otherUser3VeNftTokenId = await VotingEscrow.lastMintedTokenId();

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser4.address, false, true, 0);
    otherUser4VeNftTokenId = await VotingEscrow.lastMintedTokenId();

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser5.address, false, true, 0);
    otherUser5VeNftTokenId = await VotingEscrow.lastMintedTokenId();
  });

  it('FIXED: issue, mul two time vote power if use call attach to nest strategy after new epoch', async () => {
    await Voter.connect(signers.otherUser1).attachToManagedNFT(otherUser1VeNftTokenId, mVeNfts[0]); // + 1
    await Voter.connect(signers.otherUser2).attachToManagedNFT(otherUser2VeNftTokenId, mVeNfts[0]); // + 1
    await strategies[0].vote([pools[0]], [100]); // + 1
    await time.increase(86400 * 7);
    let currentEpoch = await deployed.minter.active_period();

    expect(await Voter.weightsPerEpoch(currentEpoch, pools[0])).to.be.eq(ethers.parseEther('200'));
    expect(await Voter.totalWeightsPerEpoch(currentEpoch)).to.be.eq(ethers.parseEther('200'));

    await Voter.distributeAll();

    currentEpoch = await deployed.minter.active_period();
    await Voter.connect(signers.otherUser3).attachToManagedNFT(otherUser3VeNftTokenId, mVeNfts[0]); // + 1
    await Voter.connect(signers.otherUser4).attachToManagedNFT(otherUser4VeNftTokenId, mVeNfts[0]); // + 1

    await strategies[0].vote([pools[0]], [100]); // + 1

    await Voter.connect(signers.otherUser5).attachToManagedNFT(otherUser5VeNftTokenId, mVeNfts[0]); // + 1

    expect(await Voter.weightsPerEpoch(currentEpoch, pools[0])).to.be.eq(ethers.parseEther('500')); // false if present ISSUE
    expect(await Voter.totalWeightsPerEpoch(currentEpoch)).to.be.eq(ethers.parseEther('500'));
  });

  describe('Correctly calcualte voter power with mesh differents actions', async () => {
    async function checkVotesOnZeroState() {
      let currentEpoch = await deployed.minter.active_period();
      let prevEpoch = currentEpoch - BigInt(WEEK);
      let nextEpoch = currentEpoch + BigInt(WEEK);

      expect(await Voter.totalWeightsPerEpoch(currentEpoch)).to.be.eq(ZERO);
      expect(await Voter.totalWeightsPerEpoch(prevEpoch)).to.be.eq(ZERO);
      expect(await Voter.totalWeightsPerEpoch(nextEpoch)).to.be.eq(ZERO);
      for (let index = 0; index < pools.length; index++) {
        expect(await Voter.weightsPerEpoch(currentEpoch, pools[index])).to.be.eq(ZERO);
      }
      for (let index = 1; index <= otherUser5VeNftTokenId; index++) {
        expect(await Voter.poolVoteLength(index)).to.be.eq(ZERO);
      }
    }

    it('during one epoch', async () => {
      await checkVotesOnZeroState();

      await Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[0]], [100]);
      await Voter.connect(signers.otherUser2).vote(otherUser2VeNftTokenId, [pools[0], pools[1]], [100, 100]);
      await Voter.connect(signers.otherUser3).vote(otherUser3VeNftTokenId, [pools[1], pools[2]], [100, 100]);

      await Voter.connect(signers.otherUser4).attachToManagedNFT(otherUser4VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser5).attachToManagedNFT(otherUser5VeNftTokenId, mVeNfts[0]);
      await strategies[0].vote([pools[0]], [100]);

      await Voter.connect(signers.otherUser2).reset(otherUser2VeNftTokenId);
      await Voter.connect(signers.otherUser3).poke(otherUser3VeNftTokenId);

      await Voter.connect(signers.otherUser5).dettachFromManagedNFT(otherUser5VeNftTokenId);

      await Voter.connect(signers.otherUser1).reset(otherUser1VeNftTokenId);

      await Voter.connect(signers.otherUser2).attachToManagedNFT(otherUser2VeNftTokenId, mVeNfts[0]);
      await strategies[0].vote([pools[0]], [100]);

      await Voter.connect(signers.otherUser3).reset(otherUser3VeNftTokenId);
      await Voter.connect(signers.otherUser2).dettachFromManagedNFT(otherUser2VeNftTokenId);
      await Voter.connect(signers.otherUser4).dettachFromManagedNFT(otherUser4VeNftTokenId);
      await Voter.connect(signers.otherUser4).vote(otherUser4VeNftTokenId, [pools[1], pools[2]], [100, 100]);
      await Voter.connect(signers.otherUser4).reset(otherUser4VeNftTokenId);

      await checkVotesOnZeroState();
    });

    it('with include effect actions with second epoch', async () => {
      await checkVotesOnZeroState();

      await Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[0]], [100]);
      await Voter.connect(signers.otherUser2).vote(otherUser2VeNftTokenId, [pools[0], pools[1]], [100, 100]);
      await Voter.connect(signers.otherUser3).vote(otherUser3VeNftTokenId, [pools[1], pools[2]], [100, 100]);

      await Voter.connect(signers.otherUser4).attachToManagedNFT(otherUser4VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser5).attachToManagedNFT(otherUser5VeNftTokenId, mVeNfts[0]);
      await strategies[0].vote([pools[0]], [100]);

      await Voter.connect(signers.otherUser2).reset(otherUser2VeNftTokenId);
      await Voter.connect(signers.otherUser3).poke(otherUser3VeNftTokenId);

      await Voter.connect(signers.otherUser5).dettachFromManagedNFT(otherUser5VeNftTokenId);
      await VotingEscrow.connect(signers.otherUser5).lockPermanent(otherUser5VeNftTokenId);

      await Voter.connect(signers.otherUser1).reset(otherUser1VeNftTokenId);

      await Voter.connect(signers.otherUser2).attachToManagedNFT(otherUser2VeNftTokenId, mVeNfts[0]);
      await strategies[0].vote([pools[0]], [100]);

      await Voter.connect(signers.otherUser3).reset(otherUser3VeNftTokenId);
      await Voter.connect(signers.otherUser2).dettachFromManagedNFT(otherUser2VeNftTokenId);
      await Voter.connect(signers.otherUser4).dettachFromManagedNFT(otherUser4VeNftTokenId);
      await VotingEscrow.connect(signers.otherUser2).lockPermanent(otherUser2VeNftTokenId);
      await VotingEscrow.connect(signers.otherUser4).lockPermanent(otherUser4VeNftTokenId);

      await Voter.connect(signers.otherUser4).vote(otherUser4VeNftTokenId, [pools[1], pools[2]], [100, 100]);
      await Voter.connect(signers.otherUser4).reset(otherUser4VeNftTokenId);

      await Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[0]], [100]);
      await Voter.connect(signers.otherUser2).vote(otherUser2VeNftTokenId, [pools[0], pools[1]], [100, 100]);
      await Voter.connect(signers.otherUser3).attachToManagedNFT(otherUser3VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser4).attachToManagedNFT(otherUser4VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser5).attachToManagedNFT(otherUser5VeNftTokenId, mVeNfts[1]);

      await strategies[0].vote([pools[0]], [100]);
      await strategies[1].vote([pools[0], pools[1]], [100, 100]);

      await time.increase(86400 * 7);
      await Voter.distributeAll();

      await Voter.connect(signers.otherUser1).reset(otherUser1VeNftTokenId);
      await Voter.connect(signers.otherUser3).dettachFromManagedNFT(otherUser3VeNftTokenId);
      await Voter.connect(signers.otherUser4).dettachFromManagedNFT(otherUser4VeNftTokenId);
      await Voter.connect(signers.otherUser5).dettachFromManagedNFT(otherUser5VeNftTokenId);
      await Voter.connect(signers.otherUser3).attachToManagedNFT(otherUser3VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser4).attachToManagedNFT(otherUser4VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser5).attachToManagedNFT(otherUser5VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser3).dettachFromManagedNFT(otherUser3VeNftTokenId);
      await Voter.connect(signers.otherUser4).dettachFromManagedNFT(otherUser4VeNftTokenId);
      await Voter.connect(signers.otherUser5).dettachFromManagedNFT(otherUser5VeNftTokenId);

      await VotingEscrow.connect(signers.otherUser3).lockPermanent(otherUser3VeNftTokenId);
      await VotingEscrow.connect(signers.otherUser4).lockPermanent(otherUser4VeNftTokenId);
      await VotingEscrow.connect(signers.otherUser5).lockPermanent(otherUser5VeNftTokenId);

      await Voter.connect(signers.otherUser1).attachToManagedNFT(otherUser1VeNftTokenId, mVeNfts[0]);
      await Voter.connect(signers.otherUser2).poke(otherUser2VeNftTokenId);
      await Voter.connect(signers.otherUser3).poke(otherUser3VeNftTokenId);
      await Voter.connect(signers.otherUser5).attachToManagedNFT(otherUser5VeNftTokenId, mVeNfts[1]);

      await strategies[0].vote([pools[0], pools[1]], [100, 100]);
      await strategies[1].vote([pools[0]], [100]);

      let currentEpoch = await deployed.minter.active_period();
      await time.increase(86400 * 7);
      await Voter.distributeAll();

      let prevEpoch = currentEpoch - BigInt(WEEK);
      let nextEpoch = currentEpoch + BigInt(WEEK);

      expect(await Voter.totalWeightsPerEpoch(nextEpoch)).to.be.eq(ZERO);
      for (let index = 0; index < pools.length; index++) {
        expect(await Voter.weightsPerEpoch(nextEpoch, pools[index])).to.be.eq(ZERO);
      }

      expect(await Voter.totalWeightsPerEpoch(prevEpoch)).to.be.eq(ethers.parseEther('500'));
      expect(await Voter.weightsPerEpoch(prevEpoch, pools[0])).to.be.eq(ethers.parseEther('400'));
      expect(await Voter.weightsPerEpoch(prevEpoch, pools[1])).to.be.eq(ethers.parseEther('100'));
      expect(await Voter.weightsPerEpoch(prevEpoch, pools[2])).to.be.eq(ZERO);

      expect(await Voter.weightsPerEpoch(currentEpoch, pools[1])).to.be.eq(ethers.parseEther('100'));
      expect(await Voter.weightsPerEpoch(currentEpoch, pools[0])).to.be.eq(ethers.parseEther('200'));

      expect(await Voter.totalWeightsPerEpoch(currentEpoch)).to.be.eq(ethers.parseEther('300'));
      expect(await Voter.weightsPerEpoch(currentEpoch, pools[2])).to.be.eq(ZERO);
    });
  });
});

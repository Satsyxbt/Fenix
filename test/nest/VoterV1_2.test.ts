import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  BaseManagedNFTStrategyUpgradeableMock,
  BaseManagedNFTStrategyUpgradeableMock__factory,
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  ERC20Mock,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VoterUpgradeableV1_2,
  VotingEscrowUpgradeableV1_2,
} from '../../typechain-types';
import { ERRORS, ONE, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  getSigners,
} from '../utils/coreFixture';
import { tokensFixture } from '../../lib/fenix-dex-v3/src/plugin/test/shared/externalFixtures';

describe('VoterUpgradeableV1_2 Contract', function () {
  let signers: SignersList;

  let voter: VoterUpgradeableV1_2;
  let votingEscrow: VotingEscrowUpgradeableV1_2;
  let USDT: ERC20Mock;
  let WETH: ERC20Mock;

  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let deployed: CoreFixtureDeployed;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;

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

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    managedNFTManager = deployed.managedNFTManager;
    voter = deployed.voter;
    votingEscrow = deployed.votingEscrow;
    signers = await getSigners();
    USDT = await deployERC20MockToken(signers.deployer, 'USDT', 'USDT', 6);
    WETH = await deployERC20MockToken(signers.deployer, 'WETH', 'WETH', 18);

    strategyFactory = (await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (await ethers.deployContract('CompoundVeFNXManagedNFTStrategyFactoryUpgradeable')).getAddress(),
        )
      ).target,
    )) as CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
    routerV2PathProvider = (await ethers.getContractFactory('RouterV2PathProviderUpgradeable')).attach(
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (await ethers.deployContract('RouterV2PathProviderUpgradeable')).getAddress(),
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
        await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable')
      ).target,
      (
        await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable')
      ).target,
      managedNFTManager.target,
      routerV2PathProvider.target,
    );
    await voter.setDistributionWindowDuration(3600);
    await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('100'));
  });

  describe('#setManagedNFTManager', async () => {
    it('fail if call from not VoterAdmin', async () => {
      await expect(voter.connect(signers.otherUser1).setManagedNFTManager(signers.otherUser1.address)).to.be.revertedWith('VOTER_ADMIN');
    });
    it('success set new managed nft manager', async () => {
      expect(await voter.managedNFTManager()).to.be.eq(managedNFTManager.target);
      await expect(voter.setManagedNFTManager(signers.otherUser1.address))
        .to.be.emit(voter, 'SetManagedNFTManager')
        .withArgs(signers.otherUser1.address);
      expect(await voter.managedNFTManager()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('Distribution window', async () => {
    describe('#setDistributionWindowDuration', async () => {
      it('fail if call from not VoterAdmin', async () => {
        await expect(voter.connect(signers.otherUser1).setDistributionWindowDuration(3600)).to.be.revertedWith('VOTER_ADMIN');
      });
      it('success set new distribution window', async () => {
        expect(await voter.distributionWindowDuration()).to.be.eq(3600);
        await expect(voter.setDistributionWindowDuration(155)).to.be.emit(voter, 'SetDistributionWindowDuration').withArgs(155);
        expect(await voter.distributionWindowDuration()).to.be.eq(155);
      });
    });
    describe('window after epoch start', async () => {
      it('user cant reset vote during window distribution after change epoch', async () => {
        let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
        );

        await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

        await time.increaseTo(await nextEpoch());

        await expect(voter.connect(signers.otherUser1).reset(userTokenId)).to.be.revertedWith('distribute window');

        await time.increase(await voter.distributionWindowDuration());

        await expect(voter.connect(signers.otherUser1).reset(userTokenId)).to.be.not.reverted;
      });
      it('user cant call poke during window distribution after change epoch', async () => {
        let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
        );

        await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

        await time.increaseTo(await nextEpoch());

        await expect(voter.connect(signers.otherUser1).poke(userTokenId)).to.be.revertedWith('distribute window');

        await time.increase(await voter.distributionWindowDuration());

        await expect(voter.connect(signers.otherUser1).poke(userTokenId)).to.be.not.reverted;
      });

      it('vote cant be called by strategy if managed nft is disabled', async () => {
        let strategy = await newStrategy();
        let tokenId = (await deployed.votingEscrow.tokenId()) + ONE;
        await managedNFTManager.createManagedNFT(strategy.target);
        await managedNFTManager.setAuthorizedUser(tokenId, signers.deployer.address);
        await expect(strategy.vote([], [])).to.be.not.reverted;

        await managedNFTManager.toggleDisableManagedNFT(tokenId);

        await expect(strategy.vote([], [])).to.be.revertedWith('disabled managed nft');
      });

      it('vote cant be called by nft in last hour if not whitelisted', async () => {
        let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
        );

        await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

        await time.increaseTo((await nextEpoch()) - 3600);

        await expect(voter.connect(signers.otherUser1).vote(userTokenId, [], [])).to.be.revertedWith('distribute window');

        await managedNFTManager.setWhitelistedNFT(userTokenId, true);

        await expect(voter.connect(signers.otherUser1).vote(userTokenId, [], [])).to.be.not.reverted;
      });
    });
  });

  describe('attachToManagedNFT', async () => {
    it('fail if call from not owner of nft', async () => {
      await expect(voter.attachToManagedNFT(1, 1)).to.be.revertedWith('!approved/Owner');
    });

    it('fail if try call during window distribution', async () => {
      let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('1'),
        182 * 86400,
        signers.otherUser1.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

      let strategy = await newStrategy();

      let managedTokenId = userTokenId + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);

      await time.increaseTo((await nextEpoch()) - 3600);

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId)).to.be.revertedWith(
        'distribute window',
      );

      await time.increase(await voter.distributionWindowDuration());

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId)).to.be.revertedWith(
        'distribute window',
      );
      await time.increase(await voter.distributionWindowDuration());

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId)).to.be.not.reverted;
    });

    it('success attache and emit event', async () => {
      let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('1'),
        182 * 86400,
        signers.otherUser1.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

      let strategy = await newStrategy();

      let managedTokenId = userTokenId + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId))
        .to.be.emit(voter, 'AttachToManagedNFT')
        .withArgs(userTokenId, managedTokenId);
    });

    it('fail if user already voted', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, WETH.target, false);
      let pair = await deployed.v2PairFactory.getPair(USDT.target, WETH.target, false);
      await voter.createGauge(pair, 0);
      let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('1'),
        182 * 86400,
        signers.otherUser1.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
      let strategy = await newStrategy();
      let managedTokenId = userTokenId + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);
      await voter.connect(signers.otherUser1).vote(userTokenId, [pair], [1000]);
      expect(await votingEscrow.voted(userTokenId)).to.be.true;

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId)).to.be.revertedWith('voted');
    });

    it('should add voting power to managed  nft already voted pools', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, WETH.target, false);
      let pair = await deployed.v2PairFactory.getPair(USDT.target, WETH.target, false);
      await voter.createGauge(pair, 0);
      let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('1'),
        182 * 86400,
        signers.otherUser1.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

      let userTokenId2 = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('11'),
        182 * 86400,
        signers.otherUser2.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('11'), 182 * 86400, signers.otherUser2.address);
      let strategy = await newStrategy();
      let managedTokenId = userTokenId2 + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);

      await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId);
      await managedNFTManager.setAuthorizedUser(managedTokenId, signers.deployer.address);

      await strategy.vote([pair], [1000]);
      expect(await votingEscrow.voted(managedTokenId)).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('1'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('1'));

      await voter.connect(signers.otherUser2).attachToManagedNFT(userTokenId2, managedTokenId);

      expect(await votingEscrow.voted(managedTokenId)).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('12'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('12'));
    });
  });
  describe('dettachFromManagedNFT', async () => {
    it('fail if call from not owner of nft', async () => {
      await expect(voter.dettachFromManagedNFT(1)).to.be.revertedWith('!approved/Owner');
    });

    it('fail if try call during window distribution', async () => {
      let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('1'),
        182 * 86400,
        signers.otherUser1.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

      let strategy = await newStrategy();

      let managedTokenId = userTokenId + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);

      await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId);

      await time.increaseTo((await nextEpoch()) - 3600);

      await expect(voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId)).to.be.revertedWith('distribute window');

      await time.increase(await voter.distributionWindowDuration());

      await expect(voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId)).to.be.revertedWith('distribute window');

      await time.increase(await voter.distributionWindowDuration());

      await expect(voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId)).to.be.not.reverted;
    });

    it('success attache and emit event', async () => {
      let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('1'),
        182 * 86400,
        signers.otherUser1.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

      let strategy = await newStrategy();

      let managedTokenId = userTokenId + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId))
        .to.be.emit(voter, 'AttachToManagedNFT')
        .withArgs(userTokenId, managedTokenId);
    });

    it('should remove voting power frome managed nft already voted pools', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, WETH.target, false);
      let pair = await deployed.v2PairFactory.getPair(USDT.target, WETH.target, false);
      await voter.createGauge(pair, 0);
      let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('1'),
        182 * 86400,
        signers.otherUser1.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
      let userTokenId2 = await deployed.votingEscrow.create_lock_for.staticCall(
        ethers.parseEther('11'),
        182 * 86400,
        signers.otherUser2.address,
      );
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('11'), 182 * 86400, signers.otherUser2.address);
      let strategy = await newStrategy();
      let managedTokenId = userTokenId2 + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);
      await managedNFTManager.setAuthorizedUser(managedTokenId, signers.deployer.address);

      await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId);
      await voter.connect(signers.otherUser2).attachToManagedNFT(userTokenId2, managedTokenId);
      await strategy.vote([pair], [1000]);
      expect(await votingEscrow.voted(managedTokenId)).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('12'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('12'));

      await expect(voter.connect(signers.otherUser1).vote(userTokenId, [pair], [10000])).to.be.reverted;

      await voter.connect(signers.otherUser2).dettachFromManagedNFT(userTokenId2);

      expect(await votingEscrow.voted(managedTokenId)).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('1'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('1'));

      await voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId);

      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ZERO);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ZERO);
    });
  });
});

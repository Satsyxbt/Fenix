import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  ERC20Mock,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import { getAccessControlError, ONE, WETH_PREDEPLOYED_ADDRESS, ZERO } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  getSigners,
} from '../utils/coreFixture';

describe('VoterV2 Contract', function () {
  let signers: SignersList;

  let voter: VoterUpgradeableV2;
  let votingEscrow: VotingEscrowUpgradeableV2;
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
  });

  describe('Distribution window', async () => {
    describe('#setDistributionWindowDuration', async () => {
      it('fail if call from not VoterAdmin', async () => {
        await expect(voter.connect(signers.otherUser1).setDistributionWindowDuration(3600)).to.be.revertedWith(
          getAccessControlError(ethers.id('VOTER_ADMIN_ROLE'), signers.otherUser1.address),
        );
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

        await expect(voter.connect(signers.otherUser1).reset(userTokenId)).to.be.revertedWithCustomError(voter, 'DistributionWindow');

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

        await expect(voter.connect(signers.otherUser1).poke(userTokenId)).to.be.revertedWithCustomError(voter, 'DistributionWindow');

        await time.increase(await voter.distributionWindowDuration());

        await expect(voter.connect(signers.otherUser1).poke(userTokenId)).to.be.not.reverted;
      });

      it('vote cant be called by strategy if managed nft is disabled', async () => {
        let strategy = await newStrategy();
        let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
        await managedNFTManager.createManagedNFT(strategy.target);
        await managedNFTManager.setAuthorizedUser(tokenId, signers.deployer.address);
        await expect(strategy.vote([], [])).to.be.not.reverted;

        await managedNFTManager.toggleDisableManagedNFT(tokenId);

        await expect(strategy.vote([], [])).to.be.revertedWithCustomError(voter, 'DisabledManagedNft');
      });

      it('vote cant be called by nft in last hour if not whitelisted', async () => {
        let userTokenId = await deployed.votingEscrow.create_lock_for.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
        );

        await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

        await time.increaseTo((await nextEpoch()) - 3600);

        await expect(voter.connect(signers.otherUser1).vote(userTokenId, [], [])).to.be.revertedWithCustomError(
          voter,
          'DistributionWindow',
        );

        await managedNFTManager.setWhitelistedNFT(userTokenId, true);

        await expect(voter.connect(signers.otherUser1).vote(userTokenId, [], [])).to.be.not.reverted;
      });
    });
  });

  describe('attachToManagedNFT', async () => {
    it('fail if call from not owner or nft not created', async () => {
      await expect(voter.attachToManagedNFT(1, 1)).to.be.revertedWith('ERC721: invalid token ID');
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

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId)).to.be.revertedWithCustomError(
        voter,
        'DistributionWindow',
      );

      await time.increase(await voter.distributionWindowDuration());

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId)).to.be.revertedWithCustomError(
        voter,
        'DistributionWindow',
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
      await voter.createV2Gauge(pair);
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
      expect((await votingEscrow.nftStates(userTokenId)).isVoted).to.be.true;

      await expect(voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId, managedTokenId)).to.be.revertedWithCustomError(
        votingEscrow,
        'TokenVoted',
      );
    });

    it('should add voting power to managed  nft already voted pools', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, WETH.target, false);
      let pair = await deployed.v2PairFactory.getPair(USDT.target, WETH.target, false);
      await voter.createV2Gauge(pair);
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
      expect((await votingEscrow.nftStates(managedTokenId)).isVoted).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('1'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('1'));

      await voter.connect(signers.otherUser2).attachToManagedNFT(userTokenId2, managedTokenId);

      expect((await votingEscrow.nftStates(managedTokenId)).isVoted).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('12'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('12'));
    });
  });
  describe('dettachFromManagedNFT', async () => {
    it('fail if call from not owner of nft', async () => {
      await expect(voter.dettachFromManagedNFT(1)).to.be.revertedWith('ERC721: invalid token ID');
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

      await expect(voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId)).to.be.revertedWithCustomError(
        voter,
        'DistributionWindow',
      );

      await time.increase(await voter.distributionWindowDuration());

      await expect(voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId)).to.be.revertedWithCustomError(
        voter,
        'DistributionWindow',
      );

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
      await voter.createV2Gauge(pair);
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
      expect((await votingEscrow.nftStates(managedTokenId)).isVoted).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('12'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('12'));

      await expect(voter.connect(signers.otherUser1).vote(userTokenId, [pair], [10000])).to.be.reverted;

      await voter.connect(signers.otherUser2).dettachFromManagedNFT(userTokenId2);

      expect((await votingEscrow.nftStates(managedTokenId)).isVoted).to.be.true;
      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ethers.parseEther('1'));
      expect(await voter.poolVote(managedTokenId, 0)).to.be.eq(pair);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ethers.parseEther('1'));

      await voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId);

      expect(await voter.votes(managedTokenId, pair)).to.be.eq(ZERO);
      expect(await voter.weightsPerEpoch(await currentEpoch(), pair)).to.be.eq(ZERO);
    });
  });
});

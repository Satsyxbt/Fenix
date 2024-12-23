import { expect } from 'chai';
import { ethers } from 'hardhat';

import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import { ONE, ONE_ETHER, WETH_PREDEPLOYED_ADDRESS, ZERO } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployTransaperntUpgradeableProxy, getSigners } from '../utils/coreFixture';

describe('VotingEscrowV2 Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;
  let votingEscrow: VotingEscrowUpgradeableV2;
  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let voter: VoterUpgradeableV2;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;

  const _WEEK = 86400 * 7;

  async function newStrategy() {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await strategyFactory.createStrategy.staticCall('VeMax'),
    );
    await strategyFactory.createStrategy('VeMax');
    return strategy;
  }

  async function currentEpoch() {
    return Math.floor(((await time.latest()) / _WEEK) * _WEEK);
  }

  async function nextEpoch() {
    return Math.floor((await currentEpoch()) + _WEEK);
  }

  async function checkNftState(
    tokenId: bigint,
    expectState: {
      amount?: bigint;
      end?: number;
      isPermanentLocked?: boolean;
      isAttached?: boolean;
      isVoted?: boolean;
      lastTranferBlock?: number;
      pointEpoch?: number;
    },
  ) {
    let nftState = await votingEscrow.nftStates(tokenId);
    if (expectState.amount) {
      expect(nftState.locked.amount).to.be.eq(expectState.amount);
    }
    if (expectState.end) {
      expect(nftState.locked.end).to.be.eq(expectState.end);
    }
    if (expectState.isAttached) {
      expect(nftState.isAttached).to.be.eq(expectState.isAttached);
    }
    if (expectState.isPermanentLocked) {
      expect(nftState.locked.isPermanentLocked).to.be.eq(expectState.isPermanentLocked);
    }
    if (expectState.isVoted) {
      expect(nftState.isVoted).to.be.eq(expectState.isVoted);
    }
    if (expectState.isAttached) {
      expect(nftState.isAttached).to.be.eq(expectState.isAttached);
    }
    if (expectState.lastTranferBlock) {
      expect(nftState.lastTranferBlock).to.be.eq(expectState.lastTranferBlock);
    }
    if (expectState.pointEpoch) {
      expect(nftState.pointEpoch).to.be.eq(expectState.pointEpoch);
    }
  }

  beforeEach(async function () {
    signers = await getSigners();
    deployed = await loadFixture(completeFixture);

    votingEscrow = deployed.votingEscrow;
    managedNFTManager = deployed.managedNFTManager;
    voter = deployed.voter;
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

    await deployed.fenix.approve(votingEscrow.target, ethers.parseEther('100000'));
    await voter.setDistributionWindowDuration(3600);
  });

  describe('generel', async () => {
    describe('#balanceOfNftIgnoreOwnershipChange', async () => {
      it('should always returns current nft balance', async () => {
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, true, false, 0);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.2'));

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await time.increase(91 * 86400);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.2'));

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await votingEscrow.depositFor(1, ethers.parseEther('1'), false, false);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('1.5'), ethers.parseEther('0.3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await votingEscrow.connect(signers.otherUser1).increase_unlock_time(1, 182 * 86400);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('0.3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await time.increase(175 * 86400);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('0.1'), ethers.parseEther('0.2'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await votingEscrow.connect(signers.otherUser1).lockPermanent(1);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await time.increase(160 * 86400);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);

        await votingEscrow.createLockFor(ethers.parseEther('20'), 91 * 86400, signers.otherUser2.address, true, false, 0);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('2'));

        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
        await managedNFTManager.createManagedNFT(strategy.target);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('2'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNFTId)).to.be.eq(ZERO);

        await voter.connect(signers.otherUser1).attachToManagedNFT(ONE, managedNFTId);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('2'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNFTId)).to.be.eq(ethers.parseEther('3'));

        await time.increase(210 * 86400);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNFTId)).to.be.eq(ethers.parseEther('3'));

        let tx = await votingEscrow.connect(signers.otherUser2).withdraw(2);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Withdraw')
          .withArgs(signers.otherUser2, 2, ethers.parseEther('20'), (await tx.getBlock())?.timestamp);
        await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(signers.otherUser2.address, ethers.ZeroAddress, 2);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNFTId)).to.be.eq(ethers.parseEther('3'));

        await voter.connect(signers.otherUser1).dettachFromManagedNFT(ONE);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('0.3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNFTId)).to.be.eq(ZERO);

        await votingEscrow.connect(signers.otherUser1).lockPermanent(ONE);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNFTId)).to.be.eq(ZERO);
        await votingEscrow.connect(signers.otherUser1).unlockPermanent(ONE);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('2.9'), ethers.parseEther('0.099'));
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNFTId)).to.be.eq(ZERO);
      });
    });
    describe('increase_unlock_time', async () => {
      it('fail if try increase unlcok time for permanent lock', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        await votingEscrow.connect(signers.otherUser1).lockPermanent(ONE);
        await expect(votingEscrow.connect(signers.otherUser1).increase_unlock_time(ONE, 1)).to.be.revertedWithCustomError(
          votingEscrow,
          'PermanentLocked',
        );
      });

      it('fail if try call from not nft owner', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        await expect(votingEscrow.increase_unlock_time(ONE, 1)).to.be.reverted;
      });

      it('fail if try call for expired lock', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        await expect(votingEscrow.connect(signers.otherUser1).increase_unlock_time(ONE, 1)).to.be.reverted;
      });

      it('fail if try call with incorrect unlock time', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        await expect(votingEscrow.connect(signers.otherUser1).increase_unlock_time(ONE, 200 * 86400)).to.be.revertedWithCustomError(
          votingEscrow,
          'InvalidLockDuration',
        );
      });

      it('fail if try call with time less current lock duration', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 24 * 86400, signers.otherUser1.address, true, false, 0);
        await expect(votingEscrow.connect(signers.otherUser1).increase_unlock_time(ONE, 12 * 86400)).to.be.revertedWithCustomError(
          votingEscrow,
          'InvalidLockDuration',
        );
      });

      it('fail if try increase unlcok time for attached nft', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
        await managedNFTManager.createManagedNFT(strategy.target);
        await voter.connect(signers.otherUser1).attachToManagedNFT(ONE, managedNFTId);

        await expect(votingEscrow.connect(signers.otherUser1).increase_unlock_time(ONE, 1)).to.be.revertedWithCustomError(
          votingEscrow,
          'TokenAttached',
        );
      });

      it('sucess increase unlock time', async () => {
        let createLockBlock = (await votingEscrow.createLockFor(ONE_ETHER, 91 * 86400, signers.otherUser1.address, true, false, 0))
          .blockNumber!;
        let lockTime = Math.floor(((await time.latest()) + 91 * 86400) / _WEEK) * _WEEK;

        expect((await votingEscrow.nftStates(1)).locked).to.be.deep.eq([ONE_ETHER, lockTime, false]);

        expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('0.5'), ethers.parseEther('0.1'));

        await votingEscrow.connect(signers.otherUser1).increase_unlock_time(1, 182 * 86400);

        lockTime = Math.floor(((await time.latest()) + 182 * 86400) / _WEEK) * _WEEK;

        expect((await votingEscrow.nftStates(1)).locked).to.be.deep.eq([ONE_ETHER, lockTime, false]);

        expect(await votingEscrow.balanceOfNFT(1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));
      });
    });
    describe('deposit with/without boost', async () => {
      it('should use depositToAttached flow if nft is attached to managed nft', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        let usetNftId = await votingEscrow.lastMintedTokenId();
        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
        await managedNFTManager.createManagedNFT(strategy.target);
        await voter.connect(signers.otherUser1).attachToManagedNFT(ONE, managedNFTId);

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(ONE_ETHER);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(ONE_ETHER);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.supply()).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: ONE_ETHER, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        let tx = await votingEscrow.depositFor(usetNftId, ONE_ETHER, false, false);
        await expect(tx).to.be.emit(votingEscrow, 'DepositToAttachedNFT').withArgs(signers.deployer, usetNftId, managedNFTId, ONE_ETHER);
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.deployer, votingEscrow.target, ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), ethers.parseEther('2'));
        await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(usetNftId, ONE_ETHER);

        let newBalance = ONE_ETHER + ONE_ETHER;

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        tx = await votingEscrow.depositFor(usetNftId, ONE_ETHER, true, false);
        await expect(tx).to.be.emit(votingEscrow, 'DepositToAttachedNFT').withArgs(signers.deployer, usetNftId, managedNFTId, ONE_ETHER);
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.deployer, votingEscrow.target, ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('2'), ethers.parseEther('3'));
        await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(usetNftId, ONE_ETHER);

        newBalance = newBalance + ONE_ETHER;

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        tx = await votingEscrow.depositFor(usetNftId, ONE_ETHER, false, true);
        await expect(tx).to.be.emit(votingEscrow, 'DepositToAttachedNFT').withArgs(signers.deployer, usetNftId, managedNFTId, ONE_ETHER);
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.deployer, votingEscrow.target, ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3'), ethers.parseEther('4'));
        await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(usetNftId, ONE_ETHER);

        newBalance = newBalance + ONE_ETHER;

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        tx = await votingEscrow.depositFor(usetNftId, ONE_ETHER + ONE_ETHER, true, true);
        newBalance = newBalance + ONE_ETHER + ONE_ETHER;
        await expect(tx)
          .to.be.emit(votingEscrow, 'DepositToAttachedNFT')
          .withArgs(signers.deployer, usetNftId, managedNFTId, ONE_ETHER + ONE_ETHER);
        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(signers.deployer, votingEscrow.target, ONE_ETHER + ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('4'), ethers.parseEther('6'));
        await expect(tx)
          .to.be.emit(strategy, 'OnAttach')
          .withArgs(usetNftId, ONE_ETHER + ONE_ETHER);

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });
      });

      it('should correct increase balance for permanent lock nft', async () => {
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ethers.parseEther('0.1'));

        let permanentLockBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(ONE)).blockNumber!;
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);

        await mine();
        await mine();

        let depositForBlock = (await votingEscrow.depositFor(ONE, ethers.parseEther('2'), true, false)).blockNumber!;

        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('3'));

        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
      });
    });
    describe('depositWintIncrease', async () => {
      it('should use depositToAttached flow if nft is attached to managed nft', async () => {
        await deployed.fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        await deployed.fenix.transfer(signers.otherUser1, ethers.parseEther('1000'));

        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        let usetNftId = await votingEscrow.lastMintedTokenId();
        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
        await managedNFTManager.createManagedNFT(strategy.target);
        await voter.connect(signers.otherUser1).attachToManagedNFT(ONE, managedNFTId);

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(ONE_ETHER);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(ONE_ETHER);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.supply()).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: ONE_ETHER, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        let tx = await votingEscrow.connect(signers.otherUser1).depositWithIncreaseUnlockTime(usetNftId, ONE_ETHER, 91 * 86400);
        await expect(tx).to.be.emit(votingEscrow, 'DepositToAttachedNFT').withArgs(signers.otherUser1, usetNftId, managedNFTId, ONE_ETHER);
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.otherUser1, votingEscrow.target, ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), ethers.parseEther('2'));
        await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(usetNftId, ONE_ETHER);

        let newBalance = ONE_ETHER + ONE_ETHER;

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        tx = await votingEscrow.connect(signers.otherUser1).depositWithIncreaseUnlockTime(usetNftId, ONE_ETHER, 300 * 86400);
        await expect(tx).to.be.emit(votingEscrow, 'DepositToAttachedNFT').withArgs(signers.otherUser1, usetNftId, managedNFTId, ONE_ETHER);
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.otherUser1, votingEscrow.target, ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('2'), ethers.parseEther('3'));
        await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(usetNftId, ONE_ETHER);
        newBalance = newBalance + ONE_ETHER;

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        tx = await votingEscrow.connect(signers.otherUser1).depositWithIncreaseUnlockTime(usetNftId, ONE_ETHER, 1);
        await expect(tx).to.be.emit(votingEscrow, 'DepositToAttachedNFT').withArgs(signers.otherUser1, usetNftId, managedNFTId, ONE_ETHER);
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.otherUser1, votingEscrow.target, ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3'), ethers.parseEther('4'));
        await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(usetNftId, ONE_ETHER);

        newBalance = newBalance + ONE_ETHER;

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });

        tx = await votingEscrow.connect(signers.otherUser1).depositWithIncreaseUnlockTime(usetNftId, ONE_ETHER + ONE_ETHER, 0);
        newBalance = newBalance + ONE_ETHER + ONE_ETHER;
        await expect(tx)
          .to.be.emit(votingEscrow, 'DepositToAttachedNFT')
          .withArgs(signers.otherUser1, usetNftId, managedNFTId, ONE_ETHER + ONE_ETHER);
        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(signers.otherUser1, votingEscrow.target, ONE_ETHER + ONE_ETHER);
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('4'), ethers.parseEther('6'));
        await expect(tx)
          .to.be.emit(strategy, 'OnAttach')
          .withArgs(usetNftId, ONE_ETHER + ONE_ETHER);

        expect(await managedNFTManager.getAttachedManagedTokenId(usetNftId)).to.be.eq(managedNFTId);
        expect((await managedNFTManager.tokensInfo(usetNftId)).amount).to.be.eq(newBalance);
        expect(await strategy.balanceOf(usetNftId)).to.be.eq(newBalance);

        expect(await deployed.fenix.balanceOf(votingEscrow.target)).to.be.eq(newBalance);
        expect(await votingEscrow.supply()).to.be.eq(newBalance);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newBalance);
        expect(await votingEscrow.totalSupply()).to.be.eq(2);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await votingEscrow.ownerOf(usetNftId)).to.be.eq(signers.otherUser1.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2n);

        await checkNftState(managedNFTId, { amount: newBalance, isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(usetNftId, { amount: 0n, isPermanentLocked: false, isAttached: true, end: 0 });
      });
    });
    describe('#create_lock', async () => {
      it('should not effect on permanent balance', async () => {
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ethers.parseEther('0.1'));
      });
    });

    describe('#withdraw', async () => {
      it('should fail if permanent lock', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        await votingEscrow.connect(signers.otherUser1).lockPermanent(ONE);
        await expect(votingEscrow.connect(signers.otherUser1).withdraw(ONE)).to.be.revertedWithCustomError(votingEscrow, 'PermanentLocked');
      });
    });

    describe('#merge', async () => {
      it('correct merge and changes balances {attached -> default}', async () => {
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft1 = await votingEscrow.lastMintedTokenId();

        await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft2 = await votingEscrow.lastMintedTokenId();

        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
        await managedNFTManager.createManagedNFT(strategy.target);
        await voter.connect(signers.otherUser1).attachToManagedNFT(nft1, managedNFTId);

        await mine();

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(0);
        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);
        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: true,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('2'),
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(managedNFTId, {
          amount: ethers.parseEther('1'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });

        let tx = await votingEscrow.connect(signers.otherUser1).merge(nft1, nft2);

        await expect(tx).to.be.emit(votingEscrow, 'MergeInit').withArgs(nft1, nft2);
        await expect(tx).to.be.emit(voter, 'DettachFromManagedNFT').withArgs(nft1);
        await expect(tx).to.be.emit(votingEscrow, 'Merge').withArgs(signers.otherUser1, nft1, nft2);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(ZERO);
        await expect(votingEscrow.ownerOf(1)).to.be.reverted;
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(1);

        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);

        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('3'),
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });
      });

      it('correct merge and changes balances {attached -> attached}', async () => {
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft1 = await votingEscrow.lastMintedTokenId();

        await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft2 = await votingEscrow.lastMintedTokenId();

        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
        await managedNFTManager.createManagedNFT(strategy.target);
        await voter.connect(signers.otherUser1).attachToManagedNFT(nft1, managedNFTId);
        await voter.connect(signers.otherUser1).attachToManagedNFT(nft2, managedNFTId);

        await mine();

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(0);
        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.eq(0);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);
        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: true,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: 0n,
          end: 0,
          isAttached: true,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(managedNFTId, {
          amount: ethers.parseEther('3'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });
        expect(await strategy.balanceOf(nft1)).to.be.eq(ethers.parseEther('1'));
        expect(await strategy.balanceOf(nft2)).to.be.eq(ethers.parseEther('2'));
        expect(await strategy.totalSupply()).to.be.eq(ethers.parseEther('3'));

        let tx = await votingEscrow.connect(signers.otherUser1).merge(nft1, nft2);

        await expect(tx).to.be.emit(votingEscrow, 'MergeInit').withArgs(nft1, nft2);
        await expect(tx).to.be.emit(voter, 'DettachFromManagedNFT').withArgs(nft1);
        await expect(tx).to.be.emit(voter, 'DettachFromManagedNFT').withArgs(nft2);
        await expect(tx).to.be.emit(voter, 'AttachToManagedNFT').withArgs(nft2, managedNFTId);
        await expect(tx).to.be.emit(votingEscrow, 'Merge').withArgs(signers.otherUser1, nft1, nft2);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(ZERO);
        await expect(votingEscrow.ownerOf(1)).to.be.reverted;
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(1);

        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.eq(0);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('3'));

        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: 0n,
          end: 0,
          isAttached: true,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(managedNFTId, {
          amount: ethers.parseEther('3'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });
        expect(await strategy.balanceOf(nft1)).to.be.eq(0);
        expect(await strategy.balanceOf(nft2)).to.be.eq(ethers.parseEther('3'));
        expect(await strategy.totalSupply()).to.be.eq(ethers.parseEther('3'));
      });
      it('correct merge and changes balances {default -> default, same unlock timestamp}', async () => {
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft1 = await votingEscrow.lastMintedTokenId();

        await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft2 = await votingEscrow.lastMintedTokenId();

        await mine();

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('2') / 26n);
        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);

        await expect(votingEscrow.connect(signers.otherUser1).merge(nft1, nft2)).to.be.not.reverted;

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(ZERO);
        await expect(votingEscrow.ownerOf(1)).to.be.reverted;
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(1);

        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);

        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('3'),
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });
      });

      it('correct merge and changes balances {permanent -> default}, -> permanent final', async () => {
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft1 = await votingEscrow.lastMintedTokenId();

        await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft2 = await votingEscrow.lastMintedTokenId();

        await mine();
        await votingEscrow.connect(signers.otherUser1).lockPermanent(nft1);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('2') / 26n);
        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);

        let tx = await votingEscrow.connect(signers.otherUser1).merge(nft1, nft2);

        await expect(tx).to.be.emit(votingEscrow, 'UnlockPermanent').withArgs(signers.otherUser1, nft1);
        await expect(tx).to.be.emit(votingEscrow, 'MergeInit').withArgs(nft1, nft2);
        await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1, nft2);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(ZERO);
        await expect(votingEscrow.ownerOf(1)).to.be.reverted;
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(1);

        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('3'));

        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('3'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });
      });
      it('correct merge and changes balances {default -> permanent}, -> permanent final', async () => {
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft1 = await votingEscrow.lastMintedTokenId();

        await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft2 = await votingEscrow.lastMintedTokenId();

        await mine();
        await votingEscrow.connect(signers.otherUser1).lockPermanent(nft2);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('2') / 26n);
        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('2'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('3') / 26n);
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);
        await checkNftState(nft1, {
          amount: ethers.parseEther('1'),
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('2'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });

        let tx = await votingEscrow.connect(signers.otherUser1).merge(nft1, nft2);

        await expect(tx).to.be.emit(votingEscrow, 'MergeInit').withArgs(nft1, nft2);
        await expect(tx).to.be.emit(votingEscrow, 'Merge').withArgs(signers.otherUser1, nft1, nft2);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(ZERO);
        await expect(votingEscrow.ownerOf(1)).to.be.reverted;
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(1);

        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('3'));

        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('3'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });
      });
      it('correct merge and changes balances {permanent -> permanent}, -> permanent final', async () => {
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft1 = await votingEscrow.lastMintedTokenId();

        await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let nft2 = await votingEscrow.lastMintedTokenId();

        await mine();
        await votingEscrow.connect(signers.otherUser1).lockPermanent(nft2);
        await votingEscrow.connect(signers.otherUser1).lockPermanent(nft1);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(ethers.parseEther('1'));
        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.eq(ethers.parseEther('2'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);

        await checkNftState(nft1, {
          amount: ethers.parseEther('1'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('2'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });

        let tx = await votingEscrow.connect(signers.otherUser1).merge(nft1, nft2);

        await expect(tx).to.be.emit(votingEscrow, 'MergeInit').withArgs(nft1, nft2);
        await expect(tx).to.be.emit(votingEscrow, 'UnlockPermanent').withArgs(signers.otherUser1, nft1);
        await expect(tx).to.be.emit(votingEscrow, 'Merge').withArgs(signers.otherUser1, nft1, nft2);

        expect(await votingEscrow.balanceOfNFT(nft1)).to.be.eq(ZERO);
        await expect(votingEscrow.ownerOf(1)).to.be.reverted;
        expect(await votingEscrow.balanceOf(signers.otherUser1)).to.be.eq(1);

        expect(await votingEscrow.balanceOfNFT(nft2)).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('3'));

        await checkNftState(nft1, {
          amount: 0n,
          end: 0,
          isAttached: false,
          isPermanentLocked: false,
          isVoted: false,
        });

        await checkNftState(nft2, {
          amount: ethers.parseEther('3'),
          isAttached: false,
          isPermanentLocked: true,
          isVoted: false,
        });
      });
      it('correct merge and changes balances when to is permit lock', async () => {
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0);
        await votingEscrow.connect(signers.otherUser1).lockPermanent(2);

        expect(await votingEscrow.balanceOfNFT(1)).to.be.closeTo(ONE_ETHER, ethers.parseEther('0.1'));
        expect(await votingEscrow.balanceOfNFT(2)).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.1'));

        await expect(votingEscrow.connect(signers.otherUser1).merge(1, 2)).to.be.not.reverted;

        expect(await votingEscrow.balanceOfNFT(1)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOfNFT(2)).to.be.eq(ethers.parseEther('2'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('2'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('2'));
      });
    });
  });

  describe('Change balanceOf & totalSupply with permanent lock/unlock', async () => {
    let nftId1: bigint;
    let nftId2: bigint;
    let nftId3: bigint;

    it('correct return balance balanceOfAtNFT for singel nft', async () => {
      nftId1 = ONE;
      let startBlock = await time.latestBlock();

      let createLockBlock = (await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0))
        .blockNumber!;

      await mine();

      let lockPermanentBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1)).blockNumber!;

      await mine();
      await mine();

      let unlockPermanent = (await votingEscrow.connect(signers.otherUser1).unlockPermanent(nftId1)).blockNumber!;

      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());

      lockPermanentBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1)).blockNumber!;

      await mine();
      await mine();
    });

    it('correct return balance balanceOfAtNFT for two nft', async () => {
      nftId1 = ONE;
      let startBlock = await time.latestBlock();

      let createLockBlock = (await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0))
        .blockNumber!;

      await mine();

      let lockPermanentBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1)).blockNumber!;

      nftId2 = nftId1 + ONE;

      (await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser2.address, true, false, 0)).blockNumber!;

      await mine();

      let unlockPermanent = (await votingEscrow.connect(signers.otherUser1).unlockPermanent(nftId1)).blockNumber!;

      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());

      lockPermanentBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1)).blockNumber!;
      await votingEscrow.connect(signers.otherUser2).lockPermanent(nftId2);

      await mine();
      await mine();
    });

    it('correct return totalSupply with two nft', async () => {
      nftId1 = ONE;
      let startBlock = await time.latestBlock();

      let createLockBlock = (await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0))
        .blockNumber!;

      await mine();

      let lockPermanentBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1)).blockNumber!;

      nftId2 = nftId1 + ONE;

      (await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser2.address, true, false, 0)).blockNumber!;

      await mine();

      let unlockPermanent = (await votingEscrow.connect(signers.otherUser1).unlockPermanent(nftId1)).blockNumber!;

      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());

      await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1);
      lockPermanentBlock = (await votingEscrow.connect(signers.otherUser2).lockPermanent(nftId2)).blockNumber!;

      await mine();
      await mine();
    });

    it('correct calculate totalSupply with permanent lock/unlocks', async () => {
      nftId1 = ONE;
      let startBlock = await time.latestBlock();

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ZERO);
      expect(await votingEscrow.supply()).to.be.eq(ZERO);
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);

      let createLockBlock = (await votingEscrow.createLockFor(ONE_ETHER, 182 * 86400, signers.otherUser1.address, true, false, 0))
        .blockNumber!;

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ethers.parseEther('0.1'));
      expect(await votingEscrow.supply()).to.be.eq(ONE_ETHER);
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);

      await mine();

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ethers.parseEther('0.1'));
      expect(await votingEscrow.supply()).to.be.eq(ONE_ETHER);
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);

      let lockPermanentBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1)).blockNumber!;

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ONE_ETHER);
      expect(await votingEscrow.supply()).to.be.eq(ONE_ETHER);
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);
      nftId2 = ONE + ONE;

      createLockBlock = (await votingEscrow.createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address, true, false, 0))
        .blockNumber!;

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('4'), ethers.parseEther('0.3'));
      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('4'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);

      await mine();

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('4'), ethers.parseEther('0.3'));
      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('4'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);

      lockPermanentBlock = (await votingEscrow.connect(signers.otherUser2).lockPermanent(nftId2)).blockNumber!;

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('4'));
      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('4'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('4'));

      await votingEscrow.connect(signers.otherUser1).unlockPermanent(nftId1);

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('3.9'), ethers.parseEther('0.099'));
      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('4'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
    });
    it('short votingPowerTotalSupply', async () => {
      nftId1 = await votingEscrow.createLockFor.staticCall(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);
      let createLockBlock = (
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0)
      ).blockNumber!;

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));

      await mine();
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('0.8'), ethers.parseEther('0.1'));

      let lockPermanentBlock = (await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1)).blockNumber!;

      await mine();
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());
      await time.increaseTo(await nextEpoch());

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ONE_ETHER);

      let depositForBlock = (await votingEscrow.depositFor(nftId1, ethers.parseEther('0.5'), true, false)).blockNumber!;

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('1.5'));
    });
    it('should return correct value called balanceOfNft', async () => {
      nftId1 = await votingEscrow.createLockFor.staticCall(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);

      expect(await votingEscrow.balanceOfNFT(nftId1)).to.be.eq(ZERO);

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(nftId1)).to.be.eq(ZERO);

      await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(nftId1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));

      await votingEscrow.connect(signers.otherUser1).lockPermanent(nftId1);

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(nftId1)).to.be.eq(ethers.parseEther('1'));

      expect(await votingEscrow.balanceOfNFT(nftId1)).to.be.eq(ethers.parseEther('1'));
    });
  });
  describe('Permanent lock', async () => {
    describe('#lockPermanent', async () => {
      let mintedNFT: bigint;

      beforeEach(async () => {
        mintedNFT = await votingEscrow.createLockFor.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
          true,
          false,
          0,
        );
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);
      });

      it('fail if nft expired', async () => {
        await time.increase(190 * 86400 + 1);
        await expect(votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT)).to.be.revertedWithCustomError(
          votingEscrow,
          'TokenExpired',
        );
      });

      it('fail if call from not nft owner', async () => {
        await expect(votingEscrow.connect(signers.otherUser2).lockPermanent(mintedNFT)).to.be.reverted;
      });

      it('fail if nft already attached to strategy', async () => {
        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
        await managedNFTManager.createManagedNFT(strategy.target);
        await voter.connect(signers.otherUser1).attachToManagedNFT(mintedNFT, managedNFTId);

        await expect(votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT)).to.be.revertedWithCustomError(
          votingEscrow,
          'TokenAttached',
        );
      });

      describe('success lock', async () => {
        let tx: any;
        let permanentTotalSupplyBefore: bigint;

        beforeEach(async () => {
          permanentTotalSupplyBefore = await votingEscrow.permanentTotalSupply();
          tx = await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);
        });

        it('correct change LockedBalance structure', async () => {
          expect((await votingEscrow.nftStates(mintedNFT)).locked).to.be.deep.eq([ethers.parseEther('1'), 0, true]);
        });

        it('correct add to permanentTotalSupply', async () => {
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(permanentTotalSupplyBefore + ethers.parseEther('1'));
        });

        it('emit event', async () => {
          await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, mintedNFT);
        });

        it('fail if already locked', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT)).to.be.revertedWithCustomError(
            votingEscrow,
            'PermanentLocked',
          );
        });
      });

      it('correct changes of supply', async () => {
        let supplyBefore = await votingEscrow.supply();
        await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);
        expect(await votingEscrow.supply()).to.be.eq(supplyBefore);
        await votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT);
        expect(await votingEscrow.supply()).to.be.eq(supplyBefore);
      });

      it('correct changes of permanentTotalSupplyBefore', async () => {
        let permanentTotalSupplyBefore = await votingEscrow.permanentTotalSupply();
        await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(permanentTotalSupplyBefore + ethers.parseEther('1'));
        await votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(permanentTotalSupplyBefore);
      });
    });
    describe('#unlockPermanent', async () => {
      let mintedNFT: bigint;

      beforeEach(async () => {
        mintedNFT = await votingEscrow.createLockFor.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
          true,
          false,
          0,
        );
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);
        await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);
      });

      it('fail if call from not nft owner', async () => {
        await expect(votingEscrow.connect(signers.otherUser2).unlockPermanent(mintedNFT)).to.be.reverted;
      });

      it('fail if try unlock for not permanent lock minted nft', async () => {
        let mintedNFT2 = await votingEscrow.createLockFor.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
          true,
          false,
          0,
        );
        await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser2.address, true, false, 0);
        await expect(votingEscrow.connect(signers.otherUser2).unlockPermanent(mintedNFT2)).to.be.revertedWithCustomError(
          votingEscrow,
          'NotPermanentLocked',
        );
      });

      it('fail if nft already attached to strategy', async () => {
        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);

        await managedNFTManager.createManagedNFT(strategy.target);

        await voter.connect(signers.otherUser1).attachToManagedNFT(mintedNFT, managedNFTId);

        await expect(votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT)).to.be.revertedWithCustomError(
          votingEscrow,
          'TokenAttached',
        );
      });

      describe('success unlock', async () => {
        let tx: any;
        let permanentTotalSupplyBefore: bigint;

        beforeEach(async () => {
          permanentTotalSupplyBefore = await votingEscrow.permanentTotalSupply();
          tx = await votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT);
        });

        it('correct change LockedBalance structure with max locked time', async () => {
          let lockTime = Math.floor(((await time.latest()) + 182 * 86400) / _WEEK) * _WEEK;
          await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);
          tx = await votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT);
          expect((await votingEscrow.nftStates(mintedNFT)).locked).to.be.deep.eq([ethers.parseEther('1'), lockTime, false]);
        });

        it('correct sub from permanentTotalSupply', async () => {
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(permanentTotalSupplyBefore - ethers.parseEther('1'));
        });

        it('emit event', async () => {
          await expect(tx).to.be.emit(votingEscrow, 'UnlockPermanent').withArgs(signers.otherUser1.address, mintedNFT);
        });

        it('fail if already unlocked', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT)).to.be.revertedWithCustomError(
            votingEscrow,
            'NotPermanentLocked',
          );
        });
      });
    });
  });
  describe('Managed nfts', async () => {
    it(`state before setup managedNFTManager`, async () => {
      expect(await votingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);
    });

    describe('#setManagedNFTManager', async () => {
      it(`fail if caller not team address`, async () => {
        await expect(votingEscrow.connect(signers.otherUser1).updateAddress('managedNFTManager', signers.otherUser2.address)).to.be
          .reverted;
        await expect(votingEscrow.connect(signers.deployer).updateAddress('managedNFTManager', signers.otherUser2.address)).to.be.not
          .reverted;
      });

      it(`success change managed nft manager address and emit event`, async () => {
        expect(await votingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);

        await votingEscrow.updateAddress('managedNFTManager', signers.otherUser2.address);

        expect(await votingEscrow.managedNFTManager()).to.be.eq(signers.otherUser2.address);

        await votingEscrow.updateAddress('managedNFTManager', signers.otherUser1.address);

        expect(await votingEscrow.managedNFTManager()).to.be.eq(signers.otherUser1.address);
      });
    });
    describe('setuped managed nft manager', async () => {
      let strategy: CompoundVeFNXManagedNFTStrategyUpgradeable;

      beforeEach(async () => {
        strategy = await newStrategy();
      });

      it('correct managed nft manager', async () => {
        expect(await votingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);
      });

      describe('#createManagedNFT', async () => {
        it('fail if caller not managed nft manager', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).createManagedNFT(signers.otherUser1.address)).to.be.revertedWithCustomError(
            votingEscrow,
            'AccessDenied',
          );
        });
        it('state before', async () => {
          expect(await votingEscrow.balanceOf(strategy.target)).to.be.eq(ZERO);
          expect(await votingEscrow.lastMintedTokenId()).to.be.eq(ZERO);
        });

        describe('should correct mint managed nft', async () => {
          let managedNftId: bigint;
          let mintedBeforeCount: bigint;

          beforeEach(async () => {
            mintedBeforeCount = await votingEscrow.lastMintedTokenId();

            managedNftId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
            await managedNFTManager.createManagedNFT(strategy.target);
          });

          it('should return correct new tokenId', async () => {
            expect(mintedBeforeCount + ONE).to.be.eq(managedNftId);
          });

          it('should transfer new nft to recipient', async () => {
            expect(await votingEscrow.balanceOf(strategy.target)).to.be.eq(ONE);
            expect(await votingEscrow.lastMintedTokenId()).to.be.eq(ONE);
            expect(await votingEscrow.ownerOf(managedNftId)).to.be.eq(strategy.target);
            expect(await votingEscrow.isApprovedOrOwner(strategy.target, managedNftId)).to.be.true;
          });

          it('should have enable permanent lock', async () => {
            expect((await votingEscrow.nftStates(managedNftId)).locked).to.be.deep.eq([0, 0, true]);
          });

          it('should correct setup initial params of managed nft', async () => {
            expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.deep.eq(0);
            expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(managedNftId)).to.be.deep.eq(0);
          });
          it('should fail if already attached nft to strategy', async () => {
            await expect(managedNFTManager.createManagedNFT(strategy.target)).to.be.revertedWithCustomError(
              managedNFTManager,
              'AlreadyAttached',
            );
          });

          it('mint  after others', async () => {
            await deployed.fenix.approve(votingEscrow.target, ethers.parseEther('1000'));

            await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.deployer.address, true, false, 0);

            let strategy2 = await newStrategy();
            await managedNFTManager.createManagedNFT(strategy2.target);

            expect(await votingEscrow.balanceOf(strategy.target)).to.be.eq(1);
            expect(await votingEscrow.balanceOf(strategy2.target)).to.be.eq(1);

            expect(await votingEscrow.lastMintedTokenId()).to.be.eq(3);

            expect(await votingEscrow.ownerOf(managedNftId)).to.be.eq(strategy.target);
            expect(await votingEscrow.ownerOf(managedNftId + ONE)).to.be.not.eq(strategy.target);
            expect(await votingEscrow.ownerOf(managedNftId + ONE)).to.be.not.eq(strategy2.target);
            expect(await votingEscrow.ownerOf(managedNftId + ONE + ONE)).to.be.eq(strategy2.target);
          });
        });
      });
      describe('#onAttachToManagedNFT', async () => {
        it('fail if caller not managed nft manager', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).onAttachToManagedNFT(1, 1)).to.be.revertedWithCustomError(
            votingEscrow,
            'AccessDenied',
          );
        });

        let nftToken1 = BigInt(1);
        let nftToken2 = BigInt(2);
        let managedNftId = BigInt(3);
        let nftToken3 = BigInt(4);
        let managedNftId2 = BigInt(5);
        let secondStrategy: CompoundVeFNXManagedNFTStrategyUpgradeable;

        beforeEach(async () => {
          secondStrategy = await newStrategy();

          await deployed.fenix.approve(votingEscrow.target, ethers.parseEther('100000'));

          await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);
          await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser2.address, true, false, 0);
          await managedNFTManager.createManagedNFT(strategy.target);
          await votingEscrow.createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser3.address, true, false, 0);
          await managedNFTManager.createManagedNFT(secondStrategy.target);
        });

        it('check balance before', async () => {
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

        it('attach just nft to managed nft', async () => {
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);

          let blockAttch = (await voter.connect(signers.otherUser1).attachToManagedNFT(nftToken1, managedNftId)).blockNumber!;

          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
          expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));

          expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('1'));

          expect(await votingEscrow.balanceOfNFT(managedNftId2)).to.be.eq(ZERO);
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));

          expect(await votingEscrow.balanceOfNFT(nftToken1)).to.be.eq(ZERO);
          expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.2'));
          expect(await votingEscrow.balanceOfNFT(nftToken3)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('0.3'));

          blockAttch = (await voter.connect(signers.otherUser2).attachToManagedNFT(nftToken2, managedNftId2)).blockNumber!;

          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
          expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));

          expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('1'));
          expect(await votingEscrow.balanceOfNFT(managedNftId2)).to.be.eq(ethers.parseEther('2'));

          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));

          expect(await votingEscrow.balanceOfNFT(nftToken1)).to.be.eq(ZERO);
          expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.eq(ZERO);

          expect(await votingEscrow.balanceOfNFT(nftToken3)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('0.3'));
        });
        it('attach permannet lock nft to managed nft', async () => {
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);

          let blockAttch = (await voter.connect(signers.otherUser1).attachToManagedNFT(nftToken1, managedNftId)).blockNumber!;

          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
          expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));

          expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('1'));

          expect(await votingEscrow.balanceOfNFT(managedNftId2)).to.be.eq(ZERO);
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));

          expect(await votingEscrow.balanceOfNFT(nftToken1)).to.be.eq(ZERO);
          expect(await votingEscrow.balanceOfNFT(nftToken2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.2'));
          expect(await votingEscrow.balanceOfNFT(nftToken3)).to.be.closeTo(ethers.parseEther('3'), ethers.parseEther('0.3'));

          let lockPermanentBlock = (await votingEscrow.connect(signers.otherUser2).lockPermanent(nftToken2)).blockNumber!;

          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
          expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));

          blockAttch = (await voter.connect(signers.otherUser2).attachToManagedNFT(nftToken2, managedNftId2)).blockNumber!;

          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
          expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
        });
      });
      describe('#onDettachFromManagedNFT', async () => {
        it('fail if caller not managed nft manager', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).onDettachFromManagedNFT(1, 1, 1)).to.be.revertedWithCustomError(
            votingEscrow,
            'AccessDenied',
          );
        });

        let nftToken1 = BigInt(1);
        let nftToken2 = BigInt(2);
        let managedNftId = BigInt(3);
        let nftToken3 = BigInt(4);
        let managedNftId2 = BigInt(5);
        let secondStrategy: CompoundVeFNXManagedNFTStrategyUpgradeable;

        beforeEach(async () => {
          secondStrategy = await newStrategy();

          await deployed.fenix.approve(votingEscrow.target, ethers.parseEther('100000'));

          await votingEscrow.createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);
          await votingEscrow.createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser2.address, true, false, 0);
          await managedNFTManager.createManagedNFT(strategy.target);
          await votingEscrow.createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser3.address, true, false, 0);
          await managedNFTManager.createManagedNFT(secondStrategy.target);
        });

        it('check balance before', async () => {
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

        it('correct dettach ', async () => {
          await voter.connect(signers.otherUser1).attachToManagedNFT(nftToken1, managedNftId);
          await votingEscrow.connect(signers.otherUser2).lockPermanent(nftToken2);
          await voter.connect(signers.otherUser2).attachToManagedNFT(nftToken2, managedNftId2);

          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3'));
          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
          expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));

          await voter.connect(signers.otherUser2).dettachFromManagedNFT(nftToken2);

          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));
          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
          expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), ethers.parseEther('0.6'));
        });
      });
    });
  });
});

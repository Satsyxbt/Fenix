import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  Fenix,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VeFNXClaimer,
  VeFnxSplitMerklAidropUpgradeable,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types/index';
import { ERRORS, ONE, ONE_ETHER, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, deployTransaperntUpgradeableProxy, SignersList } from '../utils/coreFixture';

function getProof(address: string, tree: any): string[] {
  let proof: string[];
  for (const [i, v] of tree.entries()) {
    if (v[0] === address) {
      proof = tree.getProof(i);
    }
  }
  return proof!;
}

describe('veFNXClaimer', function () {
  let deployed: CoreFixtureDeployed;
  let instance: VeFNXClaimer;
  let fenix: Fenix;
  let votingEscrow: VotingEscrowUpgradeableV2;
  let signers: SignersList;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;
  let managedNFTManager: ManagedNFTManagerUpgradeable;

  async function newStrategy() {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await strategyFactory.createStrategy.staticCall('VeMax'),
    );
    await strategyFactory.createStrategy('VeMax');
    return strategy;
  }

  async function deployStrategyFactory() {
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
  }

  const START_BALANCE = ethers.parseEther('10000');
  let ManagedTokenId: bigint;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    votingEscrow = deployed.votingEscrow;
    signers = deployed.signers;
    fenix = deployed.fenix;

    instance = (await ethers.deployContract('veFNXClaimer', [fenix.target, votingEscrow.target])) as any as VeFNXClaimer;

    managedNFTManager = deployed.managedNFTManager;
    await deployStrategyFactory();
    await fenix.transfer(instance.target, START_BALANCE);
    let strategy = await newStrategy();
    await managedNFTManager.createManagedNFT(strategy);

    ManagedTokenId = await votingEscrow.lastMintedTokenId();
  });

  describe('Test claim flow with permanent lock', async () => {
    beforeEach(async () => {
      expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await deployed.votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(0);
      expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE);

      expect(await instance.chrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.spchrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.elchrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.vechrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.chrnftClaimAmount(signers.otherUser1.address)).to.be.eq(0);

      expect(await instance.chrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.spchrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.elchrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.vechrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.chrnftClaimAmount(signers.otherUser2.address)).to.be.eq(0);

      expect(await instance.chrClaimedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.spchrClaimedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.elchrClaimedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.vechrClaimedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.chrnftClaimedAmount(signers.otherUser1.address)).to.be.eq(0);

      expect(await instance.chrClaimedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.spchrClaimedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.elchrClaimedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.vechrClaimedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.chrnftClaimedAmount(signers.otherUser2.address)).to.be.eq(0);

      expect(await instance.chrMigratedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.spchrMigratedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.elchrMigratedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.vechrMigratedAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.chrnftMigratedAmount(signers.otherUser1.address)).to.be.eq(0);

      expect(await instance.chrMigratedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.spchrMigratedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.elchrMigratedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.vechrMigratedAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.chrnftMigratedAmount(signers.otherUser2.address)).to.be.eq(0);
    });

    afterEach(async () => {
      expect(await instance.chrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.spchrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.elchrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.vechrClaimAmount(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.chrnftClaimAmount(signers.otherUser1.address)).to.be.eq(0);

      expect(await instance.chrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.spchrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.elchrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.vechrClaimAmount(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.chrnftClaimAmount(signers.otherUser2.address)).to.be.eq(0);
    });

    it('should fail if user not have claimable amount', async () => {
      await expect(instance.connect(signers.otherUser1).claimWithCHR(false, 0n)).to.be.revertedWith('No claimable amount');
      await expect(instance.connect(signers.otherUser1).claimWithSPCHR(false, 0n)).to.be.revertedWith('No claimable amount');
      await expect(instance.connect(signers.otherUser1).claimWithELCHR(false, 0n)).to.be.revertedWith('No claimable amount');
      await expect(instance.connect(signers.otherUser1).claimWithVECHR(false, 0n)).to.be.revertedWith('No claimable amount');
      await expect(instance.connect(signers.otherUser1).claimWithCHRNFT(false, 0n)).to.be.revertedWith('No claimable amount');
    });

    describe('without attach to managed nft', async () => {
      afterEach(async () => {
        let nftState = await votingEscrow.nftStates(ManagedTokenId);
        expect(nftState.locked.amount).to.be.eq(0);
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.true;
      });
      it('CHR, success claim without lock permanent, or managed nft attach', async () => {
        let LAST_MINTED_ID = ManagedTokenId + 1n;
        let migratedAmount: bigint = ethers.parseEther('1');
        let claimedAmount: bigint = (migratedAmount * 1000n) / 15500n;

        await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'CHR');
        let tx = await instance.connect(signers.otherUser1).claimWithCHR(false, 0n);

        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
        await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'CHR');

        expect(await instance.chrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
        expect(await instance.chrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

        expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

        let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
        expect(nftState.locked.amount).to.be.eq(claimedAmount);
        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.false;
      });

      it('CHR, success claim with lock permanent', async () => {
        let migratedAmount: bigint = ethers.parseEther('1');
        let claimedAmount: bigint = (migratedAmount * 1000n) / 15500n;

        await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'CHR');
        let tx = await instance.connect(signers.otherUser1).claimWithCHR(true, 0n);
        let LAST_MINTED_ID = ManagedTokenId + 1n;

        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
        await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'CHR');
        await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

        expect(await instance.chrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
        expect(await instance.chrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

        expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

        let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
        expect(nftState.locked.amount).to.be.eq(claimedAmount);
        expect(nftState.locked.end).to.be.eq(0);

        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.true;
        await expect(instance.connect(signers.otherUser1).claimWithCHR(true, 0n)).to.be.revertedWith('No claimable amount');
      });

      it('SPCHR, success claim with lock permanent', async () => {
        let migratedAmount: bigint = ethers.parseEther('1');
        let claimedAmount: bigint = (migratedAmount * 1000n) / 15500n;

        await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'SPCHR');
        let tx = await instance.connect(signers.otherUser1).claimWithSPCHR(true, 0n);
        let LAST_MINTED_ID = ManagedTokenId + 1n;

        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
        await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'SPCHR');
        await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

        expect(await instance.spchrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
        expect(await instance.spchrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

        expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

        let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
        expect(nftState.locked.amount).to.be.eq(claimedAmount);
        expect(nftState.locked.end).to.be.eq(0);

        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.true;
        await expect(instance.connect(signers.otherUser1).claimWithSPCHR(true, 0n)).to.be.revertedWith('No claimable amount');
      });

      it('ELCHR, success claim with lock permanent', async () => {
        let migratedAmount: bigint = ethers.parseEther('1');
        let claimedAmount: bigint = (migratedAmount * 1000n) / 15500n;

        await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'ELCHR');
        let tx = await instance.connect(signers.otherUser1).claimWithELCHR(true, 0n);
        let LAST_MINTED_ID = ManagedTokenId + 1n;

        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
        await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'ELCHR');
        await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

        expect(await instance.elchrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
        expect(await instance.elchrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

        expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

        let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
        expect(nftState.locked.amount).to.be.eq(claimedAmount);
        expect(nftState.locked.end).to.be.eq(0);

        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.true;
        await expect(instance.connect(signers.otherUser1).claimWithELCHR(true, 0n)).to.be.revertedWith('No claimable amount');
      });

      it('VECHR, success claim with lock permanent', async () => {
        let migratedAmount: bigint = ethers.parseEther('1');
        let claimedAmount: bigint = (migratedAmount * 1000n) / 9700n;

        await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'VECHR');
        let tx = await instance.connect(signers.otherUser1).claimWithVECHR(true, 0n);
        let LAST_MINTED_ID = ManagedTokenId + 1n;

        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
        await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'VECHR');
        await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

        expect(await instance.vechrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
        expect(await instance.vechrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

        expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

        let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
        expect(nftState.locked.amount).to.be.eq(claimedAmount);
        expect(nftState.locked.end).to.be.eq(0);

        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.true;

        await expect(instance.connect(signers.otherUser1).claimWithVECHR(true, 0n)).to.be.revertedWith('No claimable amount');
      });

      it('CHRNFT, success claim with lock permanent', async () => {
        let migratedAmount: bigint = 3n;
        let claimedAmount: bigint = (migratedAmount * ethers.parseEther('1') * 1094000n) / 1000n;

        await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'CHRNFT');
        let tx = await instance.connect(signers.otherUser1).claimWithCHRNFT(true, 0n);
        let LAST_MINTED_ID = ManagedTokenId + 1n;

        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
        await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'CHRNFT');
        await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

        expect(await instance.chrnftMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
        expect(await instance.chrnftClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

        expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

        let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
        expect(nftState.locked.amount).to.be.eq(claimedAmount);
        expect(nftState.locked.end).to.be.eq(0);

        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.true;

        await expect(instance.connect(signers.otherUser1).claimWithCHRNFT(true, 0n)).to.be.revertedWith('No claimable amount');
      });
    });

    it('CHR, success claim with attach to managed token id', async () => {
      let migratedAmount: bigint = ethers.parseEther('1');
      let claimedAmount: bigint = (migratedAmount * 1000n) / 15500n;

      await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'CHR');
      let tx = await instance.connect(signers.otherUser1).claimWithCHR(true, ManagedTokenId);
      let LAST_MINTED_ID = ManagedTokenId + 1n;

      await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
      await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'CHR');
      await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

      expect(await instance.chrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
      expect(await instance.chrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

      expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

      let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
      expect(nftState.locked.amount).to.be.eq(0);
      expect(nftState.locked.end).to.be.eq(0);

      expect(nftState.isAttached).to.be.true;
      expect(nftState.locked.isPermanentLocked).to.be.false;

      nftState = await votingEscrow.nftStates(ManagedTokenId);
      expect(nftState.locked.amount).to.be.eq(claimedAmount);
      expect(nftState.locked.end).to.be.eq(0);
      expect(nftState.isAttached).to.be.false;
      expect(nftState.locked.isPermanentLocked).to.be.true;

      expect(await managedNFTManager.getAttachedManagedTokenId(LAST_MINTED_ID)).to.be.eq(ManagedTokenId);
    });

    it('SPCHR, success claim with attach to managed token id', async () => {
      let migratedAmount: bigint = ethers.parseEther('1');
      let claimedAmount: bigint = (migratedAmount * 1000n) / 15500n;

      await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'SPCHR');
      let tx = await instance.connect(signers.otherUser1).claimWithSPCHR(true, ManagedTokenId);
      let LAST_MINTED_ID = ManagedTokenId + 1n;

      await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
      await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'SPCHR');
      await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

      expect(await instance.spchrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
      expect(await instance.spchrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

      expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

      let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
      expect(nftState.locked.amount).to.be.eq(0);
      expect(nftState.locked.end).to.be.eq(0);

      expect(nftState.isAttached).to.be.true;
      expect(nftState.locked.isPermanentLocked).to.be.false;

      nftState = await votingEscrow.nftStates(ManagedTokenId);
      expect(nftState.locked.amount).to.be.eq(claimedAmount);
      expect(nftState.locked.end).to.be.eq(0);
      expect(nftState.isAttached).to.be.false;
      expect(nftState.locked.isPermanentLocked).to.be.true;

      expect(await managedNFTManager.getAttachedManagedTokenId(LAST_MINTED_ID)).to.be.eq(ManagedTokenId);
    });

    it('ELCHR, success claim with attach to managed token id', async () => {
      let migratedAmount: bigint = ethers.parseEther('1');
      let claimedAmount: bigint = (migratedAmount * 1000n) / 15500n;

      await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'ELCHR');
      let tx = await instance.connect(signers.otherUser1).claimWithELCHR(true, ManagedTokenId);
      let LAST_MINTED_ID = ManagedTokenId + 1n;

      await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
      await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'ELCHR');
      await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

      expect(await instance.elchrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
      expect(await instance.elchrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

      expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

      let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
      expect(nftState.locked.amount).to.be.eq(0);
      expect(nftState.locked.end).to.be.eq(0);

      expect(nftState.isAttached).to.be.true;
      expect(nftState.locked.isPermanentLocked).to.be.false;

      nftState = await votingEscrow.nftStates(ManagedTokenId);
      expect(nftState.locked.amount).to.be.eq(claimedAmount);
      expect(nftState.locked.end).to.be.eq(0);
      expect(nftState.isAttached).to.be.false;
      expect(nftState.locked.isPermanentLocked).to.be.true;

      expect(await managedNFTManager.getAttachedManagedTokenId(LAST_MINTED_ID)).to.be.eq(ManagedTokenId);
    });

    it('VECHR, success claim with attach to managed token id', async () => {
      let migratedAmount: bigint = ethers.parseEther('1');
      let claimedAmount: bigint = (migratedAmount * 1000n) / 9700n;

      await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'VECHR');
      let tx = await instance.connect(signers.otherUser1).claimWithVECHR(true, ManagedTokenId);
      let LAST_MINTED_ID = ManagedTokenId + 1n;

      await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
      await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'VECHR');
      await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

      expect(await instance.vechrMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
      expect(await instance.vechrClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

      expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

      let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
      expect(nftState.locked.amount).to.be.eq(0);
      expect(nftState.locked.end).to.be.eq(0);

      expect(nftState.isAttached).to.be.true;
      expect(nftState.locked.isPermanentLocked).to.be.false;

      nftState = await votingEscrow.nftStates(ManagedTokenId);
      expect(nftState.locked.amount).to.be.eq(claimedAmount);
      expect(nftState.locked.end).to.be.eq(0);
      expect(nftState.isAttached).to.be.false;
      expect(nftState.locked.isPermanentLocked).to.be.true;

      expect(await managedNFTManager.getAttachedManagedTokenId(LAST_MINTED_ID)).to.be.eq(ManagedTokenId);
    });

    it('CHRNFT, success claim with attach to managed token id', async () => {
      let migratedAmount: bigint = 3n;
      let claimedAmount: bigint = (migratedAmount * ethers.parseEther('1') * 1094000n) / 1000n;

      await instance.setUserClaimAmounts([signers.otherUser1.address], [migratedAmount], 'CHRNFT');
      let tx = await instance.connect(signers.otherUser1).claimWithCHRNFT(true, ManagedTokenId);
      let LAST_MINTED_ID = ManagedTokenId + 1n;

      await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, votingEscrow.target, claimedAmount);
      await expect(tx).to.be.emit(instance, 'Claimed').withArgs(signers.otherUser1.address, claimedAmount, 'CHRNFT');
      await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(instance.target, LAST_MINTED_ID);

      expect(await instance.chrnftMigratedAmount(signers.otherUser1.address)).to.be.eq(migratedAmount);
      expect(await instance.chrnftClaimedAmount(signers.otherUser1.address)).to.be.eq(claimedAmount);

      expect(await fenix.balanceOf(instance.target)).to.be.eq(START_BALANCE - claimedAmount);

      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.ownerOf(LAST_MINTED_ID)).to.be.eq(signers.otherUser1.address);

      let nftState = await votingEscrow.nftStates(LAST_MINTED_ID);
      expect(nftState.locked.amount).to.be.eq(0);
      expect(nftState.locked.end).to.be.eq(0);

      expect(nftState.isAttached).to.be.true;
      expect(nftState.locked.isPermanentLocked).to.be.false;

      nftState = await votingEscrow.nftStates(ManagedTokenId);
      expect(nftState.locked.amount).to.be.eq(claimedAmount);
      expect(nftState.locked.end).to.be.eq(0);
      expect(nftState.isAttached).to.be.false;
      expect(nftState.locked.isPermanentLocked).to.be.true;

      expect(await managedNFTManager.getAttachedManagedTokenId(LAST_MINTED_ID)).to.be.eq(ManagedTokenId);
    });
  });
});

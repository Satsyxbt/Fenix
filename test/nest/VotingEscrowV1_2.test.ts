import { expect } from 'chai';
import { ethers } from 'hardhat';

import {
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  ManagedNFTManagerUpgradeable,
  VoterUpgradeableV1_2,
  VotingEscrowUpgradeableV1_2,
} from '../../typechain-types';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployCompoundStrategyWithoutInitialize,
  deployVirtualRewarderWithoutInitialize,
  getSigners,
} from '../utils/coreFixture';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { ONE, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('VotingEscrowV1_2 Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;
  let votingEscrow: VotingEscrowUpgradeableV1_2;
  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let voter: VoterUpgradeableV1_2;

  const _WEEK = 86400 * 7;

  async function currentEpoch() {
    return Math.floor(((await time.latest()) / _WEEK) * _WEEK);
  }

  async function nextEpoch() {
    return Math.floor((await currentEpoch()) + _WEEK);
  }

  async function previuesEpoch() {
    return Math.floor((await currentEpoch()) - _WEEK);
  }

  async function newStrategy() {
    let virutalRewarder = await deployVirtualRewarderWithoutInitialize(signers.deployer, signers.proxyAdmin.address);

    let compoundStrategy = await deployCompoundStrategyWithoutInitialize(signers.deployer, signers.proxyAdmin.address);

    await virutalRewarder.initialize(signers.blastGovernor.address, deployed.minter.target, compoundStrategy.target);

    await compoundStrategy.initialize(
      signers.blastGovernor.address,
      managedNFTManager.target,
      votingEscrow.target,
      voter.target,
      deployed.fenix.target,
      virutalRewarder.target,
      'Mock',
    );
    return compoundStrategy;
  }
  beforeEach(async function () {
    signers = await getSigners();
    deployed = await loadFixture(completeFixture);

    votingEscrow = deployed.votingEscrow;
    managedNFTManager = deployed.managedNFTManager;
    voter = deployed.voter;

    await deployed.fenix.approve(votingEscrow.target, ethers.parseEther('100000'));
    await voter.setDistributionWindowDuration(0);
  });

  describe('Permanent lock', async () => {
    describe('#lockPermanent', async () => {
      let mintedNFT: bigint;

      beforeEach(async () => {
        mintedNFT = await votingEscrow.create_lock_for.staticCall(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
        await votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
      });

      it('fail if nft expired', async () => {
        await time.increase(190 * 86400 + 1);
        await expect(votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT)).to.be.revertedWith('expired lock');
      });

      it('fail if call from not nft owner', async () => {
        await expect(votingEscrow.connect(signers.otherUser2).lockPermanent(mintedNFT)).to.be.reverted;
      });

      it('fail if nft already attached to strategy', async () => {
        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);

        await managedNFTManager.createManagedNFT(strategy.target);

        await voter.connect(signers.otherUser1).attachToManagedNFT(mintedNFT, managedNFTId);

        await expect(votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT)).to.be.revertedWith('not normal nft');
      });

      describe('success lock', async () => {
        let tx: any;
        let permanentTotalSupplyBefore: bigint;

        beforeEach(async () => {
          permanentTotalSupplyBefore = await votingEscrow.permanentTotalSupply();
          tx = await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);
        });

        it('correct change LockedBalance structure', async () => {
          expect(await votingEscrow.locked(mintedNFT)).to.be.deep.eq([ethers.parseEther('1'), 0, true]);
        });

        it('correct add to permanentTotalSupply', async () => {
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(permanentTotalSupplyBefore + ethers.parseEther('1'));
        });

        it('emit event', async () => {
          await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, mintedNFT);
        });

        it('fail if already locked', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT)).to.be.revertedWith('already locked');
        });
      });
      it('correct changes of checkpoint', async () => {
        console.log(await votingEscrow.user_point_history(mintedNFT, 0));
        console.log(await votingEscrow.user_point_history(mintedNFT, 1));
        console.log(await votingEscrow.user_point_history(mintedNFT, 2));
        console.log(await votingEscrow.permanentTotalSupplyPoints(0));
        console.log(await votingEscrow.permanentTotalSupplyPoints(1));
        console.log(await votingEscrow.permanentTotalSupplyPoints(2));

        console.log(await votingEscrow.permanentPoints(mintedNFT, 0));
        console.log(await votingEscrow.permanentPoints(mintedNFT, 1));
        console.log(await votingEscrow.permanentPoints(mintedNFT, 2));

        await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);

        console.log(await votingEscrow.user_point_history(mintedNFT, 0));
        console.log(await votingEscrow.user_point_history(mintedNFT, 1));
        console.log(await votingEscrow.user_point_history(mintedNFT, 2));
        console.log(await votingEscrow.permanentTotalSupplyPoints(0));
        console.log(await votingEscrow.permanentTotalSupplyPoints(1));
        console.log(await votingEscrow.permanentTotalSupplyPoints(2));

        console.log(await votingEscrow.permanentPoints(mintedNFT, 0));
        console.log(await votingEscrow.permanentPoints(mintedNFT, 52));
        console.log(await votingEscrow.permanentPoints(mintedNFT, 53));
      });

      it('correct changes of totalSupply', async () => {});

      it('correct changes of balanceOf', async () => {});

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
        mintedNFT = await votingEscrow.create_lock_for.staticCall(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
        await votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
        await votingEscrow.connect(signers.otherUser1).lockPermanent(mintedNFT);
      });

      it('fail if call from not nft owner', async () => {
        await expect(votingEscrow.connect(signers.otherUser2).unlockPermanent(mintedNFT)).to.be.reverted;
      });

      it('fail if user voted', async () => {
        await votingEscrow.setVoter(signers.deployer.address);
        await votingEscrow.voting(mintedNFT);
        await expect(votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT)).to.be.rejectedWith('voted');
      });

      it('fail if try unlock for not permanent lock minted nft', async () => {
        let mintedNFT2 = await votingEscrow.create_lock_for.staticCall(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
        await votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser2.address);
        await expect(votingEscrow.connect(signers.otherUser2).unlockPermanent(mintedNFT2)).to.be.rejectedWith('no permanent lock');
      });

      it('fail if nft already attached to strategy', async () => {
        let strategy = await newStrategy();
        let managedNFTId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);

        await managedNFTManager.createManagedNFT(strategy.target);

        await voter.connect(signers.otherUser1).attachToManagedNFT(mintedNFT, managedNFTId);

        await expect(votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT)).to.be.revertedWith('not normal nft');
      });

      describe('success unlock', async () => {
        let tx: any;
        let permanentTotalSupplyBefore: bigint;
        let lockTime: number;

        beforeEach(async () => {
          permanentTotalSupplyBefore = await votingEscrow.permanentTotalSupply();
          tx = await votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT);
          lockTime = (((await time.latest()) + 182 * 86400) / _WEEK) * _WEEK;
        });

        it('correct change LockedBalance structure with max locked time', async () => {
          expect(await votingEscrow.locked(mintedNFT)).to.be.deep.eq([ethers.parseEther('1'), lockTime, false]);
        });

        it('correct sub from permanentTotalSupply', async () => {
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(permanentTotalSupplyBefore - ethers.parseEther('1'));
        });

        it('emit event', async () => {
          await expect(tx).to.be.emit(votingEscrow, 'UnlockPermanent').withArgs(signers.otherUser1.address, mintedNFT);
        });

        it('fail if already unlocked', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).unlockPermanent(mintedNFT)).to.be.revertedWith('no permanent lock');
        });
      });
    });
    describe('#deposit_for', async () => {});
    describe('#deposit_for_withoitu_boost', async () => {});
    describe('#increase_unlock_time', async () => {});
    describe('#withdraw', async () => {});
    describe('#balanceOfNFT', async () => {});
    describe('#balanceOfNFTAt', async () => {});
    describe('#balanceOfAtNFT', async () => {});
  });
  describe('Managed nfts', async () => {
    it(`state before setup managedNFTManager`, async () => {
      expect(await votingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);
    });

    describe('#setManagedNFTManager', async () => {
      it(`fail if caller not team address`, async () => {
        await expect(votingEscrow.connect(signers.otherUser1).setManagedNFTManager(signers.otherUser1.address)).to.be.reverted;
        await expect(votingEscrow.connect(signers.deployer).setManagedNFTManager(signers.otherUser1.address)).to.be.not.reverted;
      });

      it(`success change managed nft manager address and emit event`, async () => {
        expect(await votingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);

        await votingEscrow.setManagedNFTManager(signers.otherUser2.address);

        expect(await votingEscrow.managedNFTManager()).to.be.eq(signers.otherUser2.address);

        await votingEscrow.setManagedNFTManager(signers.otherUser1.address);

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
          await expect(votingEscrow.connect(signers.otherUser1).createManagedNFT(signers.otherUser1.address)).to.be.revertedWith(
            '!managedNFTManager',
          );
        });
        it('state before', async () => {
          expect(await votingEscrow.balanceOf(strategy.target)).to.be.eq(ZERO);
          expect(await votingEscrow.tokenId()).to.be.eq(ZERO);
        });

        describe('should correct mint managed nft', async () => {
          let managedNftId: bigint;
          let mintedBeforeCount: bigint;

          beforeEach(async () => {
            mintedBeforeCount = await votingEscrow.tokenId();

            managedNftId = await managedNFTManager.createManagedNFT.staticCall(strategy.target);
            await managedNFTManager.createManagedNFT(strategy.target);
          });

          it('should return correct new tokenId', async () => {
            expect(mintedBeforeCount + ONE).to.be.eq(managedNftId);
          });

          it('should transfer new nft to recipient', async () => {
            expect(await votingEscrow.balanceOf(strategy.target)).to.be.eq(ONE);
            expect(await votingEscrow.tokenId()).to.be.eq(ONE);
            expect(await votingEscrow.ownerOf(managedNftId)).to.be.eq(strategy.target);
            expect(await votingEscrow.isApprovedOrOwner(strategy.target, managedNftId)).to.be.true;
          });

          it('should have enable permanent lock', async () => {
            expect(await votingEscrow.locked(managedNftId)).to.be.deep.eq([0, 0, true]);
          });

          it('should correct setup initial params of managed nft', async () => {
            expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.deep.eq(0);
            expect(await votingEscrow.balanceOfNFTAt(managedNftId, 0)).to.be.deep.eq(0);
            expect(await votingEscrow.balanceOfNFTAt(managedNftId, await previuesEpoch())).to.be.deep.eq(0);
            expect(await votingEscrow.balanceOfNFTAt(managedNftId, await currentEpoch())).to.be.deep.eq(0);
            expect(await votingEscrow.balanceOfNFTAt(managedNftId, await nextEpoch())).to.be.deep.eq(0);
          });
          it('should fail if already attached nft to strategy', async () => {
            await expect(managedNFTManager.createManagedNFT(strategy.target)).to.be.revertedWithCustomError(
              managedNFTManager,
              'AlreadyAttached',
            );
          });

          it('mint  after others', async () => {
            await deployed.fenix.approve(votingEscrow.target, ethers.parseEther('1000'));

            await votingEscrow.create_lock(ethers.parseEther('1'), 182 * 86400);

            let strategy2 = await newStrategy();
            await managedNFTManager.createManagedNFT(strategy2.target);

            expect(await votingEscrow.balanceOf(strategy.target)).to.be.eq(1);
            expect(await votingEscrow.balanceOf(strategy2.target)).to.be.eq(1);

            expect(await votingEscrow.tokenId()).to.be.eq(3);

            expect(await votingEscrow.ownerOf(managedNftId)).to.be.eq(strategy.target);
            expect(await votingEscrow.ownerOf(managedNftId + ONE)).to.be.not.eq(strategy.target);
            expect(await votingEscrow.ownerOf(managedNftId + ONE)).to.be.not.eq(strategy2.target);
            expect(await votingEscrow.ownerOf(managedNftId + ONE + ONE)).to.be.eq(strategy2.target);
          });
        });
      });
      describe('#onAttachToManagedNFT', async () => {
        it('fail if caller not managed nft manager', async () => {
          await expect(votingEscrow.connect(signers.otherUser1).onAttachToManagedNFT(1, 1)).to.be.revertedWith('!managedNFTManager');
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

          await votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
          await votingEscrow.create_lock_for(ethers.parseEther('2'), 182 * 86400, signers.otherUser2.address);
          await managedNFTManager.createManagedNFT(strategy.target);
          await votingEscrow.create_lock_for(ethers.parseEther('3'), 182 * 86400, signers.otherUser3.address);
          await managedNFTManager.createManagedNFT(secondStrategy.target);
        });

        it('check state before', async () => {
          expect(await votingEscrow.tokenId()).to.be.eq(5);
          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));

          expect(await votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ZERO);
          expect(await votingEscrow.balanceOfNFT(managedNftId2)).to.be.eq(ZERO);
        });
      });
    });
  });
});

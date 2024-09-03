import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  ManagedNFTManagerMock,
  ManagedNFTManagerUpgradeable,
  VeArtProxyUpgradeable,
  VotingEscrowUpgradeableV2,
} from '../../../typechain-types';
import completeFixture, { deployERC20MockToken, mockBlast } from '../../utils/coreFixture';

import { ContractTransactionResponse } from 'ethers';
import { ERRORS, ONE, ONE_ETHER, VotingEscrowDepositType } from '../../utils/constants';
import { AssertSwapEchidnaTest__factory } from '@cryptoalgebra/integral-core/typechain';
import { erc1967 } from '@cryptoalgebra/integral-core/typechain/@openzeppelin/contracts/proxy';

const MAX_LOCK_TIME = 15724800;
const WEEK = 86400 * 7;

type Signers = {
  deployer: HardhatEthersSigner;
  blastGovernor: HardhatEthersSigner;
  proxyAdmin: HardhatEthersSigner;
  user1: HardhatEthersSigner;
  user2: HardhatEthersSigner;
  others: HardhatEthersSigner[];
};

async function roundToWeek(time: bigint) {
  return (time / BigInt(WEEK)) * BigInt(WEEK);
}

function calculateLinerVotingPower(amount: bigint, currentTime: bigint, start: bigint, end: bigint) {
  return ((amount * ((end - currentTime) * ONE_ETHER)) / (end - start)) * ONE_ETHER;
}

async function getRestForNextEpoch() {
  let nowTime = BigInt(await time.latest());

  let currentEpoch = (nowTime / BigInt(WEEK)) * BigInt(WEEK);
  return currentEpoch + BigInt(WEEK) - nowTime;
}

async function fixture() {
  await mockBlast();
  let signers = await ethers.getSigners();
  let VotingEscrow_Implementation = await ethers.deployContract('VotingEscrowUpgradeableV2', [signers[1].address]);
  let VeArtProxyUpgradeable = await ethers.deployContract('VeArtProxyUpgradeable');

  let VotingEscrow = (await ethers.deployContract('TransparentUpgradeableProxy', [
    VotingEscrow_Implementation.target,
    signers[2].address,
    '0x',
  ])) as any;
  VotingEscrow = await ethers.getContractAt('VotingEscrowUpgradeableV2', VotingEscrow.target);
  let ManagedNFTManagerMock = await ethers.deployContract('ManagedNFTManagerMock');
  return {
    signers: {
      deployer: signers[0],
      blastGovernor: signers[1],
      proxyAdmin: signers[2],
      user1: signers[3],
      user2: signers[4],
      others: signers.slice(5, 10),
    },
    VotingEscrow_Implementation: VotingEscrow_Implementation,
    VotingEscrow: VotingEscrow,
    VeArtProxyUpgradeable: VeArtProxyUpgradeable,
    ManagedNFTManagerMock: ManagedNFTManagerMock,
  };
}

describe('VotingEscrow_V2', function () {
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let VotingEscrow_Implementation: VotingEscrowUpgradeableV2;
  let VeArtProxyUpgradeable: VeArtProxyUpgradeable;
  let signers: Signers;
  let token: ERC20Mock;
  let initializeTx: ContractTransactionResponse;
  let managedNFTManager: ManagedNFTManagerMock;
  let voter: HardhatEthersSigner, veBoost: HardhatEthersSigner;

  beforeEach(async () => {
    const deployed = await fixture();
    VotingEscrow = deployed.VotingEscrow;
    VotingEscrow_Implementation = deployed.VotingEscrow_Implementation;
    VeArtProxyUpgradeable = deployed.VeArtProxyUpgradeable;
    managedNFTManager = deployed.ManagedNFTManagerMock;
    signers = deployed.signers;
    voter = signers.others[0];
    veBoost = signers.others[1];
    token = await deployERC20MockToken(signers.deployer, 'MOK', 'MOK', 18);
    initializeTx = await VotingEscrow.initialize(signers.blastGovernor.address, token.target);
    await VotingEscrow.updateAddress('voter', voter.address);
    await VotingEscrow.updateAddress('veBoost', veBoost.address);
    await VotingEscrow.updateAddress('artProxy', VeArtProxyUpgradeable.target);
    await VotingEscrow.updateAddress('managedNFTManager', managedNFTManager.target);
  });

  describe('Deployment', async () => {
    describe('should fail if', async () => {
      it('try call initialize on implementation', async () => {
        await expect(VotingEscrow_Implementation.initialize(signers.blastGovernor.address, token.target)).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
      it('try recall initialize on proxy', async () => {
        await expect(VotingEscrow.initialize(signers.blastGovernor.address, token.target)).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
    });
    describe('State after deployment and initialization', async () => {
      it('caller should be owner', async () => {
        expect(await VotingEscrow.owner()).to.be.eq(signers.deployer.address);
      });

      it('token', async () => {
        expect(await VotingEscrow.token()).to.be.eq(token.target);
      });

      it('ERC721 state', async () => {
        expect(await VotingEscrow.name()).to.be.eq('veFenix');
        expect(await VotingEscrow.symbol()).to.be.eq('veFNX');
      });

      it('others params', async () => {
        expect(await VotingEscrow.supply()).to.be.eq(0);
        expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(0);
        expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      });

      it('init zero supply checkpoint in point history', async () => {
        expect(await VotingEscrow.epoch()).to.be.eq(1);
        let point = await VotingEscrow.supplyPointsHistory(0);
        expect(point.permanent).to.be.eq(0);
        expect(point.bias).to.be.eq(0);
        let txTimestamp = (await ethers.provider.getBlock(initializeTx.blockNumber!))?.timestamp!;
        expect(point.ts).to.be.eq(txTimestamp);

        point = await VotingEscrow.supplyPointsHistory(1);
        expect(point.permanent).to.be.eq(0);
        expect(point.bias).to.be.eq(0);
        expect(point.ts).to.be.eq(txTimestamp);
      });

      it('supplies and voter power', async () => {
        expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await VotingEscrow.supply()).to.be.eq(0);
        expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(0);
      });

      it('voter & artProxy & veBoost & managedNFTManager', async () => {
        expect(await VotingEscrow.artProxy()).to.be.eq(VeArtProxyUpgradeable.target);
        expect(await VotingEscrow.voter()).to.be.eq(voter.address);
        expect(await VotingEscrow.veBoost()).to.be.eq(veBoost.address);
        expect(await VotingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);
      });

      it('zero token balance', async () => {
        expect(await token.balanceOf(VotingEscrow.target)).to.be.eq(0);
      });
    });
  });

  describe('Access restricted functionality', async () => {
    describe('#updateAddress', async () => {
      describe('should fail if', async () => {
        it('call from not owner', async () => {
          expect(await VotingEscrow.owner()).to.be.not.eq(signers.user1.address);
          await expect(VotingEscrow.connect(signers.user1).updateAddress('artProxy', ethers.ZeroAddress)).to.be.revertedWith(
            ERRORS.Ownable.NotOwner,
          );
        });
        it('call with invalid key', async () => {
          await expect(VotingEscrow.updateAddress('1', ethers.ZeroAddress)).to.be.revertedWithCustomError(
            VotingEscrow,
            'InvalidAddressKey',
          );
        });
      });
      describe('success update and emit event', async () => {
        beforeEach(async () => {
          await VotingEscrow.updateAddress('voter', ethers.ZeroAddress);
          await VotingEscrow.updateAddress('artProxy', ethers.ZeroAddress);
          await VotingEscrow.updateAddress('managedNFTManager', ethers.ZeroAddress);
          await VotingEscrow.updateAddress('veBoost', ethers.ZeroAddress);
          expect(await VotingEscrow.voter()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.artProxy()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.veBoost()).to.be.eq(ethers.ZeroAddress);
        });

        it('voter', async () => {
          await expect(VotingEscrow.updateAddress('voter', voter.address))
            .to.be.emit(VotingEscrow, 'UpdateAddress')
            .withArgs('voter', voter.address);
          expect(await VotingEscrow.voter()).to.be.eq(voter.address);
          expect(await VotingEscrow.artProxy()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.veBoost()).to.be.eq(ethers.ZeroAddress);
        });

        it('artProxy', async () => {
          await expect(VotingEscrow.updateAddress('artProxy', VeArtProxyUpgradeable.target))
            .to.be.emit(VotingEscrow, 'UpdateAddress')
            .withArgs('artProxy', VeArtProxyUpgradeable.target);
          expect(await VotingEscrow.voter()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.artProxy()).to.be.eq(VeArtProxyUpgradeable.target);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.veBoost()).to.be.eq(ethers.ZeroAddress);
        });

        it('managedNFTManager', async () => {
          await expect(VotingEscrow.updateAddress('managedNFTManager', managedNFTManager.target))
            .to.be.emit(VotingEscrow, 'UpdateAddress')
            .withArgs('managedNFTManager', managedNFTManager.target);
          expect(await VotingEscrow.voter()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.artProxy()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);
          expect(await VotingEscrow.veBoost()).to.be.eq(ethers.ZeroAddress);
        });

        it('veBoost', async () => {
          await expect(VotingEscrow.updateAddress('veBoost', veBoost.address))
            .to.be.emit(VotingEscrow, 'UpdateAddress')
            .withArgs('veBoost', veBoost.address);
          expect(await VotingEscrow.voter()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.artProxy()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.veBoost()).to.be.eq(veBoost.address);
        });

        it('all variable change', async () => {
          await VotingEscrow.updateAddress('veBoost', veBoost.address);
          await VotingEscrow.updateAddress('managedNFTManager', managedNFTManager.target);
          await VotingEscrow.updateAddress('voter', voter.address);
          await VotingEscrow.updateAddress('artProxy', VeArtProxyUpgradeable.target);
          expect(await VotingEscrow.voter()).to.be.eq(voter.address);
          expect(await VotingEscrow.artProxy()).to.be.eq(VeArtProxyUpgradeable.target);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(managedNFTManager.target);
          expect(await VotingEscrow.veBoost()).to.be.eq(veBoost.address);
        });

        it('address change two time', async () => {
          await expect(VotingEscrow.updateAddress('voter', voter.address))
            .to.be.emit(VotingEscrow, 'UpdateAddress')
            .withArgs('voter', voter.address);
          expect(await VotingEscrow.voter()).to.be.eq(voter.address);
          expect(await VotingEscrow.artProxy()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.veBoost()).to.be.eq(ethers.ZeroAddress);

          await expect(VotingEscrow.updateAddress('voter', managedNFTManager.target))
            .to.be.emit(VotingEscrow, 'UpdateAddress')
            .withArgs('voter', managedNFTManager.target);
          expect(await VotingEscrow.voter()).to.be.eq(managedNFTManager.target);
          expect(await VotingEscrow.artProxy()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await VotingEscrow.veBoost()).to.be.eq(ethers.ZeroAddress);
        });
      });
    });

    describe('#votingHook', async () => {
      it('should fail if call from not voter address', async () => {
        expect(await VotingEscrow.voter()).to.be.not.eq(signers.user1.address);
        await expect(VotingEscrow.connect(signers.deployer).votingHook(1, true)).to.be.revertedWithCustomError(
          VotingEscrow,
          'AccessDenied',
        );
        await expect(VotingEscrow.connect(signers.user1).votingHook(1, true)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
        await expect(VotingEscrow.connect(signers.deployer).votingHook(1, false)).to.be.revertedWithCustomError(
          VotingEscrow,
          'AccessDenied',
        );
        await expect(VotingEscrow.connect(signers.user1).votingHook(1, false)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
      });

      it('success change voted state of nft ', async () => {
        expect((await VotingEscrow.nftStates(1)).isVoted).to.be.false;
        expect((await VotingEscrow.nftStates(2)).isVoted).to.be.false;

        await VotingEscrow.connect(voter).votingHook(1, true);
        expect((await VotingEscrow.nftStates(1)).isVoted).to.be.true;
        expect((await VotingEscrow.nftStates(2)).isVoted).to.be.false;

        await VotingEscrow.connect(voter).votingHook(1, false);
        expect((await VotingEscrow.nftStates(1)).isVoted).to.be.false;
        expect((await VotingEscrow.nftStates(2)).isVoted).to.be.false;

        await VotingEscrow.connect(voter).votingHook(1, true);
        await VotingEscrow.connect(voter).votingHook(2, true);
        expect((await VotingEscrow.nftStates(1)).isVoted).to.be.true;
        expect((await VotingEscrow.nftStates(2)).isVoted).to.be.true;

        await VotingEscrow.connect(voter).votingHook(1, false);
        await VotingEscrow.connect(voter).votingHook(2, false);
        expect((await VotingEscrow.nftStates(1)).isVoted).to.be.false;
        expect((await VotingEscrow.nftStates(2)).isVoted).to.be.false;

        await VotingEscrow.connect(voter).votingHook(2, true);
        expect((await VotingEscrow.nftStates(1)).isVoted).to.be.false;
        expect((await VotingEscrow.nftStates(2)).isVoted).to.be.true;

        await VotingEscrow.connect(voter).votingHook(2, false);
        expect((await VotingEscrow.nftStates(1)).isVoted).to.be.false;
        expect((await VotingEscrow.nftStates(2)).isVoted).to.be.false;
      });
    });
  });

  describe('Create lock', async () => {
    describe('should fail if', async () => {
      it('unlock timestamp not enought for lock to next epoch', async () => {
        await expect(
          VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, 0, signers.user1.address),
        ).to.be.revertedWithCustomError(VotingEscrow, 'InvalidLockDuration');
        await expect(
          VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, 1, signers.user1.address),
        ).to.be.revertedWithCustomError(VotingEscrow, 'InvalidLockDuration');
        await expect(
          VotingEscrow.connect(signers.user1).create_lock_for_without_boost(
            ONE_ETHER,
            (await getRestForNextEpoch()) - 100n,
            signers.user1.address,
          ),
        ).to.be.revertedWithCustomError(VotingEscrow, 'InvalidLockDuration');
      });

      it('unlock timestamp more then MAX_LOCK_TIME', async () => {
        await expect(
          VotingEscrow.connect(signers.user1).create_lock_for_without_boost(
            0,
            BigInt(MAX_LOCK_TIME) + (await getRestForNextEpoch()),
            signers.user1.address,
          ),
        ).to.be.revertedWithCustomError(VotingEscrow, 'ValueZero');
      });

      it('try create lock with zero amount', async () => {
        await expect(
          VotingEscrow.connect(signers.user1).create_lock_for_without_boost(0, MAX_LOCK_TIME, signers.user1.address),
        ).to.be.revertedWithCustomError(VotingEscrow, 'ValueZero');
      });

      it('insufficient allowance or token balance', async () => {
        await expect(
          VotingEscrow.connect(signers.user1).create_lock_for_without_boost(1, MAX_LOCK_TIME, signers.user1.address),
        ).to.be.revertedWith(ERRORS.ERC20.InsufficientAllowance);
        await token.connect(signers.user1).approve(VotingEscrow.target, 1);
        await expect(
          VotingEscrow.connect(signers.user1).create_lock_for_without_boost(1, MAX_LOCK_TIME, signers.user1.address),
        ).to.be.revertedWith(ERRORS.ERC20.InsufficientBalance);
      });
    });

    describe('success create locks without boost', async () => {
      describe('first lock for the same user, async', () => {
        let expectedMintedId: bigint;
        let tx: ContractTransactionResponse;
        let expectedUnlockTimestamp: bigint;
        let txTimestamp: number;
        let stateFirstNft: any;
        let outputTokenId: bigint;

        beforeEach(async () => {
          await token.mint(signers.user1.address, ethers.parseEther('2'));
          await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('100'));
          expect(await token.balanceOf(signers.user1.address)).to.be.eq(ethers.parseEther('2'));
          expectedMintedId = (await VotingEscrow.lastMintedTokenId()) + 1n;
          expectedUnlockTimestamp = await roundToWeek(BigInt(await time.latest()) + BigInt(MAX_LOCK_TIME));
          outputTokenId = await VotingEscrow.connect(signers.user1).create_lock_for_without_boost.staticCall(
            ONE_ETHER,
            MAX_LOCK_TIME,
            signers.user1.address,
          );
          tx = await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
          txTimestamp = (await ethers.provider.getBlock(tx.blockNumber!))?.timestamp!;
        });

        it('first nft should start from id 1 and return correct id', async () => {
          expect(expectedMintedId).to.be.eq(1);
          expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(1);
          expect(outputTokenId).to.be.eq(expectedMintedId);
          expect(outputTokenId).to.be.eq(await VotingEscrow.lastMintedTokenId());
        });

        it('increase minted nfts counter', async () => {
          expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(expectedMintedId);
        });

        it('created nft for user1', async () => {
          expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(1);
          expect(await VotingEscrow.ownerOf(expectedMintedId)).to.be.eq(signers.user1.address);
        });

        it('emit events', async () => {
          await expect(tx).to.be.emit(token, 'Transfer').withArgs(signers.user1.address, VotingEscrow.target, ONE_ETHER);
          await expect(tx).to.be.emit(VotingEscrow, 'Supply').withArgs(0, ONE_ETHER);
          await expect(tx)
            .to.be.emit(VotingEscrow, 'Deposit')
            .withArgs(
              signers.user1.address,
              expectedMintedId,
              ONE_ETHER,
              expectedUnlockTimestamp,
              VotingEscrowDepositType.CREATE_LOCK_TYPE,
              txTimestamp,
            );
        });

        it('transfer token', async () => {
          expect(await token.balanceOf(VotingEscrow.target)).to.be.eq(ONE_ETHER);
          expect(await token.balanceOf(signers.user1.address)).to.be.eq(ONE_ETHER);
        });

        it('nft state', async () => {
          stateFirstNft = await VotingEscrow.nftStates(expectedMintedId);
          expect(stateFirstNft.locked.amount).to.be.eq(ONE_ETHER);
          expect(stateFirstNft.locked.end).to.be.eq(expectedUnlockTimestamp);
          expect(stateFirstNft.locked.isPermanentLocked).to.be.false;
          expect(stateFirstNft.isVoted).to.be.false;
          expect(stateFirstNft.lastTranferBlock).to.be.eq(tx!.blockNumber);
          expect(stateFirstNft.pointEpoch).to.be.eq(1);
        });

        it('increase supply', async () => {
          expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
          expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
        });

        it('return current balance should be zero in the same block', async () => {
          expect(tx!.blockNumber).to.be.eq(await time.latestBlock());
          expect(await VotingEscrow.balanceOfNFT(expectedMintedId)).to.be.eq(0);
        });

        describe('second lock, create from user1 for user2', async () => {
          beforeEach(async () => {
            expect(await token.balanceOf(signers.user1.address)).to.be.eq(ethers.parseEther('1'));
            expectedMintedId = expectedMintedId + 1n;
            expectedUnlockTimestamp = await roundToWeek(BigInt(await time.latest()) + BigInt(MAX_LOCK_TIME));
            tx = await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(
              ethers.parseEther('0.5'),
              MAX_LOCK_TIME,
              signers.user2.address,
            );
            txTimestamp = (await ethers.provider.getBlock(tx.blockNumber!))?.timestamp!;
          });

          it('increase minted nfts counter', async () => {
            expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(expectedMintedId);
          });

          it('created nft for user1', async () => {
            expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(1);
            expect(await VotingEscrow.balanceOf(signers.user2.address)).to.be.eq(1);
            expect(await VotingEscrow.ownerOf(expectedMintedId - 1n)).to.be.eq(signers.user1.address);
            expect(await VotingEscrow.ownerOf(expectedMintedId)).to.be.eq(signers.user2.address);
          });

          it('emit events', async () => {
            await expect(tx).to.be.emit(token, 'Transfer').withArgs(signers.user1.address, VotingEscrow.target, ethers.parseEther('0.5'));
            await expect(tx).to.be.emit(VotingEscrow, 'Supply').withArgs(ONE_ETHER, ethers.parseEther('1.5'));
            await expect(tx)
              .to.be.emit(VotingEscrow, 'Deposit')
              .withArgs(
                signers.user1.address,
                expectedMintedId,
                ethers.parseEther('0.5'),
                expectedUnlockTimestamp,
                VotingEscrowDepositType.CREATE_LOCK_TYPE,
                txTimestamp,
              );
          });

          it('transfer token', async () => {
            expect(await token.balanceOf(VotingEscrow.target)).to.be.eq(ethers.parseEther('1.5'));
            expect(await token.balanceOf(signers.user1.address)).to.be.eq(ethers.parseEther('0.5'));
          });

          it('nft state', async () => {
            let state = await VotingEscrow.nftStates(expectedMintedId);
            expect(state.locked.amount).to.be.eq(ethers.parseEther('0.5'));
            expect(state.locked.end).to.be.eq(expectedUnlockTimestamp);
            expect(state.locked.isPermanentLocked).to.be.false;
            expect(state.isVoted).to.be.false;
            expect(state.lastTranferBlock).to.be.eq(tx!.blockNumber);
            expect(state.pointEpoch).to.be.eq(1);
          });

          it('increase supply', async () => {
            expect(await VotingEscrow.supply()).to.be.eq(ethers.parseEther('1.5'));
          });
        });
      });
    });
  });

  describe('lock/unlock permanent', async () => {
    beforeEach(async () => {
      await token.mint(signers.user1.address, ethers.parseEther('2'));
      await token.mint(signers.user2.address, ethers.parseEther('2'));
      await token.connect(signers.user2).approve(VotingEscrow.target, ethers.parseEther('100'));
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('100'));
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
      await VotingEscrow.connect(signers.user2).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user2.address);
    });
    describe('should fail if ', async () => {
      it('try call from not token owner', async () => {
        await expect(VotingEscrow.connect(signers.user1).lockPermanent(2)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
        await expect(VotingEscrow.connect(signers.user2).lockPermanent(1)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
        await expect(VotingEscrow.connect(signers.user1).unlockPermanent(2)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
        await expect(VotingEscrow.connect(signers.user2).unlockPermanent(1)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
      });
    });
    it('success lock/unlock permanent', async () => {
      await expect(VotingEscrow.connect(signers.user1).lockPermanent(1))
        .to.be.emit(VotingEscrow, 'LockPermanent')
        .withArgs(signers.user1.address, 1);
      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(1);
      expect(await VotingEscrow.balanceOf(signers.user2.address)).to.be.eq(1);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user2.address);
      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.true;
      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.false;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('1') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('1'));
      expect(await VotingEscrow.balanceOfNFT(1)).to.be.eq(ethers.parseEther('1'));

      await expect(VotingEscrow.connect(signers.user2).lockPermanent(2))
        .to.be.emit(VotingEscrow, 'LockPermanent')
        .withArgs(signers.user2.address, 2);

      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(1);
      expect(await VotingEscrow.balanceOf(signers.user2.address)).to.be.eq(1);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user2.address);
      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.true;
      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.true;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('1'));
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ethers.parseEther('1'));
      expect(await VotingEscrow.balanceOfNFT(2)).to.be.eq(ethers.parseEther('1'));
      expect(await VotingEscrow.balanceOfNFT(1)).to.be.eq(ethers.parseEther('1'));

      await expect(VotingEscrow.connect(signers.user1).unlockPermanent(1))
        .to.be.emit(VotingEscrow, 'UnlockPermanent')
        .withArgs(signers.user1.address, 1);

      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(1);
      expect(await VotingEscrow.balanceOf(signers.user2.address)).to.be.eq(1);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user2.address);
      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.greaterThan((await time.latest()) + MAX_LOCK_TIME - WEEK);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.true;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('1'), ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNFT(1)).to.be.closeTo(ethers.parseEther('1'), ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ethers.parseEther('1'));
      expect(await VotingEscrow.balanceOfNFT(2)).to.be.eq(ethers.parseEther('1'));
    });
  });

  describe('Merge locks', async () => {
    beforeEach(async () => {
      await token.mint(signers.user1.address, ethers.parseEther('2'));
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('100'));
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
    });

    describe('should fail if ', async () => {
      it('user not owner of first token', async () => {
        await VotingEscrow.connect(signers.user1).transferFrom(signers.user1.address, signers.user2.address, 1);
        await expect(VotingEscrow.connect(signers.user1).merge(1, 2)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
      });

      it('user not owner of second token', async () => {
        await VotingEscrow.connect(signers.user1).transferFrom(signers.user1.address, signers.user2.address, 2);
        await expect(VotingEscrow.connect(signers.user1).merge(1, 2)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
      });

      it('from token is permannet locked', async () => {
        await VotingEscrow.connect(signers.user1).lockPermanent(1);
        await expect(VotingEscrow.connect(signers.user1).merge(1, 2)).to.be.revertedWithCustomError(VotingEscrow, 'PermanentLocked');
      });

      it('one from token is expired', async () => {
        await time.increase(MAX_LOCK_TIME + WEEK);
        await expect(VotingEscrow.connect(signers.user1).merge(1, 2)).to.be.revertedWithCustomError(VotingEscrow, 'TokenExpired');
      });

      it('the same token', async () => {
        await expect(VotingEscrow.connect(signers.user1).merge(1, 1)).to.be.revertedWithCustomError(VotingEscrow, 'MergeTokenIdsTheSame');
      });
    });

    it('success merge locks', async () => {
      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(2);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      let nftStateBefore = await VotingEscrow.nftStates(2);

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
      await VotingEscrow.connect(signers.user1).merge(1, 2);

      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.eq(nftStateBefore.locked.end);
      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(1);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      await expect(VotingEscrow.ownerOf(1)).to.be.reverted;
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user1.address);
      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked).to.be.deep.eq([0, 0, false]);
    });

    it('success merge locks when to token is permanent locked', async () => {
      await VotingEscrow.connect(signers.user1).lockPermanent(2);
      await VotingEscrow.connect(signers.user1).merge(1, 2);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.true;
      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(1);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      await expect(VotingEscrow.ownerOf(1)).to.be.reverted;
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user1.address);
      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ethers.parseEther('2'));
      expect((await VotingEscrow.nftStates(1)).locked).to.be.deep.eq([0, 0, false]);
    });
  });

  describe('Deposit to lock', async () => {
    let nftId = 1n;
    beforeEach(async () => {
      await token.mint(signers.user1.address, ONE_ETHER);
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('1'));
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
    });

    describe('deposit_for & deposit_for_without_boost', async () => {
      describe('should fail if', async () => {
        it('deposit zero', async () => {
          await expect(VotingEscrow.connect(signers.user1).deposit_for(nftId, 0)).to.be.revertedWithCustomError(VotingEscrow, 'ValueZero');
          await expect(VotingEscrow.connect(signers.user1).deposit_for_without_boost(nftId, 0)).to.be.revertedWithCustomError(
            VotingEscrow,
            'ValueZero',
          );
          await expect(VotingEscrow.connect(signers.user2).deposit_for(nftId, 0)).to.be.revertedWithCustomError(VotingEscrow, 'ValueZero');
          await expect(VotingEscrow.connect(signers.user2).deposit_for_without_boost(nftId, 0)).to.be.revertedWithCustomError(
            VotingEscrow,
            'ValueZero',
          );
        });
        it('deposit for expired nft', async () => {
          await time.increase(MAX_LOCK_TIME + WEEK);
          await expect(VotingEscrow.connect(signers.user1).deposit_for(nftId, 1)).to.be.revertedWithCustomError(
            VotingEscrow,
            'TokenExpired',
          );
          await expect(VotingEscrow.connect(signers.user1).deposit_for_without_boost(nftId, 1)).to.be.revertedWithCustomError(
            VotingEscrow,
            'TokenExpired',
          );
        });
        it('deposit for attached nft', async () => {
          await managedNFTManager.create(VotingEscrow.target, signers.deployer.address);
          await managedNFTManager.setIsManagedNft(3);
          await managedNFTManager.onAttachToManagedNFT(VotingEscrow.target, nftId, 3);
          await expect(VotingEscrow.connect(signers.user1).deposit_for(nftId, 1)).to.be.revertedWithCustomError(
            VotingEscrow,
            'TokenAttached',
          );
          await expect(VotingEscrow.connect(signers.user1).deposit_for_without_boost(nftId, 1)).to.be.revertedWithCustomError(
            VotingEscrow,
            'TokenAttached',
          );
        });
      });

      describe('success deposit for exists lock', async () => {
        let tx: ContractTransactionResponse;
        let txTimestamp: number;
        let unlockTimestamp: number;
        beforeEach(async () => {
          await token.mint(signers.user2.address, ethers.parseEther('1'));
          await token.connect(signers.user2).approve(VotingEscrow.target, ethers.parseEther('1'));
          expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
          expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
          expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
          unlockTimestamp = (await VotingEscrow.nftStates(1n)).locked.end;
          tx = await VotingEscrow.connect(signers.user2).deposit_for_without_boost(1n, ONE_ETHER);
          txTimestamp = (await ethers.provider.getBlock(tx.blockNumber!))?.timestamp!;
        });

        it('emit events', async () => {
          await expect(tx).to.be.emit(token, 'Transfer').withArgs(signers.user2.address, VotingEscrow.target, ONE_ETHER);
          await expect(tx)
            .to.be.emit(VotingEscrow, 'Supply')
            .withArgs(ONE_ETHER, ONE_ETHER + ONE_ETHER);
          await expect(tx)
            .to.be.emit(VotingEscrow, 'Deposit')
            .withArgs(signers.user2.address, 1n, ONE_ETHER, unlockTimestamp, VotingEscrowDepositType.DEPOSIT_FOR_TYPE, txTimestamp);
        });

        it('transfer token', async () => {
          expect(await token.balanceOf(VotingEscrow.target)).to.be.eq(ONE_ETHER + ONE_ETHER);
          expect(await token.balanceOf(signers.user1.address)).to.be.eq(0);
          expect(await token.balanceOf(signers.user2.address)).to.be.eq(0);
        });

        it('nft state', async () => {
          let state = await VotingEscrow.nftStates(1n);
          expect(state.locked.amount).to.be.eq(ONE_ETHER + ONE_ETHER);
          expect(state.locked.isPermanentLocked).to.be.false;
          expect(state.isVoted).to.be.false;
          expect(state.pointEpoch).to.be.eq(2);
        });

        it('increase supply', async () => {
          expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
          expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
        });
      });
    });
  });

  describe('tokenURI', async () => {
    it('should fail if call for not exist nft id', async () => {
      await expect(VotingEscrow.tokenURI(1)).to.be.revertedWith('ERC721: invalid token ID');
    });

    it('should success return tokenUri equal from VeArtProxy contract', async () => {
      await token.mint(signers.user1.address, ethers.parseEther('2'));
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('2'));
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, 2 * WEEK, signers.user1.address);
      // skip equal voting poower etc, only tokenId with common data
      expect((await VotingEscrow.tokenURI(1)).length).to.be.greaterThan(40);
      expect((await VotingEscrow.tokenURI(1)).slice(0, 40)).to.be.eq((await VeArtProxyUpgradeable.tokenURI(1, 1, 1, 1)).slice(0, 40));
    });
  });

  describe('transfer NFT', async () => {
    let nftId = 1n;
    let nftId2 = 2n;

    beforeEach(async () => {
      await token.mint(signers.user1.address, ethers.parseEther('2'));
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('2'));
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, 2 * WEEK, signers.user1.address);
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
    });

    it('check state after create locks', async () => {
      expect(await VotingEscrow.ownerOf(nftId)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(nftId2)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(2);
      expect(await VotingEscrow.balanceOf(signers.user2.address)).to.be.eq(0);
    });

    describe('should fail if', async () => {
      it('nft have voted state', async () => {
        await VotingEscrow.connect(voter).votingHook(nftId, true);
        expect((await VotingEscrow.nftStates(nftId)).isVoted).to.be.true;
        expect((await VotingEscrow.nftStates(nftId2)).isVoted).to.be.false;
        await expect(
          VotingEscrow.connect(signers.user1).transferFrom(signers.user1.address, signers.user2.address, nftId),
        ).to.be.revertedWithCustomError(VotingEscrow, 'TokenVoted');
        await expect(VotingEscrow.connect(signers.user1).transferFrom(signers.user1.address, signers.user2.address, nftId2)).to.be.not
          .reverted;
      });

      it('nft is managed nft', async () => {
        await managedNFTManager.create(VotingEscrow.target, signers.deployer.address);
        await managedNFTManager.setIsManagedNft(3);
        await expect(
          VotingEscrow.connect(signers.deployer).transferFrom(signers.deployer.address, signers.user2.address, 3),
        ).to.be.revertedWithCustomError(VotingEscrow, 'ManagedNftTransferDisabled');
      });

      it('nft attached to managed nft', async () => {
        await managedNFTManager.create(VotingEscrow.target, signers.deployer.address);
        await managedNFTManager.setIsManagedNft(3);
        await managedNFTManager.onAttachToManagedNFT(VotingEscrow.target, nftId, 3);
        await expect(
          VotingEscrow.connect(signers.user1).transferFrom(signers.user1.address, signers.user2.address, nftId),
        ).to.be.revertedWithCustomError(VotingEscrow, 'TokenAttached');
      });

      describe('Success transfer nft', async () => {
        let tx: ContractTransactionResponse;
        beforeEach(async () => {
          tx = await VotingEscrow.connect(signers.user1).transferFrom(signers.user1.address, signers.user2.address, nftId);
        });

        it('emit events', async () => {
          await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(signers.user1.address, signers.user2.address, nftId);
        });

        it('change last transfer block', async () => {
          expect((await VotingEscrow.nftStates(nftId)).lastTranferBlock).to.be.eq(tx.blockNumber);
        });

        it('balanceOfNFT should return zero voting power in the same block with transfer', async () => {
          expect(await time.latestBlock()).to.be.eq(tx.blockNumber);
          expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.eq(0);
        });

        it('balanceOfNFT should return correct voting power next block after transfer block', async () => {
          await mine();
          expect(await time.latestBlock()).to.be.eq(tx.blockNumber! + 1);
          expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.greaterThan(ethers.parseEther('0.01'));
        });

        it('balanceOfNftIgnoreOwnershipChange should return correct value', async () => {
          expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.greaterThan(ethers.parseEther('0.01'));
        });
      });
    });
  });

  describe('Increase unlock time', async () => {
    describe('should fail if', async () => {
      it('nft not exist', async () => {
        await expect(VotingEscrow.connect(signers.user1).increase_unlock_time(1, 1)).to.be.revertedWith('ERC721: invalid token ID');
      });
      describe('with exist nft', async () => {
        let nftId: bigint;
        beforeEach(async () => {
          await token.mint(signers.user1.address, ethers.parseEther('2'));
          await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('100'));
          nftId = (await VotingEscrow.lastMintedTokenId()) + 1n;
          await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
        });

        it('caller not nft owner', async () => {
          await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
          await expect(VotingEscrow.connect(signers.user2).increase_unlock_time(nftId, 1)).to.be.revertedWithCustomError(
            VotingEscrow,
            'AccessDenied',
          );
          await expect(VotingEscrow.connect(signers.deployer).increase_unlock_time(nftId, 1)).to.be.revertedWithCustomError(
            VotingEscrow,
            'AccessDenied',
          );
        });

        it('unlock timestamp not enought for lock to next epoch', async () => {
          await expect(VotingEscrow.connect(signers.user1).increase_unlock_time(nftId, 1)).to.be.revertedWithCustomError(
            VotingEscrow,
            'InvalidLockDuration',
          );
          await expect(
            VotingEscrow.connect(signers.user1).increase_unlock_time(nftId, (await getRestForNextEpoch()) - 100n),
          ).to.be.revertedWithCustomError(VotingEscrow, 'InvalidLockDuration');
        });

        it('unlock timestamp more then MAX_LOCK_TIME', async () => {
          await expect(
            VotingEscrow.connect(signers.user1).increase_unlock_time(nftId, BigInt(MAX_LOCK_TIME + WEEK)),
          ).to.be.revertedWithCustomError(VotingEscrow, 'InvalidLockDuration');
        });
      });
      describe('success increase unlock time for exist nft', async () => {
        let nftId: bigint;
        let unlockTimestamp: bigint;
        let stateNftAfterCreate: any;

        beforeEach(async () => {
          await token.mint(signers.user1.address, ethers.parseEther('1'));
          await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('1'));
          nftId = (await VotingEscrow.lastMintedTokenId()) + 1n;
          unlockTimestamp = await roundToWeek(BigInt(await time.latest()) + BigInt(WEEK + WEEK + WEEK));
          await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, WEEK + WEEK + WEEK, signers.user1.address);
        });

        it('state before increase unlock time', async () => {
          expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(nftId);
          stateNftAfterCreate = await VotingEscrow.nftStates(nftId);
          expect(stateNftAfterCreate.locked.amount).to.be.eq(ONE_ETHER);
          expect(stateNftAfterCreate.locked.end).to.be.eq(unlockTimestamp);
          expect(stateNftAfterCreate.locked.isPermanentLocked).to.be.false;
          expect(stateNftAfterCreate.isVoted).to.be.false;
          expect(stateNftAfterCreate.pointEpoch).to.be.eq(1);
        });

        describe('increase unlock timestamp', async () => {
          let tx: ContractTransactionResponse;
          let newUnlockTimestamp: bigint;
          let txTimestamp: number;
          beforeEach(async () => {
            newUnlockTimestamp = await roundToWeek(BigInt(await time.latest()) + BigInt(MAX_LOCK_TIME));
            tx = await VotingEscrow.connect(signers.user1).increase_unlock_time(nftId, MAX_LOCK_TIME);
            txTimestamp = (await ethers.provider.getBlock(tx.blockNumber!))?.timestamp!;
          });

          it('emit events', async () => {
            await expect(tx)
              .to.be.emit(VotingEscrow, 'Deposit')
              .withArgs(signers.user1.address, nftId, 0, newUnlockTimestamp, VotingEscrowDepositType.INCREASE_UNLOCK_TIME, txTimestamp);
          });

          it('change nft state with new unlock timestamp', async () => {
            expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(nftId);
            let newState = await VotingEscrow.nftStates(nftId);
            expect(newState.locked.amount).to.be.eq(stateNftAfterCreate.locked.amount);
            expect(newState.locked.isPermanentLocked).to.be.eq(stateNftAfterCreate.locked.isPermanentLocked);
            expect(newState.isVoted).to.be.eq(stateNftAfterCreate.isVoted);
            expect(newState.pointEpoch).to.be.eq(2);
            expect(newState.locked.end).to.be.eq(newUnlockTimestamp);
          });
        });
      });
    });
  });

  describe('Withdraw lock', async () => {
    describe('should fail if', async () => {
      let nftId = 1n;
      let nftId2 = 2n;

      it('nft not exist', async () => {
        await expect(VotingEscrow.connect(signers.user1).withdraw(nftId)).to.be.revertedWith('ERC721: invalid token ID');
      });

      describe('with exist nft', async () => {
        beforeEach(async () => {
          await token.mint(signers.user1.address, ethers.parseEther('1'));
          await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('1'));
          nftId = (await VotingEscrow.lastMintedTokenId()) + 1n;
          await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
        });

        it('caller not nft owner', async () => {
          await expect(VotingEscrow.connect(signers.user2).withdraw(nftId)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
          await expect(VotingEscrow.connect(signers.deployer).withdraw(nftId)).to.be.revertedWithCustomError(VotingEscrow, 'AccessDenied');
        });

        it('lock not expired', async () => {
          await expect(VotingEscrow.connect(signers.user1).withdraw(nftId)).to.be.revertedWithCustomError(VotingEscrow, 'TokenNoExpired');
        });
        it('lock not expired because token is permanent locked', async () => {
          await VotingEscrow.connect(signers.user1).lockPermanent(nftId);
          await time.increase(MAX_LOCK_TIME + WEEK);
          await expect(VotingEscrow.connect(signers.user1).withdraw(nftId)).to.be.revertedWithCustomError(VotingEscrow, 'TokenNoExpired');
        });
      });

      describe('success withdraw and burn nft', async () => {
        beforeEach(async () => {
          await token.mint(signers.user1.address, ethers.parseEther('2'));
          await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('2'));
          await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, 2 * WEEK, signers.user1.address);
          await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
        });

        it('balance state', async () => {
          expect(await token.balanceOf(VotingEscrow.target)).to.be.eq(ONE_ETHER + ONE_ETHER);
          expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
          expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
          expect(await token.balanceOf(signers.user1.address)).to.be.eq(0);
        });

        describe('success withdraw first nft after expired', async () => {
          let tx: ContractTransactionResponse;

          beforeEach(async () => {
            await time.increase(4 * WEEK);
            tx = await VotingEscrow.connect(signers.user1).withdraw(nftId);
          });

          it('balance state', async () => {
            expect(await token.balanceOf(VotingEscrow.target)).to.be.eq(ONE_ETHER);
            expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
            expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
            expect(await token.balanceOf(signers.user1.address)).to.be.eq(ONE_ETHER);
          });

          it('emit events', async () => {
            await expect(tx).to.be.emit(token, 'Transfer').withArgs(VotingEscrow.target, signers.user1.address, ONE_ETHER);
          });

          it('should fail if try also withdraw second nft', async () => {
            await expect(VotingEscrow.connect(signers.user1).withdraw(nftId2)).to.be.revertedWithCustomError(
              VotingEscrow,
              'TokenNoExpired',
            );
          });

          describe('success withdraw second nft after expired', async () => {
            beforeEach(async () => {
              await time.increase(MAX_LOCK_TIME);
              tx = await VotingEscrow.connect(signers.user1).withdraw(nftId2);
            });

            it('balance state', async () => {
              expect(await token.balanceOf(VotingEscrow.target)).to.be.eq(0);
              expect(await VotingEscrow.supply()).to.be.eq(0);
              expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
              expect(await token.balanceOf(signers.user1.address)).to.be.eq(ONE_ETHER + ONE_ETHER);
            });

            it('emit events', async () => {
              await expect(tx).to.be.emit(token, 'Transfer').withArgs(VotingEscrow.target, signers.user1.address, ONE_ETHER);
            });

            it('should fail if try withdraw nft again', async () => {
              await expect(VotingEscrow.connect(signers.user1).withdraw(nftId2)).to.be.revertedWith('ERC721: invalid token ID');
            });
          });
        });
      });
    });
  });

  describe('supply & permanentTotalSupply & votingPower & balanceOfNFT correct change after different actions', async () => {
    async function expectAllZero() {
      expect(await VotingEscrow.supply()).to.be.eq(0);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(nftId2)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId2)).to.be.eq(0);
    }
    let nftId = 1n;
    let nftId2 = 2n;

    it('init state', async () => {
      await expectAllZero();
    });

    it('one nft with all actions', async () => {
      expect(await VotingEscrow.supply()).to.be.eq(0);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.eq(0);
      await token.mint(signers.user1.address, ethers.parseEther('100'));
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('100'));

      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, WEEK, signers.user1.address);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER / 26n, ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n));

      await time.increase(WEEK);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.eq(0);

      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(2n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n)).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));

      await VotingEscrow.connect(signers.user1).withdraw(1n);

      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(2n)).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n)).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));

      await VotingEscrow.connect(signers.user1).deposit_for_without_boost(2n, ONE_ETHER);

      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER + ONE_ETHER, (ONE_ETHER + ONE_ETHER) / 26n);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(2n)).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n)).to.be.closeTo(ONE_ETHER + ONE_ETHER, (ONE_ETHER + ONE_ETHER) / 26n);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));

      await time.increase(Math.floor(MAX_LOCK_TIME / 2));

      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo((ONE_ETHER + ONE_ETHER) / 2n, (ONE_ETHER + ONE_ETHER) / 26n);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(2n)).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));

      await VotingEscrow.connect(signers.user1).lockPermanent(2n);

      expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(ONE_ETHER + ONE_ETHER);
      expect(await VotingEscrow.balanceOfNFT(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1n)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNFT(2n)).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));
      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2n));

      await VotingEscrow.connect(signers.user1).unlockPermanent(2n);
      await time.increase(MAX_LOCK_TIME + WEEK);

      await VotingEscrow.connect(signers.user1).withdraw(2n);

      await expectAllZero();
    });

    describe('first lock create', async () => {
      beforeEach(async () => {
        await token.mint(signers.user1.address, ethers.parseEther('1'));
        await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('1'));
        await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
      });

      it('one block after', async () => {
        await mine();
        expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
        expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNFT(nftId));
        expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, (ONE_ETHER * 1n) / 26n);
        expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.closeTo(ONE_ETHER, (ONE_ETHER * 1n) / 26n);
        expect(await VotingEscrow.balanceOfNFT(nftId2)).to.be.eq(0);
      });

      it('-', async () => {
        expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
        expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId));
        expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, (ONE_ETHER * 1n) / 26n);
        expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.closeTo(ONE_ETHER, (ONE_ETHER * 1n) / 26n);
        expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId2)).to.be.eq(0);
      });

      it('after part withdraw time', async () => {
        await time.increase(Math.floor(MAX_LOCK_TIME / 2));
        expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
        expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER / 2n, (ONE_ETHER * 1n) / 26n);
        expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.eq(await VotingEscrow.votingPowerTotalSupply());
        expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId2)).to.be.eq(0);
      });

      it('after transfer nft', async () => {
        await VotingEscrow.connect(signers.user1).transferFrom(signers.user1.address, signers.user2.address, nftId);
        expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
        expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
        expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
        expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.eq(0);
        expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
        expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.eq(await VotingEscrow.votingPowerTotalSupply());
        expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId2)).to.be.eq(0);
      });

      describe('withdraw lock', async () => {
        beforeEach(async () => {
          await time.increase(MAX_LOCK_TIME + WEEK);
          await VotingEscrow.connect(signers.user1).withdraw(nftId);
        });

        it('-', async () => {
          await expectAllZero();
        });

        describe('create second lock after some time', async () => {
          beforeEach(async () => {
            await time.increase(MAX_LOCK_TIME);
            await token.mint(signers.user1.address, ethers.parseEther('1'));
            await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('1'));
            await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
          });

          it('-', async () => {
            expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
            expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
            expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
            expect(await VotingEscrow.balanceOfNFT(nftId2)).to.be.eq(0);
            expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.eq(0);
            expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId2)).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
            expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.eq(0);
          });

          describe('withdraw second lock', async () => {
            beforeEach(async () => {
              await time.increase(MAX_LOCK_TIME + WEEK);
              await VotingEscrow.connect(signers.user1).withdraw(nftId2);
            });
            it('-', async () => {
              await expectAllZero();
            });
          });
        });
      });

      describe('permanent lock', async () => {
        beforeEach(async () => {
          await VotingEscrow.connect(signers.user1).lockPermanent(nftId);
        });

        it('-', async () => {
          expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
          expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER);
          expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(ONE_ETHER);
          expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.eq(ONE_ETHER);
          expect(await VotingEscrow.balanceOfNFT(nftId2)).to.be.eq(0);
        });

        describe('unlock permanent', async () => {
          beforeEach(async () => {
            await VotingEscrow.connect(signers.user1).unlockPermanent(nftId);
          });

          it('-', async () => {
            expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER);
            expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
            expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
            expect(await VotingEscrow.balanceOfNFT(nftId)).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
            expect(await VotingEscrow.balanceOfNFT(nftId2)).to.be.eq(0);
          });
        });
      });

      describe('create second lock after part time', async () => {
        beforeEach(async () => {
          await time.increase(Math.floor(MAX_LOCK_TIME / 2));
          await token.mint(signers.user1.address, ethers.parseEther('1'));
          await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('1'));
          await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
        });

        it('-', async () => {
          expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
          expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
          expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId2)).to.be.closeTo(ONE_ETHER, ONE_ETHER / 26n);
          expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.closeTo(ONE_ETHER / 2n, ONE_ETHER / 26n);
          expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('1.5'), ONE_ETHER / 13n);
        });

        describe('permanent first and second lock', async () => {
          beforeEach(async () => {
            await VotingEscrow.connect(signers.user1).lockPermanent(nftId2);
            await VotingEscrow.connect(signers.user1).lockPermanent(nftId);
          });
          it('-', async () => {
            expect(await VotingEscrow.supply()).to.be.eq(ONE_ETHER + ONE_ETHER);
            expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ONE_ETHER + ONE_ETHER);
            expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(ONE_ETHER + ONE_ETHER);
            expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId2)).to.be.eq(ONE_ETHER);
            expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(nftId)).to.be.eq(ONE_ETHER);
          });
        });
      });
    });
  });

  describe('Managed nft', async () => {
    it('createManagedNFT$ should fail if try call from not managed nft manager ', async () => {
      await expect(VotingEscrow.connect(signers.user1).createManagedNFT(signers.user1)).to.be.revertedWithCustomError(
        VotingEscrow,
        'AccessDenied',
      );
    });

    it('onAttachToManagedNFT$ should fail if try call from not managed nft manager ', async () => {
      await expect(VotingEscrow.connect(signers.user1).onAttachToManagedNFT(1, 1)).to.be.revertedWithCustomError(
        VotingEscrow,
        'AccessDenied',
      );
    });

    it('onDettachFromManagedNFT$ should fail if try call from not managed nft manager ', async () => {
      await expect(VotingEscrow.connect(signers.user1).onAttachToManagedNFT(1, 1)).to.be.revertedWithCustomError(
        VotingEscrow,
        'AccessDenied',
      );
    });

    it('should fail if provided managedTokenId is not managed token id', async () => {
      await token.mint(signers.user1.address, ethers.parseEther('2'));
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('2'));
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);

      await managedNFTManager.create(VotingEscrow.target, signers.deployer.address);
      await managedNFTManager.setIsManagedNft(3);

      await expect(managedNFTManager.onAttachToManagedNFT(VotingEscrow.target, 1, 2)).to.be.revertedWithCustomError(
        VotingEscrow,
        'NotManagedNft',
      );

      await managedNFTManager.onAttachToManagedNFT(VotingEscrow.target, 1, 3);

      await expect(managedNFTManager.onDettachFromManagedNFT(VotingEscrow.target, 1, 2, 1)).to.be.revertedWithCustomError(
        VotingEscrow,
        'NotManagedNft',
      );
    });

    it('success attach and dettach to/from managed nft', async () => {
      await token.mint(signers.user1.address, ethers.parseEther('2'));
      await token.connect(signers.user1).approve(VotingEscrow.target, ethers.parseEther('2'));
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);
      await VotingEscrow.connect(signers.user1).create_lock_for_without_boost(ONE_ETHER, MAX_LOCK_TIME, signers.user1.address);

      await managedNFTManager.create(VotingEscrow.target, signers.deployer.address);

      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(2);
      expect(await VotingEscrow.balanceOf(signers.deployer.address)).to.be.eq(1);

      expect(await VotingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(3)).to.be.eq(signers.deployer.address);

      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.greaterThan((await time.latest()) + MAX_LOCK_TIME - WEEK);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(1)).isAttached).to.be.false;

      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.greaterThan((await time.latest()) + MAX_LOCK_TIME - WEEK);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(2)).isAttached).to.be.false;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), (2n * ONE_ETHER) / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('1'), ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('1'), ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.eq(0);

      await managedNFTManager.setIsManagedNft(3);
      await managedNFTManager.onAttachToManagedNFT(VotingEscrow.target, 1, 3);

      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(2);
      expect(await VotingEscrow.balanceOf(signers.deployer.address)).to.be.eq(1);

      expect(await VotingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(3)).to.be.eq(signers.deployer.address);

      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(1)).isAttached).to.be.true;

      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.greaterThan((await time.latest()) + MAX_LOCK_TIME - WEEK);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(2)).isAttached).to.be.false;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('1'), ONE_ETHER / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.eq(ONE_ETHER);

      await managedNFTManager.onAttachToManagedNFT(VotingEscrow.target, 2, 3);

      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(2);
      expect(await VotingEscrow.balanceOf(signers.deployer.address)).to.be.eq(1);

      expect(await VotingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(3)).to.be.eq(signers.deployer.address);

      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(1)).isAttached).to.be.true;

      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(0);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(2)).isAttached).to.be.true;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.eq(ethers.parseEther('2'));

      await managedNFTManager.onDettachFromManagedNFT(VotingEscrow.target, 2, 3, ethers.parseEther('1'));

      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(2);
      expect(await VotingEscrow.balanceOf(signers.deployer.address)).to.be.eq(1);

      expect(await VotingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(3)).to.be.eq(signers.deployer.address);

      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.eq(0);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(1)).isAttached).to.be.true;

      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.greaterThan((await time.latest()) + MAX_LOCK_TIME - WEEK);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(2)).isAttached).to.be.false;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('1') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(0);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('1') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.eq(ethers.parseEther('1'));

      await managedNFTManager.onDettachFromManagedNFT(VotingEscrow.target, 1, 3, ethers.parseEther('1'));

      expect(await VotingEscrow.balanceOf(signers.user1.address)).to.be.eq(2);
      expect(await VotingEscrow.balanceOf(signers.deployer.address)).to.be.eq(1);

      expect(await VotingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await VotingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await VotingEscrow.ownerOf(1)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(2)).to.be.eq(signers.user1.address);
      expect(await VotingEscrow.ownerOf(3)).to.be.eq(signers.deployer.address);

      expect((await VotingEscrow.nftStates(1)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(1)).locked.end).to.be.greaterThan((await time.latest()) + MAX_LOCK_TIME - WEEK);
      expect((await VotingEscrow.nftStates(1)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(1)).isAttached).to.be.false;

      expect((await VotingEscrow.nftStates(2)).locked.amount).to.be.eq(ONE_ETHER);
      expect((await VotingEscrow.nftStates(2)).locked.end).to.be.greaterThan((await time.latest()) + MAX_LOCK_TIME - WEEK);
      expect((await VotingEscrow.nftStates(2)).locked.isPermanentLocked).to.be.false;
      expect((await VotingEscrow.nftStates(2)).isAttached).to.be.false;

      expect(await VotingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('2') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('1') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('1') / 26n);
      expect(await VotingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.eq(0);
    });
  });
});

import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  Fenix,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../../typechain-types';
import { ERRORS, WEEK, WETH_PREDEPLOYED_ADDRESS, ZERO, getAccessControlError } from '../../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../../utils/coreFixture';
import { pool } from '@cryptoalgebra/integral-core/typechain/contracts/interfaces';

describe('Voting cast events emits', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let Voter: VoterUpgradeableV2;
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let Fenix: Fenix;

  async function newPool(token0: string, token1: string) {
    let t0 = await deployERC20MockToken(signers.deployer, token0, token0, 18);
    let t1 = await deployERC20MockToken(signers.deployer, token1, token1, 18);
    await deployed.v2PairFactory.createPair(t0.target, t1.target, false);
    return deployed.v2PairFactory.getPair(t0.target, t1.target, false);
  }

  let pools: string[] = [];
  let otherUser1VeNftTokenId: bigint;
  let otherUser2VeNftTokenId: bigint;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    Fenix = deployed.fenix;
    Voter = deployed.voter;
    VotingEscrow = deployed.votingEscrow;

    for (let index = 0; index < 3; index++) {
      let pool = await newPool('token0' + index, 'token1' + index);
      await Voter.createV2Gauge(pool);
      pools.push(pool);
    }

    await Fenix.approve(VotingEscrow.target, ethers.MaxUint256);

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser1.address, false, true, 0);
    otherUser1VeNftTokenId = await VotingEscrow.lastMintedTokenId();

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser2.address, false, true, 0);
    otherUser2VeNftTokenId = await VotingEscrow.lastMintedTokenId();
  });

  describe('should success emit events for votes calls', async () => {
    beforeEach(async () => {
      let currentEpoch = await deployed.minter.active_period();
      let prevEpoch = currentEpoch - BigInt(WEEK);
      let nextEpoch = currentEpoch + BigInt(WEEK);

      expect(await Voter.totalWeightsPerEpoch(currentEpoch)).to.be.eq(ZERO);
      expect(await Voter.totalWeightsPerEpoch(prevEpoch)).to.be.eq(ZERO);
      expect(await Voter.totalWeightsPerEpoch(nextEpoch)).to.be.eq(ZERO);
      for (let index = 0; index < pools.length; index++) {
        expect(await Voter.weightsPerEpoch(currentEpoch, pools[index])).to.be.eq(ZERO);
      }
      for (let index = 1; index <= otherUser2VeNftTokenId; index++) {
        expect(await Voter.poolVoteLength(index)).to.be.eq(ZERO);
      }
    });

    it('#reset for user without votes in current epoch', async () => {
      let currentEpoch = await deployed.minter.active_period();
      let tx = await Voter.connect(signers.otherUser1).reset(otherUser1VeNftTokenId);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser1.address, otherUser1VeNftTokenId, currentEpoch, 0);
      await expect(tx).to.be.not.emit(Voter, 'VoteCast');
    });

    it('#poke for user without votes in current epoch, not emit cast without votes', async () => {
      let currentEpoch = await deployed.minter.active_period();
      let tx = await Voter.connect(signers.otherUser1).poke(otherUser1VeNftTokenId);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser1.address, otherUser1VeNftTokenId, currentEpoch, 0);
      await expect(tx).to.be.not.emit(Voter, 'VoteCast');
    });

    it('#success emit with votes for singel pools and revote for second pool', async () => {
      let currentEpoch = await deployed.minter.active_period();
      let tx = await Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[0]], [1]);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser1.address, otherUser1VeNftTokenId, currentEpoch, 0);
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser1.address,
          otherUser1VeNftTokenId,
          currentEpoch,
          [pools[0]],
          [ethers.parseEther('100')],
          ethers.parseEther('100'),
        );

      tx = await Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[1]], [2]);
      await expect(tx)
        .to.be.emit(Voter, 'VoteReset')
        .withArgs(signers.otherUser1.address, otherUser1VeNftTokenId, currentEpoch, ethers.parseEther('100'));
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser1.address,
          otherUser1VeNftTokenId,
          currentEpoch,
          [pools[1]],
          [ethers.parseEther('100')],
          ethers.parseEther('100'),
        );
    });

    it('#success emit events in dif cases', async () => {
      let currentEpoch = await deployed.minter.active_period();
      let tx = await Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[1], pools[0]], [2, 3]);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser1.address, otherUser1VeNftTokenId, currentEpoch, 0);
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser1.address,
          otherUser1VeNftTokenId,
          currentEpoch,
          [pools[1], pools[0]],
          [ethers.parseEther('40'), ethers.parseEther('60')],
          ethers.parseEther('100'),
        );

      tx = await Voter.connect(signers.otherUser2).vote(otherUser2VeNftTokenId, [pools[1]], [2]);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser2.address, otherUser2VeNftTokenId, currentEpoch, 0);
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser2.address,
          otherUser2VeNftTokenId,
          currentEpoch,
          [pools[1]],
          [ethers.parseEther('100')],
          ethers.parseEther('100'),
        );

      await VotingEscrow.depositFor(otherUser1VeNftTokenId, ethers.parseEther('100'), false, false);

      tx = await Voter.connect(signers.otherUser1).poke(otherUser1VeNftTokenId);
      await expect(tx)
        .to.be.emit(Voter, 'VoteReset')
        .withArgs(signers.otherUser1.address, otherUser1VeNftTokenId, currentEpoch, ethers.parseEther('100'));
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser1.address,
          otherUser1VeNftTokenId,
          currentEpoch,
          [pools[1], pools[0]],
          [ethers.parseEther('80'), ethers.parseEther('120')],
          ethers.parseEther('200'),
        );

      await time.increase(86400 * 7);

      await Voter.distributeAll();

      let newEpoch = currentEpoch + BigInt(86400 * 7);
      tx = await Voter.connect(signers.otherUser2).reset(otherUser2VeNftTokenId);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser2.address, otherUser2VeNftTokenId, newEpoch, 0);
      await expect(tx).to.be.not.emit(Voter, 'VoteCast');

      tx = await Voter.connect(signers.otherUser1).poke(otherUser1VeNftTokenId);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser1.address, otherUser1VeNftTokenId, newEpoch, 0);
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser1.address,
          otherUser1VeNftTokenId,
          newEpoch,
          [pools[1], pools[0]],
          [ethers.parseEther('80'), ethers.parseEther('120')],
          ethers.parseEther('200'),
        );

      tx = await Voter.connect(signers.otherUser2).vote(otherUser2VeNftTokenId, [pools[1], pools[0]], [5, 5]);
      await expect(tx).to.be.emit(Voter, 'VoteReset').withArgs(signers.otherUser2.address, otherUser2VeNftTokenId, newEpoch, 0);
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser2.address,
          otherUser2VeNftTokenId,
          newEpoch,
          [pools[1], pools[0]],
          [ethers.parseEther('50'), ethers.parseEther('50')],
          ethers.parseEther('100'),
        );
      tx = await Voter.connect(signers.otherUser2).vote(otherUser2VeNftTokenId, [pools[0]], [10]);
      await expect(tx)
        .to.be.emit(Voter, 'VoteReset')
        .withArgs(signers.otherUser2.address, otherUser2VeNftTokenId, newEpoch, ethers.parseEther('100'));
      await expect(tx)
        .to.be.emit(Voter, 'VoteCast')
        .withArgs(
          signers.otherUser2.address,
          otherUser2VeNftTokenId,
          newEpoch,
          [pools[0]],
          [ethers.parseEther('100')],
          ethers.parseEther('100'),
        );
    });
  });
});

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  SingelTokenBuybackUpgradeableMock__factory,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../../typechain-types';
import completeFixture, { CoreFixtureDeployed, deployERC20MockToken, mockBlast, SignersList } from '../../utils/coreFixture';
import { ERRORS, getAccessControlError } from '../../utils/constants';

describe('VotingEscrow_V2', function () {
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let Voter: VoterUpgradeableV2;
  let signers: SignersList;
  let token: ERC20Mock;
  let deployed: CoreFixtureDeployed;

  beforeEach(async () => {
    deployed = await loadFixture(completeFixture);
    VotingEscrow = deployed.votingEscrow;
    Voter = deployed.voter;
    signers = deployed.signers;
    token = await deployERC20MockToken(signers.deployer, 'MOK', 'MOK', 18);
  });

  async function getNextEpochTime() {
    return (BigInt(await time.latest()) / 604800n) * 604800n + 604800n;
  }

  describe('Deployment', async () => {
    describe('should fail if', async () => {
      it('try call initialize on implementation', async () => {
        await expect(Voter.initialize(signers.blastGovernor.address, VotingEscrow.target)).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
      it('try recall initialize on proxy', async () => {
        await expect(Voter.initialize(signers.blastGovernor.address, token.target)).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });
    });
    describe('State after deployment and initialization', async () => {
      it('caller should have DEFAULT_ADMIN_ROLE', async () => {
        expect(await Voter.hasRole(await Voter.DEFAULT_ADMIN_ROLE(), signers.deployer.address)).to.be.true;
      });

      it('votingEscrow & _ve', async () => {
        expect(await Voter._ve()).to.be.eq(VotingEscrow.target);
        expect(await Voter.votingEscrow()).to.be.eq(VotingEscrow.target);
      });

      it('token', async () => {
        expect(await Voter.token()).to.be.eq(await VotingEscrow.token());
        expect(await Voter.token()).to.be.eq(deployed.fenix.target);
      });

      it('voteDelay', async () => {
        expect(await Voter.voteDelay()).to.be.eq(0);
      });

      it('minter', async () => {
        expect(await Voter.minter()).to.be.eq(deployed.minter.target);
      });

      it('distributionWindowDuration', async () => {
        expect(await Voter.distributionWindowDuration()).to.be.eq(3600);
      });
    });
  });

  describe('Access restricted functionality', async () => {
    describe('#setDistributionWindowDuration', async () => {
      it('fail if call from not VoterAdmin', async () => {
        await expect(Voter.connect(signers.otherUser1).setDistributionWindowDuration(3600)).to.be.revertedWith(
          getAccessControlError(ethers.id('VOTER_ADMIN_ROLE'), signers.otherUser1.address),
        );
      });
      it('success set new distribution window', async () => {
        expect(await Voter.distributionWindowDuration()).to.be.eq(3600);
        await expect(Voter.setDistributionWindowDuration(155)).to.be.emit(Voter, 'SetDistributionWindowDuration').withArgs(155);
        expect(await Voter.distributionWindowDuration()).to.be.eq(155);
      });
    });

    describe('#setVoteDelay', async () => {
      it('fail if call from not VoterAdmin', async () => {
        await expect(Voter.connect(signers.otherUser1).setVoteDelay(3600)).to.be.revertedWith(
          getAccessControlError(ethers.id('VOTER_ADMIN_ROLE'), signers.otherUser1.address),
        );
      });
      it('success set new voteDelay window', async () => {
        expect(await Voter.voteDelay()).to.be.eq(0);
        await expect(Voter.setVoteDelay(155)).to.be.emit(Voter, 'SetVoteDelay').withArgs(0, 155);
        expect(await Voter.voteDelay()).to.be.eq(155);
      });
    });

    describe('#killGauge', async () => {
      it('should fail if call from not GOVERNANCE_ROLE', async () => {
        await expect(Voter.connect(signers.otherUser1).killGauge(ethers.ZeroAddress)).to.be.revertedWith(
          getAccessControlError(ethers.id('GOVERNANCE_ROLE'), signers.otherUser1.address),
        );
      });

      it('should fail if gauge not alive', async () => {
        await expect(Voter.killGauge(ethers.ZeroAddress)).to.be.revertedWithCustomError(Voter, 'GaugeAlreadyKilled');
      });

      it('success kill gauge', async () => {
        let pair = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token.target, false);
        await deployed.v2PairFactory.createPair(deployed.fenix.target, token.target, false);
        await Voter.createV2Gauge(pair);
        let gauge = await Voter.poolToGauge(pair);

        await expect(Voter.killGauge(gauge)).to.be.emit(Voter, 'GaugeKilled').withArgs(gauge);
        let gaugeState = await Voter.gaugesState(gauge);
        expect(gaugeState.isGauge).to.be.true;
        expect(gaugeState.isAlive).to.be.false;
      });
    });
    describe('#reviveGauge', async () => {
      it('should fail if call from not GOVERNANCE_ROLE', async () => {
        await expect(Voter.connect(signers.otherUser1).reviveGauge(ethers.ZeroAddress)).to.be.revertedWith(
          getAccessControlError(ethers.id('GOVERNANCE_ROLE'), signers.otherUser1.address),
        );
      });

      it('should fail if gauge not klilled to revive', async () => {
        let pair = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token.target, false);
        await deployed.v2PairFactory.createPair(deployed.fenix.target, token.target, false);
        await Voter.createV2Gauge(pair);
        let gauge = await Voter.poolToGauge(pair);

        await expect(Voter.reviveGauge(gauge)).to.be.revertedWithCustomError(Voter, 'GaugeNotKilled');
      });

      it('success revive gauge', async () => {
        let pair = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token.target, false);
        await deployed.v2PairFactory.createPair(deployed.fenix.target, token.target, false);
        await Voter.createV2Gauge(pair);
        let gauge = await Voter.poolToGauge(pair);
        await Voter.killGauge(gauge);
        await expect(Voter.reviveGauge(gauge)).to.be.emit(Voter, 'GaugeRevived').withArgs(gauge);
        let gaugeState = await Voter.gaugesState(gauge);
        expect(gaugeState.isGauge).to.be.true;
        expect(gaugeState.isAlive).to.be.true;
      });
    });

    describe('distribution window', async () => {
      beforeEach(async () => {
        await deployed.fenix.transfer(signers.otherUser1.address, ethers.parseEther('2'));
        await deployed.fenix.connect(signers.otherUser1).approve(VotingEscrow.target, ethers.parseEther('100'));
        await VotingEscrow.connect(signers.otherUser1).create_lock_for_without_boost(ethers.parseEther('1'), 15724800, signers.otherUser1);
      });

      describe('should fail if ', async () => {
        it('try use poke during vote window', async () => {
          let nextEpoch = await getNextEpochTime();
          await time.increase(nextEpoch - 3600n + 1n);
          expect(await Voter.connect(signers.otherUser1).poke(1)).to.be.revertedWithCustomError(Voter, 'DistributionWindow');

          await time.increase(nextEpoch);
          expect(await Voter.connect(signers.otherUser1).poke(1)).to.be.revertedWithCustomError(Voter, 'DistributionWindow');

          await time.increase(nextEpoch + 3600n - 1n);
          expect(await Voter.connect(signers.otherUser1).poke(1)).to.be.revertedWithCustomError(Voter, 'DistributionWindow');
          await time.increase(nextEpoch + 3700n);
          expect(await Voter.connect(signers.otherUser1).poke(1)).to.be.not.revertedWithCustomError(Voter, 'DistributionWindow');
        });

        it('try use reset during vote window', async () => {
          let nextEpoch = await getNextEpochTime();
          await time.increase(nextEpoch - 3600n + 1n);
          expect(await Voter.connect(signers.otherUser1).reset(1)).to.be.revertedWithCustomError(Voter, 'DistributionWindow');

          await time.increase(nextEpoch);
          expect(await Voter.connect(signers.otherUser1).reset(1)).to.be.revertedWithCustomError(Voter, 'DistributionWindow');

          await time.increase(nextEpoch + 3600n - 1n);
          expect(await Voter.connect(signers.otherUser1).reset(1)).to.be.revertedWithCustomError(Voter, 'DistributionWindow');
          await time.increase(nextEpoch + 3700n);
          expect(await Voter.connect(signers.otherUser1).reset(1)).to.be.not.revertedWithCustomError(Voter, 'DistributionWindow');
        });

        it('try use vote during vote window', async () => {
          let nextEpoch = await getNextEpochTime();
          await time.increase(nextEpoch - 3600n + 1n);
          expect(await Voter.connect(signers.otherUser1).vote(1, [], [])).to.be.revertedWithCustomError(Voter, 'DistributionWindow');

          await time.increase(nextEpoch);
          expect(await Voter.connect(signers.otherUser1).vote(1, [], [])).to.be.revertedWithCustomError(Voter, 'DistributionWindow');

          await time.increase(nextEpoch + 3600n - 1n);
          expect(await Voter.connect(signers.otherUser1).vote(1, [], [])).to.be.revertedWithCustomError(Voter, 'DistributionWindow');
          await time.increase(nextEpoch + 3700n);
          expect(await Voter.connect(signers.otherUser1).vote(1, [], [])).to.be.not.revertedWithCustomError(Voter, 'DistributionWindow');
        });
      });
    });

    describe('#updateAddress', async () => {
      describe('should fail if', async () => {
        it('call from not VOTER_ADMIN_ROLE', async () => {
          await expect(Voter.connect(signers.otherUser1).updateAddress('minter', ethers.ZeroAddress)).to.be.revertedWith(
            getAccessControlError(ethers.id('VOTER_ADMIN_ROLE'), signers.otherUser1.address),
          );
        });
        it('call with invalid key', async () => {
          await expect(Voter.updateAddress('1', ethers.ZeroAddress)).to.be.revertedWithCustomError(Voter, 'InvalidAddressKey');
        });
      });

      describe('success update and emit event', async () => {
        const TEST_ADDRESS = '0x1000000000000000000000000000000000000001';
        beforeEach(async () => {
          await Voter.updateAddress('minter', ethers.ZeroAddress);
          await Voter.updateAddress('bribeFactory', ethers.ZeroAddress);
          await Voter.updateAddress('merklDistributor', ethers.ZeroAddress);
          await Voter.updateAddress('veFnxMerklAidrop', ethers.ZeroAddress);
          await Voter.updateAddress('managedNFTManager', ethers.ZeroAddress);
          await Voter.updateAddress('v2PoolFactory', ethers.ZeroAddress);
          await Voter.updateAddress('v3PoolFactory', ethers.ZeroAddress);
          await Voter.updateAddress('v2GaugeFactory', ethers.ZeroAddress);
          await Voter.updateAddress('v3GaugeFactory', ethers.ZeroAddress);

          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });

        it('minter', async () => {
          await expect(Voter.updateAddress('minter', deployed.minter.target))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('minter', deployed.minter.target);
          expect(await Voter.minter()).to.be.eq(deployed.minter.target);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });

        it('bribeFactory', async () => {
          await expect(Voter.updateAddress('bribeFactory', deployed.bribeFactory.target))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('bribeFactory', deployed.bribeFactory.target);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(deployed.bribeFactory.target);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });

        it('merklDistributor', async () => {
          await expect(Voter.updateAddress('merklDistributor', deployed.merklDistributionCreator.target))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('merklDistributor', deployed.merklDistributionCreator.target);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(deployed.merklDistributionCreator.target);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });

        it('veFnxMerklAidrop', async () => {
          await expect(Voter.updateAddress('veFnxMerklAidrop', TEST_ADDRESS))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('veFnxMerklAidrop', TEST_ADDRESS);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(TEST_ADDRESS);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });

        it('managedNFTManager', async () => {
          await expect(Voter.updateAddress('managedNFTManager', TEST_ADDRESS))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('managedNFTManager', TEST_ADDRESS);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(TEST_ADDRESS);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });

        it('v2PoolFactory', async () => {
          await expect(Voter.updateAddress('v2PoolFactory', TEST_ADDRESS))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('v2PoolFactory', TEST_ADDRESS);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(TEST_ADDRESS);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });

        it('v3PoolFactory', async () => {
          await expect(Voter.updateAddress('v3PoolFactory', TEST_ADDRESS))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('v3PoolFactory', TEST_ADDRESS);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(TEST_ADDRESS);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });
        it('v2GaugeFactory', async () => {
          await expect(Voter.updateAddress('v2GaugeFactory', TEST_ADDRESS))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('v2GaugeFactory', TEST_ADDRESS);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(TEST_ADDRESS);
          expect(await Voter.v3GaugeFactory()).to.be.eq(ethers.ZeroAddress);
        });
        it('v3GaugeFactory', async () => {
          await expect(Voter.updateAddress('v3GaugeFactory', TEST_ADDRESS))
            .to.be.emit(Voter, 'UpdateAddress')
            .withArgs('v3GaugeFactory', TEST_ADDRESS);
          expect(await Voter.minter()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.bribeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.merklDistributor()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.veFnxMerklAidrop()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.managedNFTManager()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3PoolFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v2GaugeFactory()).to.be.eq(ethers.ZeroAddress);
          expect(await Voter.v3GaugeFactory()).to.be.eq(TEST_ADDRESS);
        });
      });
    });

    describe('#createV2Gauge', async () => {
      describe('fail if', async () => {
        it('user havent GOVERNANCE_ROLE role', async () => {
          await expect(Voter.connect(signers.otherUser1).createV2Gauge(signers.otherUser1.address)).to.be.revertedWith(
            getAccessControlError(ethers.id('GOVERNANCE_ROLE'), signers.otherUser1.address),
          );
        });
        it('gauge for pool already exists', async () => {
          let pair = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token.target, false);
          await deployed.v2PairFactory.createPair(deployed.fenix.target, token.target, false);
          await Voter.createV2Gauge(pair);
          await expect(Voter.createV2Gauge(pair)).to.be.revertedWithCustomError(Voter, 'GaugeForPoolAlreadyExists');
        });
        it('invalid pool address', async () => {
          await expect(Voter.createV2Gauge(deployed.fenix.target)).to.be.revertedWithCustomError(Voter, 'PoolNotCreatedByFactory');
        });
      });

      describe('success create v2 gauge for v2 pool', async () => {
        let tx: any;
        let pair: any;
        let res: any;

        beforeEach(async () => {
          pair = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token.target, false);
          await deployed.v2PairFactory.createPair(deployed.fenix.target, token.target, false);
          res = await Voter.createV2Gauge.staticCall(pair);
          tx = await Voter.createV2Gauge(pair);
        });

        it('return correct address', async () => {
          expect(await Voter.poolToGauge(pair)).to.be.eq(res.gauge);
          expect((await Voter.gaugesState(res.gauge)).pool).to.be.eq(pair);
        });

        it('initialized gauge state', async () => {
          let gaugeState = await Voter.gaugesState(res.gauge);
          expect(gaugeState.isGauge).to.be.true;
          expect(gaugeState.isAlive).to.be.true;
          expect(gaugeState.internalBribe).to.be.not.eq(ethers.ZeroAddress);
          expect(gaugeState.externalBribe).to.be.not.eq(ethers.ZeroAddress);
          expect(gaugeState.internalBribe).to.be.eq(res.internalBribe);
          expect(gaugeState.externalBribe).to.be.eq(res.externalBribe);
          expect(gaugeState.pool).to.be.eq(pair);
          expect(gaugeState.claimable).to.be.eq(0);
          expect(gaugeState.index).to.be.eq(0);
          expect(gaugeState.lastDistributionTimestamp).to.be.eq(0);
        });

        it('success emit event', async () => {
          await expect(tx)
            .to.be.emit(Voter, 'GaugeCreated')
            .withArgs(res.gauge, signers.deployer.address, res.internalBribe, res.externalBribe, pair);
        });

        it('add pool to v2 list', async () => {
          expect(await Voter.v2Pools(0)).to.be.eq(pair);
        });

        it('add pool to general list', async () => {
          expect(await Voter.pools(0)).to.be.eq(pair);
        });
      });
    });
    describe('#createV3Gauge', async () => {
      describe('fail if', async () => {
        it('user havent GOVERNANCE_ROLE role', async () => {
          await expect(Voter.connect(signers.otherUser1).createV3Gauge(signers.otherUser1.address)).to.be.revertedWith(
            getAccessControlError(ethers.id('GOVERNANCE_ROLE'), signers.otherUser1.address),
          );
        });
        it('gauge for pool already exists', async () => {
          let pair = await deployed.v2PairFactory.createPair.staticCall(deployed.fenix.target, token.target, false);
          await deployed.v2PairFactory.createPair(deployed.fenix.target, token.target, false);
          await Voter.createV2Gauge(pair);
          await expect(Voter.createV3Gauge(pair)).to.be.revertedWithCustomError(Voter, 'GaugeForPoolAlreadyExists');
        });
      });
    });
  });
});

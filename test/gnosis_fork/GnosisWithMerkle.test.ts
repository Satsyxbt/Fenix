import {
  SnapshotRestorer,
  getStorageAt,
  loadFixture,
  setCode,
  setStorageAt,
  takeSnapshot,
  time,
} from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastMock__factory, ERC20Mock, MerklGaugeMiddleman, MerkleDistributionCreatorMock } from '../../typechain-types';
import { BLAST_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken, getSigners } from '../utils/coreFixture';

describe('GnosisWithMerkl Contract', function () {
  if (process.env.GNOSIS_FORK === 'true') {
    const GNOSIS_DISTRIBUTOR_CREATOR = '0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd';
    const GNOSIS_DISTRIBUTOR = '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae';
    const GNOSIS_CORE = '0xFD0DFC837Fe7ED19B23df589b6F6Da5a775F99E0';

    let snapshot: SnapshotRestorer;
    let deployed: CoreFixtureDeployed;
    let signers: SignersList;
    let merklMiddleman: MerklGaugeMiddleman;
    let tokenTK18: ERC20Mock;
    let v2Pool: string;
    let gaugeV2: string;
    let merklDistributionCreator: MerkleDistributionCreatorMock;
    let initCore: string;
    let emissionAmount: bigint;

    before(async function () {
      snapshot = await takeSnapshot();
      await setCode(BLAST_PREDEPLOYED_ADDRESS, BlastMock__factory.bytecode);
      deployed = await loadFixture(completeFixture);
      signers = await getSigners();

      merklMiddleman = await ethers.deployContract('MerklGaugeMiddleman', [
        signers.blastGovernor.address,
        deployed.fenix.target,
        GNOSIS_DISTRIBUTOR_CREATOR,
      ]);
      merklDistributionCreator = await ethers.getContractAt('MerkleDistributionCreatorMock', GNOSIS_DISTRIBUTOR_CREATOR);
      await deployed.gaugeFactory.setMerklGaugeMiddleman(merklMiddleman.target);

      tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
      initCore = await getStorageAt(await merklDistributionCreator.getAddress(), 151);

      await merklDistributionCreator.acceptConditions();
    });

    after(async () => {
      await setStorageAt(await merklDistributionCreator.getAddress(), 151, initCore);
      await snapshot.restore();
    });

    it('expect storage slot for core address, and change', async () => {
      expect(initCore).to.be.eq(ethers.zeroPadValue(GNOSIS_CORE, 32));
      let mock = await ethers.deployContract('CoreMock');
      await setStorageAt(await merklDistributionCreator.getAddress(), 151, await mock.getAddress());
    });

    it('whitelisted token for distribution', async () => {
      await merklDistributionCreator.toggleTokenWhitelist(deployed.fenix.target);
      await merklDistributionCreator.toggleTokenWhitelist(tokenTK18.target);
      await merklDistributionCreator.setRewardTokenMinAmounts([deployed.fenix.target, tokenTK18.target], [1e6, 1e6]);

      expect(await merklDistributionCreator.rewardTokenMinAmounts(deployed.fenix.target)).to.be.eq(1e6);
      expect(await merklDistributionCreator.rewardTokenMinAmounts(tokenTK18.target)).to.be.eq(1e6);
      expect(await merklDistributionCreator.isWhitelistedToken(tokenTK18.target)).to.be.eq(1);
      expect(await merklDistributionCreator.isWhitelistedToken(deployed.fenix.target)).to.be.eq(1);
    });

    it('Correct create new gauges for v2 pair', async () => {
      await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK18.target, true);
      v2Pool = await deployed.v2PairFactory.getPair(deployed.fenix.target, tokenTK18.target, true);
      await deployed.voter.connect(signers.deployer).createGauge(v2Pool, 0);
      gaugeV2 = await deployed.gaugeFactory.last_gauge();
    });

    it('Success set gauge parameters', async () => {
      let params = {
        uniV3Pool: v2Pool,
        rewardToken: deployed.fenix.target,
        positionWrappers: [],
        wrapperTypes: [],
        amount: ethers.parseEther('1'),
        propToken0: 4000,
        propToken1: 2000,
        propFees: 4000,
        isOutOfRangeIncentivized: 0,
        epochStart: 1,
        numEpoch: 2,
        boostedReward: 0,
        boostingAddress: ZERO_ADDRESS,
        rewardId: ethers.id('TEST') as string,
        additionalData: ethers.id('test2ng') as string,
      };
      await merklMiddleman.setGauge(gaugeV2, params);
    });
    it('settings and prepare before emisison distribution', async () => {
      await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('100'));
      let gauge = await ethers.getContractAt('GaugeUpgradeable', gaugeV2);
      await gauge.setMerklGaugeMiddleman(merklMiddleman.target);
      await gauge.setIsDistributeEmissionToMerkle(true);
      await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 60 * 86400, signers.deployer.address);
    });
    it('check balance Fenix for addresses before emission distribution', async () => {
      let gauge = await ethers.getContractAt('GaugeUpgradeable', gaugeV2);
      expect(await deployed.fenix.balanceOf(deployed.voter.target)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('1'));
      expect(await deployed.fenix.balanceOf(merklMiddleman)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(gaugeV2)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(await gauge.internal_bribe())).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(await gauge.external_bribe())).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(GNOSIS_DISTRIBUTOR)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(GNOSIS_DISTRIBUTOR_CREATOR)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(await merklDistributionCreator.feeRecipient())).to.be.eq(ZERO);
    });
    it('success create distribution for gauge and tranfer to MERKLE_DISTRIBUTOR', async () => {
      emissionAmount = await deployed.minter.weekly();
      emissionAmount = emissionAmount - (emissionAmount * (await deployed.minter.teamRate())) / (await deployed.minter.PRECISION());

      let id = await deployed.votingEscrow.totalTokens();
      await deployed.voter.vote(id, [v2Pool], [ethers.parseEther('1')]);

      await time.increase(7 * 86400);

      await expect(deployed.voter.distributeAll()).to.be.emit(merklMiddleman, 'CreateDistribution');
    });
    it('check balance Fenix for addresses after emission distribution', async () => {
      let gauge = await ethers.getContractAt('GaugeUpgradeable', gaugeV2);
      expect(await deployed.fenix.balanceOf(deployed.voter.target)).to.be.lessThan(2);
      expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('1'));
      expect(await deployed.fenix.balanceOf(merklMiddleman)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(gaugeV2)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(await gauge.internal_bribe())).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(await gauge.external_bribe())).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(GNOSIS_DISTRIBUTOR_CREATOR)).to.be.eq(ZERO);
      let merkelReceive =
        (await deployed.fenix.balanceOf(await merklDistributionCreator.feeRecipient())) +
        (await deployed.fenix.balanceOf(GNOSIS_DISTRIBUTOR));
      expect(merkelReceive).to.be.closeTo(emissionAmount, 1);
    });
  } else {
    it('Skip if not gnosis fork', async () => {});
  }
});

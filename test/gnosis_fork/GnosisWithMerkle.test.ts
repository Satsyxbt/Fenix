import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  BlastERC20RebasingManageMock__factory,
  BlastMock__factory,
  ERC20Mock,
  Fenix,
  IGaugeFactory__factory,
  MerklGaugeMiddleman,
  MerkleDistributionCreatorMock,
  MerkleDistributionCreatorMock__factory,
} from '../../typechain-types';
import { , ZERO, ZERO_ADDRESS } from '../utils/constants';
import { getStorageAt, loadFixture, setStorageAt, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken, getSigners } from '../utils/coreFixture';
import { setCode } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { BLAST_PREDEPLOYED_ADDRESS } from '../utils/constants';

describe('BlastERC20RebasingManage Contract', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let merklMiddleman: MerklGaugeMiddleman;
  let tokenTK18: ERC20Mock;
  let v2Pool: string;
  let gaugeV2: string;
  let merklDistributionCreator: MerkleDistributionCreatorMock;
  let initCore: string;
  if (process.env.GNOSIS_FORK === 'true') {
    const GNOSIS_DISTRIBUTOR_CREATOR = '0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd';

    before(async function () {
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
    });

    it(' expect storage slot for core address, and change', async () => {
      expect(initCore).to.be.eq(ethers.zeroPadValue('0xFD0DFC837Fe7ED19B23df589b6F6Da5a775F99E0', 32));
      let mock = await ethers.deployContract('CoreMock');
      console.log('await mock.getAddress()', ethers.zeroPadValue(await mock.getAddress(), 32));
      await setStorageAt(await merklDistributionCreator.getAddress(), 151, await mock.getAddress());
    });

    it('whitelisted token for distribution', async () => {
      await merklDistributionCreator.toggleTokenWhitelist(deployed.fenix.target);
      await merklDistributionCreator.toggleTokenWhitelist(tokenTK18.target);
      await merklDistributionCreator.setRewardTokenMinAmounts([deployed.fenix.target, tokenTK18.target], [1e6, 1e6]);
    });

    it('Correct create new gauges for v2Pair', async () => {
      await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK18.target, true);
      v2Pool = await deployed.v2PairFactory.getPair(deployed.fenix.target, tokenTK18.target, true);
      await deployed.voter.connect(signers.deployer).createGauge(v2Pool, 0);
      gaugeV2 = await deployed.gaugeFactory.last_gauge();
    });

    it('Success set gauge ', async () => {
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
      console.log('gaugeV2', gaugeV2);
      await merklMiddleman.setGauge(gaugeV2, params);
    });

    it('Success create distribution for gauge v2', async () => {
      await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('100'));
      let gauge = await ethers.getContractAt('GaugeUpgradeable', gaugeV2);
      await gauge.setMerklGaugeMiddleman(merklMiddleman.target);
      await gauge.setIsDistributeEmissionToMerkle(true);

      await deployed.votingEscrow.create_lock(ethers.parseEther('1'), 150 * 86400);
      expect(await deployed.fenix.balanceOf(deployed.voter.target)).to.be.eq(ZERO);

      let id = await deployed.votingEscrow.totalTokens();
      await deployed.voter.vote(id, [v2Pool], [ethers.parseEther('1')]);
      await time.increase(7 * 86400);
      await expect(deployed.voter.distributeAll()).to.be.emit(merklMiddleman, 'CreateDistribution');
      await time.increase(7 * 86400);
      expect(await deployed.fenix.balanceOf(deployed.voter.target)).to.be.lessThan(2);
      expect(await deployed.fenix.balanceOf(merklMiddleman)).to.be.eq(ZERO);
      expect(await deployed.fenix.balanceOf(gauge.target)).to.be.eq(ZERO);
      console.log(await deployed.fenix.balanceOf(merklDistributionCreator.target));
      console.log(await deployed.fenix.balanceOf('0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae'));
    });
  } else {
    it('Skip if not gnosis fork', async () => {});
  }
});

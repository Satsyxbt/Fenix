import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  MerklGaugeMiddleman,
  MerklGaugeMiddleman__factory,
  MerkleDistributionCreatorMock,
  PoolMock,
  PoolMock__factory,
} from '../../typechain-types';
import { ERRORS, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { SignersList, deployERC20MockToken } from '../utils/coreFixture';

describe('MerklGaugeMiddleman Contract', function () {
  let signers: SignersList;
  let merklGaugeMiddlemanFactory: MerklGaugeMiddleman__factory;
  let fenix: ERC20Mock;
  let agEUR: ERC20Mock;

  let merklGaugeMiddleman: MerklGaugeMiddleman;
  let merkleDistributorCreatorMock: MerkleDistributionCreatorMock;
  let params: any;
  let poolMockFactory: PoolMock__factory;
  let poolMock: PoolMock;
  let startTime: number;

  beforeEach(async function () {
    const deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = await deployERC20MockToken(signers.deployer, 'FNX', 'FNX', 18);
    agEUR = await deployERC20MockToken(signers.deployer, 'agEur', 'agEur', 18);

    merklGaugeMiddlemanFactory = await ethers.getContractFactory('MerklGaugeMiddleman');
    merkleDistributorCreatorMock = await ethers.deployContract('MerkleDistributionCreatorMock');

    merklGaugeMiddleman = await merklGaugeMiddlemanFactory.deploy(
      signers.blastGovernor.address,
      fenix.target,
      merkleDistributorCreatorMock.target,
    );

    poolMockFactory = await ethers.getContractFactory('PoolMock');
    poolMock = await poolMockFactory.deploy();
    startTime = await time.latest();

    await merkleDistributorCreatorMock.setRewardTokenMinAmounts([fenix.target], [1]);
    await fenix.mint(signers.otherUser1.address, ethers.parseEther('1000'));
    await fenix.connect(signers.otherUser1).approve(merklGaugeMiddleman.target, ethers.MaxUint256);
    await poolMock.setTokens(fenix.target, agEUR.target);

    params = {
      uniV3Pool: poolMock.target,
      rewardToken: fenix.target,
      positionWrappers: [signers.otherUser1.address, signers.otherUser2.address, signers.deployer.address],
      wrapperTypes: [0, 1, 2],
      amount: ethers.parseEther('1'),
      propToken0: 4000,
      propToken1: 2000,
      propFees: 4000,
      isOutOfRangeIncentivized: 0,
      epochStart: startTime,
      numEpoch: 1,
      boostedReward: 0,
      boostingAddress: ZERO_ADDRESS,
      rewardId: ethers.id('TEST') as string,
      additionalData: ethers.id('test2ng') as string,
    };
  });

  describe('Deployments', async () => {
    it('should correct set token', async () => {
      expect(await merklGaugeMiddleman.token()).to.be.eq(fenix.target);
    });
    it('should correct set deployer as owner in contract', async () => {
      expect(await merklGaugeMiddleman.owner()).to.be.eq(signers.deployer.address);
    });
    it('should correct set merklDistributionCreator', async () => {
      expect(await merklGaugeMiddleman.merklDistributionCreator()).to.be.eq(merkleDistributorCreatorMock.target);
    });
    it('fails if provide zero governor address', async () => {
      await expect(
        merklGaugeMiddlemanFactory.connect(signers.deployer).deploy(ZERO_ADDRESS, fenix.target, merkleDistributorCreatorMock.target),
      ).to.be.revertedWithCustomError(merklGaugeMiddlemanFactory, 'AddressZero');
    });
    it('fails if provide zero fenix  address', async () => {
      await expect(
        merklGaugeMiddlemanFactory
          .connect(signers.deployer)
          .deploy(signers.blastGovernor.address, ZERO_ADDRESS, merkleDistributorCreatorMock.target),
      ).to.be.revertedWithCustomError(merklGaugeMiddlemanFactory, 'AddressZero');
    });
    it('fails if provide merkleDistributorCreator zero address', async () => {
      await expect(
        merklGaugeMiddlemanFactory.connect(signers.deployer).deploy(signers.blastGovernor.address, fenix.target, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(merklGaugeMiddlemanFactory, 'AddressZero');
    });
    it('corect set MAX_UINT256 allowance in fenix token to merkle distributor creator', async () => {
      expect(await fenix.allowance(merklGaugeMiddleman.target, merkleDistributorCreatorMock.target)).to.be.eq(ethers.MaxUint256);
    });
  });
  describe('#setFenixAllowance', async () => {
    it('can be called by anyone and increase allowance of fenix to merkle distributor to max', async () => {
      await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
      await fenix.connect(signers.otherUser1).transfer(merklGaugeMiddleman.target, ethers.parseEther('0.7'));
      expect(await fenix.balanceOf(merklGaugeMiddleman.target)).to.be.equal(ethers.parseEther('0.7'));
      await merklGaugeMiddleman.connect(signers.otherUser1).notifyReward(signers.otherUser1.address, ethers.parseEther('0.7'));
      expect(await fenix.balanceOf(merkleDistributorCreatorMock.target)).to.be.equal(ethers.parseEther('0.7'));

      // not changed,  because new erc20 implementation
      expect(await fenix.allowance(merklGaugeMiddleman.target, merkleDistributorCreatorMock.target)).to.be.eq(ethers.MaxUint256);

      await merklGaugeMiddleman.connect(signers.otherUser1).setFenixAllowance();
      expect(await fenix.allowance(merklGaugeMiddleman.target, merkleDistributorCreatorMock.target)).to.be.eq(ethers.MaxUint256);
    });
  });
  describe('setGauge', () => {
    it('reverts - access control', async () => {
      await expect(merklGaugeMiddleman.connect(signers.otherUser1).setGauge(ZERO_ADDRESS, params)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
    it('reverts - invalid params', async () => {
      const params0 = {
        uniV3Pool: poolMock.target,
        rewardToken: agEUR.target,
        positionWrappers: [signers.otherUser1.address, signers.otherUser2.address, signers.deployer.address],
        wrapperTypes: [0, 1, 2],
        amount: ethers.parseEther('1'),
        propToken0: 4000,
        propToken1: 2000,
        propFees: 4000,
        isOutOfRangeIncentivized: 0,
        epochStart: startTime,
        numEpoch: 1,
        boostedReward: 0,
        boostingAddress: ZERO_ADDRESS,
        rewardId: ethers.id('TEST') as string,
        additionalData: ethers.id('test2ng') as string,
      };
      const params1 = {
        uniV3Pool: signers.otherUser1.address,
        rewardToken: fenix.target,
        positionWrappers: [signers.otherUser1.address, signers.otherUser2.address, signers.deployer.address],
        wrapperTypes: [0, 1, 2],
        amount: ethers.parseEther('1'),
        propToken0: 4000,
        propToken1: 2000,
        propFees: 4000,
        isOutOfRangeIncentivized: 0,
        epochStart: startTime,
        numEpoch: 1,
        boostedReward: 0,
        boostingAddress: ZERO_ADDRESS,
        rewardId: ethers.id('TEST') as string,
        additionalData: ethers.id('test2ng') as string,
      };
      await expect(merklGaugeMiddleman.connect(signers.deployer).setGauge(ZERO_ADDRESS, params)).to.be.revertedWithCustomError(
        merklGaugeMiddleman,
        'InvalidParams',
      );
      await expect(
        merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params0),
      ).to.be.revertedWithCustomError(merklGaugeMiddleman, 'InvalidParams');
    });
    it('success - value updated - token 0', async () => {
      const receipt = await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
      await expect(receipt).to.be.emit(merklGaugeMiddleman, 'GaugeSet').withArgs(signers.otherUser1.address);

      const reward = await merklGaugeMiddleman.gaugeParams(signers.otherUser1.address);
      expect(reward.uniV3Pool).to.be.equal(poolMock.target);
      expect(reward.rewardToken).to.be.equal(fenix.target);
      expect(reward.amount).to.be.equal(ethers.parseEther('1'));
      expect(reward.propToken0).to.be.equal(4000);
      expect(reward.propToken1).to.be.equal(2000);
      expect(reward.propFees).to.be.equal(4000);
      expect(reward.isOutOfRangeIncentivized).to.be.equal(0);
      expect(reward.epochStart).to.be.equal(startTime);
      expect(reward.numEpoch).to.be.equal(1);
      expect(reward.boostedReward).to.be.equal(0);
      expect(reward.boostingAddress).to.be.equal(ZERO_ADDRESS);
      expect(reward.rewardId).to.be.equal(ethers.id('TEST') as string);
    });
    it('success - value updated - token 1', async () => {
      const receipt = await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
      await expect(receipt).to.be.emit(merklGaugeMiddleman, 'GaugeSet').withArgs(signers.otherUser1.address);

      const reward = await merklGaugeMiddleman.gaugeParams(signers.otherUser1.address);
      expect(reward.uniV3Pool).to.be.equal(poolMock.target);
      expect(reward.rewardToken).to.be.equal(fenix.target);
      expect(reward.amount).to.be.equal(ethers.parseEther('1'));
      expect(reward.propToken0).to.be.equal(4000);
      expect(reward.propToken1).to.be.equal(2000);
      expect(reward.propFees).to.be.equal(4000);
      expect(reward.isOutOfRangeIncentivized).to.be.equal(0);
      expect(reward.epochStart).to.be.equal(startTime);
      expect(reward.numEpoch).to.be.equal(1);
      expect(reward.boostedReward).to.be.equal(0);
      expect(reward.boostingAddress).to.be.equal(ZERO_ADDRESS);
      expect(reward.rewardId).to.be.equal(ethers.id('TEST') as string);
    });
  });
  describe('notifyReward', () => {
    it('reverts - invalid params', async () => {
      await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
      await expect(
        merklGaugeMiddleman.connect(signers.otherUser2).notifyReward(ZERO_ADDRESS, ethers.parseEther('0.5')),
      ).to.be.revertedWithCustomError(merklGaugeMiddleman, 'InvalidParams');
      await expect(
        merklGaugeMiddleman.connect(signers.otherUser1).notifyReward(ZERO_ADDRESS, ethers.parseEther('0.5')),
      ).to.be.revertedWithCustomError(merklGaugeMiddleman, 'InvalidParams');
    });
    it('success - rewards well sent', async () => {
      await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
      await fenix.connect(signers.otherUser1).transfer(merklGaugeMiddleman.target, ethers.parseEther('0.7'));
      expect(await fenix.balanceOf(merklGaugeMiddleman.target)).to.be.equal(ethers.parseEther('0.7'));
      await merklGaugeMiddleman.connect(signers.otherUser1).notifyReward(signers.otherUser1.address, ethers.parseEther('0.7'));
      const t = await time.latest();
      expect(await fenix.balanceOf(merkleDistributorCreatorMock.target)).to.be.equal(ethers.parseEther('0.7'));
    });
  });
  it('success - rewards well sent when zero amount', async () => {
    await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
    await fenix.connect(signers.otherUser1).transfer(merklGaugeMiddleman.target, ethers.parseEther('0.7'));
    expect(await fenix.balanceOf(merklGaugeMiddleman.target)).to.be.equal(ethers.parseEther('0.7'));
    expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.equal(ethers.parseEther('999.3'));

    await merkleDistributorCreatorMock.setRewardTokenMinAmounts([fenix.target], [ethers.parseEther('10')]);

    await merklGaugeMiddleman.connect(signers.otherUser1).notifyReward(signers.otherUser1.address, ethers.parseEther('0'));
    expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.equal(ethers.parseEther('1000'));
    expect(await fenix.balanceOf(merklGaugeMiddleman.target)).to.be.equal(ethers.parseEther('0'));
    expect(await fenix.balanceOf(merkleDistributorCreatorMock.target)).to.be.equal(ethers.parseEther('0'));
    expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.equal(ethers.parseEther('0'));
  });
  it('success - rewards sent for different gauges at once', async () => {
    const params0 = {
      uniV3Pool: poolMock.target,
      rewardToken: fenix.target,
      positionWrappers: [],
      wrapperTypes: [],
      amount: ethers.parseEther('1'),
      propToken0: 3000,
      propToken1: 2000,
      propFees: 5000,
      isOutOfRangeIncentivized: 0,
      epochStart: startTime,
      numEpoch: 10,
      boostedReward: 0,
      boostingAddress: ZERO_ADDRESS,
      rewardId: ethers.id('TEST') as string,
      additionalData: ethers.id('test2ng') as string,
    };
    await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
    await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser2.address, params0);

    await merklGaugeMiddleman.connect(signers.otherUser1).notifyReward(signers.otherUser1.address, ethers.parseEther('0'));
    await fenix.connect(signers.otherUser1).transfer(merklGaugeMiddleman.target, ethers.parseEther('0.7'));
    await merklGaugeMiddleman.connect(signers.otherUser1).notifyReward(signers.otherUser1.address, ethers.parseEther('0.7'));
    await fenix.connect(signers.otherUser1).transfer(merklGaugeMiddleman.target, ethers.parseEther('0.8'));
    await merklGaugeMiddleman.connect(signers.otherUser1).notifyReward(signers.otherUser2.address, ethers.parseEther('0.8'));

    expect(await fenix.balanceOf(merkleDistributorCreatorMock.target)).to.be.equal(ethers.parseEther('1.5'));
    expect(await fenix.balanceOf(merklGaugeMiddleman.target)).to.be.equal(ethers.parseEther('0'));
  });
  describe('notifyRewardWithAmount', () => {
    it('success - rewards well sent', async () => {
      await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
      await fenix.connect(signers.otherUser1).approve(merklGaugeMiddleman.target, ethers.parseEther('0.7'));
      expect(await fenix.balanceOf(merklGaugeMiddleman.target)).to.be.equal(ethers.parseEther('0'));
      await merklGaugeMiddleman.connect(signers.otherUser1).notifyRewardWithTransfer(signers.otherUser1.address, ethers.parseEther('0.7'));
      expect(await fenix.balanceOf(merkleDistributorCreatorMock.target)).to.be.equal(ethers.parseEther('0.7'));
    });
    it('reverts - no approval', async () => {
      await merklGaugeMiddleman.connect(signers.deployer).setGauge(signers.otherUser1.address, params);
      await fenix.connect(signers.otherUser1).approve(merklGaugeMiddleman.target, 0);
      await expect(
        merklGaugeMiddleman.connect(signers.otherUser1).notifyRewardWithTransfer(signers.otherUser1.address, ethers.parseEther('0.7')),
      ).to.be.reverted;
    });
  });
});

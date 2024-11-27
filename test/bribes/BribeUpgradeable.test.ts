import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, WEEK, ZERO_ADDRESS } from '../utils/constants';

import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { BribeFactoryUpgradeable, BribeFactoryUpgradeable__factory, BribeUpgradeable, ERC20Mock } from '../../typechain-types';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  deployVoter,
} from '../utils/coreFixture';

describe('BribeFactoryUpgradeable Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;

  let bribeFactory: BribeFactoryUpgradeable;
  let internalBribe: BribeUpgradeable;
  let internalBribe2: BribeUpgradeable;

  let token18: ERC20Mock;
  let token9: ERC20Mock;
  let token6: ERC20Mock;
  let token5: ERC20Mock;

  before(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;

    token18 = await deployERC20MockToken(signers.deployer, 'Token18', 'T18', 18);
    token9 = await deployERC20MockToken(signers.deployer, 'Token9', 'T9', 9);
    token6 = await deployERC20MockToken(signers.deployer, 'Token6', 'T6', 6);
    token5 = await deployERC20MockToken(signers.deployer, 'Token5', 'T5', 5);

    bribeFactory = deployed.bribeFactory;
    let currentEpoch = (BigInt(await time.latest()) / (86400n * 7n)) * 86400n * 7n;
    let newImpl = await ethers.deployContract('BribeUpgradeableMockWithFixTargetEpoch', [signers.blastGovernor.address, currentEpoch]);
    await bribeFactory.changeImplementation(newImpl.target);

    await deployed.v2PairFactory.createPair(token18.target, token9.target, false);
    let pair = await deployed.v2PairFactory.getPair(token18.target, token9.target, false);
    await deployed.v2PairFactory.createPair(token18.target, token6.target, false);
    let pair2 = await deployed.v2PairFactory.getPair(token18.target, token6.target, false);

    await deployed.voter.createV2Gauge(pair);
    await deployed.voter.createV2Gauge(pair2);

    let gauge = await deployed.voter.poolToGauge(pair);
    let gaugeState = await deployed.voter.gaugesState(gauge);
    internalBribe = await ethers.getContractAt('BribeUpgradeable', gaugeState.internalBribe);

    let gauge2 = await deployed.voter.poolToGauge(pair2);

    let gaugeState2 = await deployed.voter.gaugesState(gauge2);

    internalBribe2 = await ethers.getContractAt('BribeUpgradeable', gaugeState2.internalBribe);

    await token18.approve(internalBribe.target, ethers.MaxUint256);
    await token18.mint(signers.deployer.address, ethers.parseEther('100'));
    await token9.mint(signers.deployer.address, 100e9);
    await token9.approve(internalBribe.target, ethers.MaxUint256);

    await internalBribe.notifyRewardAmount(token18.target, ethers.parseEther('100'));
    await internalBribe.notifyRewardAmount(token9.target, 1e9);

    await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('1000'));
    await deployed.votingEscrow.createLockFor(ethers.parseEther('1'), 0, signers.otherUser1.address, false, true, 0);
    await deployed.votingEscrow.createLockFor(ethers.parseEther('1'), 0, signers.otherUser2.address, false, true, 0);
    await deployed.votingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser3.address, false, true, 0);

    await deployed.voter.connect(signers.otherUser1).vote(1, [pair], [100]);
    await deployed.voter.connect(signers.otherUser2).vote(2, [pair], [100]);
    await deployed.voter.connect(signers.otherUser3).vote(3, [pair, pair2], [2, 98]);
  });

  it('state after', async () => {
    let epoch = await internalBribe.getEpochStart();
    expect(await internalBribe.totalSupply()).to.be.eq(ethers.parseEther('4'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser1.address, epoch)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser2.address, epoch)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser3.address, epoch)).to.be.eq(ethers.parseEther('2'));

    expect(await internalBribe2.totalSupply()).to.be.eq(ethers.parseEther('98'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser1.address, epoch)).to.be.eq(ethers.parseEther('0'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser2.address, epoch)).to.be.eq(ethers.parseEther('0'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser3.address, epoch)).to.be.eq(ethers.parseEther('98'));

    expect(await internalBribe['earned(address,address)'](signers.otherUser1.address, token18.target)).to.be.eq(0);
    expect(await internalBribe['earned(address,address)'](signers.otherUser2.address, token18.target)).to.be.eq(0);
    expect(await internalBribe['earned(address,address)'](signers.otherUser3.address, token18.target)).to.be.eq(0);

    expect(await internalBribe2['earned(address,address)'](signers.otherUser1.address, token18.target)).to.be.eq(0);
    expect(await internalBribe2['earned(address,address)'](signers.otherUser2.address, token18.target)).to.be.eq(0);
    expect(await internalBribe2['earned(address,address)'](signers.otherUser3.address, token18.target)).to.be.eq(0);
  });

  it('fail if try call fix without pause', async () => {
    await expect(internalBribe.fixVotingPowerForPreviusEpoch(1, 1)).to.be.revertedWithCustomError(internalBribe, 'RewardClaimNotPaused');
  });

  it('one epoch after', async () => {
    await time.increase(86400 * 7);
    await deployed.voter.distributeAll();

    let prevEpoch = (await internalBribe.getEpochStart()) - BigInt(WEEK);
    let currentEpoch = await internalBribe.getEpochStart();

    expect(await internalBribe.totalSupplyAt(prevEpoch)).to.be.eq(ethers.parseEther('4'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser1.address, prevEpoch)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser2.address, prevEpoch)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser3.address, prevEpoch)).to.be.eq(ethers.parseEther('2'));
    expect(await internalBribe2.totalSupplyAt(prevEpoch)).to.be.eq(ethers.parseEther('98'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser1.address, prevEpoch)).to.be.eq(ethers.parseEther('0'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser2.address, prevEpoch)).to.be.eq(ethers.parseEther('0'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser3.address, prevEpoch)).to.be.eq(ethers.parseEther('98'));

    expect(await internalBribe.totalSupply()).to.be.eq(0);
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser1.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser2.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser3.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe2.totalSupply()).to.be.eq(0);
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser1.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser2.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser3.address, currentEpoch)).to.be.eq(0);

    expect(await internalBribe['earned(address,address)'](signers.otherUser1.address, token18.target)).to.be.eq(ethers.parseEther('25'));
    expect(await internalBribe['earned(address,address)'](signers.otherUser2.address, token18.target)).to.be.eq(ethers.parseEther('25'));
    expect(await internalBribe['earned(address,address)'](signers.otherUser3.address, token18.target)).to.be.eq(ethers.parseEther('50'));

    expect(await internalBribe['earned(address,address)'](signers.otherUser1.address, token9.target)).to.be.eq(0.25e9);
    expect(await internalBribe['earned(address,address)'](signers.otherUser2.address, token9.target)).to.be.eq(0.25e9);
    expect(await internalBribe['earned(address,address)'](signers.otherUser3.address, token9.target)).to.be.eq(0.5e9);

    expect(await internalBribe2['earned(address,address)'](signers.otherUser1.address, token18.target)).to.be.eq(0);
    expect(await internalBribe2['earned(address,address)'](signers.otherUser2.address, token18.target)).to.be.eq(0);
    expect(await internalBribe2['earned(address,address)'](signers.otherUser3.address, token18.target)).to.be.eq(0);

    await bribeFactory.setRewardClaimPause(true);
    await internalBribe.fixVotingPowerForPreviusEpoch(3, ethers.parseEther('98'));
    await internalBribe2.fixVotingPowerForPreviusEpoch(3, ethers.parseEther('2'));

    // fix users balance in previus epoch
    expect(await internalBribe.totalSupplyAt(prevEpoch)).to.be.eq(ethers.parseEther('100'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser1.address, prevEpoch)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser2.address, prevEpoch)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser3.address, prevEpoch)).to.be.eq(ethers.parseEther('98'));
    expect(await internalBribe2.totalSupplyAt(prevEpoch)).to.be.eq(ethers.parseEther('2'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser1.address, prevEpoch)).to.be.eq(ethers.parseEther('0'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser2.address, prevEpoch)).to.be.eq(ethers.parseEther('0'));
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser3.address, prevEpoch)).to.be.eq(ethers.parseEther('2'));

    expect(await internalBribe.totalSupply()).to.be.eq(0);
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser1.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser2.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe.balanceOfOwnerAt(signers.otherUser3.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe2.totalSupply()).to.be.eq(0);
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser1.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser2.address, currentEpoch)).to.be.eq(0);
    expect(await internalBribe2.balanceOfOwnerAt(signers.otherUser3.address, currentEpoch)).to.be.eq(0);

    expect(await internalBribe['earned(address,address)'](signers.otherUser1.address, token18.target)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe['earned(address,address)'](signers.otherUser2.address, token18.target)).to.be.eq(ethers.parseEther('1'));
    expect(await internalBribe['earned(address,address)'](signers.otherUser3.address, token18.target)).to.be.eq(ethers.parseEther('98'));

    expect(await internalBribe['earned(address,address)'](signers.otherUser1.address, token9.target)).to.be.eq(0.01e9);
    expect(await internalBribe['earned(address,address)'](signers.otherUser2.address, token9.target)).to.be.eq(0.01e9);
    expect(await internalBribe['earned(address,address)'](signers.otherUser3.address, token9.target)).to.be.eq(0.98e9);

    expect(await internalBribe2['earned(address,address)'](signers.otherUser1.address, token18.target)).to.be.eq(0);
    expect(await internalBribe2['earned(address,address)'](signers.otherUser2.address, token18.target)).to.be.eq(0);
    expect(await internalBribe2['earned(address,address)'](signers.otherUser3.address, token18.target)).to.be.eq(0);

    await bribeFactory.setRewardClaimPause(false);
    await internalBribe.connect(signers.otherUser3)['getReward(address[])']([token18.target, token9.target]);
    await internalBribe.connect(signers.otherUser2)['getReward(address[])']([token18.target, token9.target]);
    await internalBribe.connect(signers.otherUser1)['getReward(address[])']([token18.target, token9.target]);

    expect(await token18.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('98'));
    expect(await token18.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
    expect(await token18.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('1'));
    expect(await token9.balanceOf(signers.otherUser3.address)).to.be.eq(0.98e9);
    expect(await token9.balanceOf(signers.otherUser1.address)).to.be.eq(0.01e9);
    expect(await token9.balanceOf(signers.otherUser2.address)).to.be.eq(0.01e9);
  });

  it('fail if try call fix second time', async () => {
    await bribeFactory.setRewardClaimPause(true);
    await expect(internalBribe.fixVotingPowerForPreviusEpoch(3, 1)).to.be.revertedWith(ERRORS.Initializable.Initialized);
    await expect(internalBribe2.fixVotingPowerForPreviusEpoch(3, 1)).to.be.revertedWith(ERRORS.Initializable.Initialized);
  });
});

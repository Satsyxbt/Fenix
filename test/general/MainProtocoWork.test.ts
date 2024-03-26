import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { AlgebraPool } from '@cryptoalgebra/integral-core/typechain';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, Fenix, GaugeFactoryUpgradeable, GaugeUpgradeable, ICHIMock, Pair } from '../../typechain-types';
import { ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  FactoryFixture,
  deployAlgebraCore,
  deployERC20MockToken,
  deployGaugeFactory,
} from '../utils/coreFixture';

describe('Main', function () {
  let deployed: CoreFixtureDeployed;
  let signers: {
    deployer: HardhatEthersSigner;
    blastGovernor: HardhatEthersSigner;
    fenixTeam: HardhatEthersSigner;
    proxyAdmin: HardhatEthersSigner;
    otherUser1: HardhatEthersSigner;
    otherUser2: HardhatEthersSigner;
    otherUser3: HardhatEthersSigner;
    otherUser4: HardhatEthersSigner;
    otherUser5: HardhatEthersSigner;
  };
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let fenix: Fenix;
  let algebraCore: FactoryFixture;
  let poolV2FenixTk18: Pair;
  let poolV3FenixTk18: AlgebraPool;
  let poolV3Tk18Tk6: AlgebraPool;

  let v3IchiGaugeFactory: GaugeFactoryUpgradeable;
  let v3CommonGaugeFactory: GaugeFactoryUpgradeable;
  let v3Gauge: GaugeUpgradeable;
  let v2Gauge: GaugeUpgradeable;
  let user1TokenId: bigint;
  let user2TokenId: bigint;
  let user3TokenId: bigint;
  let ICHIVault: ICHIMock;
  let v3GaugeICHI: GaugeUpgradeable;

  before('deployed', async () => {
    deployed = await loadFixture(completeFixture);
    fenix = deployed.fenix;

    algebraCore = await deployAlgebraCore(await deployed.blastPoints.getAddress());
    signers = deployed.signers;

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

    await deployed.feesVaultFactory.grantRole(await deployed.feesVaultFactory.WHITELISTED_CREATOR_ROLE(), algebraCore.factory.target);

    await algebraCore.factory.setVaultFactory(deployed.feesVaultFactory.target);

    await algebraCore.factory.grantRole(await algebraCore.factory.POOLS_CREATOR_ROLE(), signers.deployer.address);
  });
  it('Check state after deployed', async () => {
    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7500000'));
    expect(await deployed.v2PairFactory.communityVaultFactory()).to.be.eq(await deployed.feesVaultFactory.target);
    expect(await algebraCore.factory.vaultFactory()).to.be.eq(await deployed.feesVaultFactory.target);
  });
  it('Correct create new pairs in v2 factory before first epoch', async () => {
    await deployed.v2PairFactory.createPair(deployed.fenix.target, tokenTK18.target, true);
    await deployed.v2PairFactory.createPair(deployed.fenix.target, tokenTK6.target, false);

    poolV2FenixTk18 = await ethers.getContractAt(
      'Pair',
      await deployed.v2PairFactory.getPair(deployed.fenix.target, tokenTK18.target, true),
    );
  });
  it('Correct create new pairs in v3 factory before first epoch', async () => {
    await algebraCore.factory.createPool(deployed.fenix.target, tokenTK18.target);

    poolV3FenixTk18 = (await ethers.getContractAt(
      POOL_ABI,
      await algebraCore.factory.poolByPair(deployed.fenix.target, tokenTK18.target),
    )) as any as AlgebraPool;

    await poolV3FenixTk18.initialize(encodePriceSqrt(1, 1));
  });

  it('Success create gauge for v2 pair', async () => {
    await deployed.voter.connect(signers.deployer).createGauge(poolV2FenixTk18.target, 0);
  });

  it('Fail if try create gauge for from common user', async () => {
    await expect(deployed.voter.connect(signers.otherUser1).createGauge(poolV2FenixTk18.target, 0)).to.be.revertedWith('GOVERNANCE');
  });

  it('Fail if try create gauges for from common user', async () => {
    await expect(deployed.voter.connect(signers.otherUser1).createGauges([], [])).to.be.revertedWith('GOVERNANCE');
  });

  it('Fail create gauge for common v3 pair because not added factory and gauge factory for this type', async () => {
    await expect(deployed.voter.connect(signers.deployer).createGauge(poolV3FenixTk18.target, 1)).to.be.revertedWith('gaugetype');
  });

  it('Success add factory and create gaugeType for just pool v3', async () => {
    v3CommonGaugeFactory = await deployGaugeFactory(
      signers.deployer,
      signers.proxyAdmin.address,
      signers.blastGovernor.address,
      await deployed.voter.getAddress(),
      await deployed.gaugeImplementation.getAddress(),
      await deployed.merklGaugeMiddleman.getAddress(),
    );
    await deployed.voter.addFactory(algebraCore.factory.target, v3CommonGaugeFactory.target);

    expect(await deployed.voter.gaugeFactories()).to.be.deep.eq([deployed.gaugeFactory.target, v3CommonGaugeFactory.target]);
    expect(await deployed.voter.factories()).to.be.deep.eq([deployed.v2PairFactory.target, algebraCore.factory.target]);

    await deployed.voter.connect(signers.deployer).createGauge(poolV3FenixTk18.target, 1);
  });

  it('Should fail if try create gauge for the same pool', async () => {
    await expect(deployed.voter.connect(signers.deployer).createGauge(poolV3FenixTk18.target, 1)).to.be.revertedWith('!exists');
  });

  it('correct initialzie and create gauge for v2', async () => {
    let gauge = await deployed.voter.gauges(poolV2FenixTk18.target);
    expect(gauge).to.be.not.eq(ZERO_ADDRESS);
    v2Gauge = (await ethers.getContractAt('GaugeUpgradeable', gauge)) as any as GaugeUpgradeable;

    expect(await v2Gauge.internal_bribe()).to.be.not.eq(ZERO_ADDRESS);
    expect(await v2Gauge.external_bribe()).to.be.not.eq(ZERO_ADDRESS);
    expect(await v2Gauge.internal_bribe()).to.be.eq(await deployed.voter.internal_bribes(v2Gauge.target));
    expect(await v2Gauge.external_bribe()).to.be.eq(await deployed.voter.external_bribes(v2Gauge.target));
    expect(await v2Gauge.DISTRIBUTION()).to.be.eq(deployed.voter.target);
    expect(await v2Gauge.TOKEN()).to.be.eq(poolV2FenixTk18.target);
    expect(await v2Gauge.VE()).to.be.eq(deployed.votingEscrow.target);
    expect(await v2Gauge.emergency()).to.be.false;
    expect(await v2Gauge.DURATION()).to.be.eq(86400 * 7);
    expect(await v2Gauge.feeVault()).to.be.eq(await poolV2FenixTk18.communityVault());
    expect(await v2Gauge.feeVault()).to.be.not.eq(ZERO_ADDRESS);
    expect(await v2Gauge.isDistributeEmissionToMerkle()).to.be.false;
    expect(await v2Gauge.merklGaugeMiddleman()).to.be.eq(deployed.merklGaugeMiddleman.target);
  });

  it('correct initialzie and create gauge for v3', async () => {
    let gauge = await deployed.voter.gauges(poolV3FenixTk18.target);
    expect(gauge).to.be.not.eq(ZERO_ADDRESS);
    v3Gauge = (await ethers.getContractAt('GaugeUpgradeable', gauge)) as any as GaugeUpgradeable;

    expect(await v3Gauge.internal_bribe()).to.be.not.eq(ZERO_ADDRESS);
    expect(await v3Gauge.external_bribe()).to.be.not.eq(ZERO_ADDRESS);
    expect(await v3Gauge.internal_bribe()).to.be.eq(await deployed.voter.internal_bribes(v3Gauge.target));
    expect(await v3Gauge.external_bribe()).to.be.eq(await deployed.voter.external_bribes(v3Gauge.target));
    expect(await v3Gauge.DISTRIBUTION()).to.be.eq(deployed.voter.target);
    expect(await v3Gauge.TOKEN()).to.be.eq(poolV3FenixTk18.target);
    expect(await v3Gauge.VE()).to.be.eq(deployed.votingEscrow.target);

    expect(await v3Gauge.emergency()).to.be.false;
    expect(await v3Gauge.isDistributeEmissionToMerkle()).to.be.true;
    expect(await v3Gauge.merklGaugeMiddleman()).to.be.eq(deployed.merklGaugeMiddleman.target);

    expect(await v3Gauge.DURATION()).to.be.eq(86400 * 7);
    expect(await v3Gauge.feeVault()).to.be.eq(await poolV3FenixTk18.communityVault());
    expect(await v3Gauge.feeVault()).to.be.not.eq(ZERO_ADDRESS);
  });

  it(`voter parameters after create gagues should be corect`, async () => {
    expect(await deployed.voter.gauges(poolV2FenixTk18.target)).to.be.eq(v2Gauge.target);
    expect(await deployed.voter.gauges(poolV3FenixTk18.target)).to.be.eq(v3Gauge.target);
    expect(await deployed.voter.poolForGauge(v2Gauge.target)).to.be.eq(poolV2FenixTk18.target);
    expect(await deployed.voter.poolForGauge(v3Gauge.target)).to.be.eq(poolV3FenixTk18.target);

    expect(await deployed.voter.isGauge(v3Gauge.target)).to.be.true;
    expect(await deployed.voter.isGauge(v2Gauge.target)).to.be.true;
  });

  it(`users success lock they veFNX tokens`, async () => {
    await fenix.approve(await deployed.votingEscrow.target, ethers.parseEther('200'));
    await deployed.votingEscrow.create_lock(ethers.parseEther('100'), 170 * 86400);
    user1TokenId = await deployed.votingEscrow.totalTokens();

    await deployed.votingEscrow.create_lock_for(ethers.parseEther('50'), 170 * 86400, signers.otherUser1.address);
    user2TokenId = await deployed.votingEscrow.totalTokens();
  });

  it(`user success voters for diff pairs`, async () => {
    await deployed.voter.vote(user1TokenId, [poolV2FenixTk18.target], [1000]);
    await deployed.voter.connect(signers.otherUser1).vote(user2TokenId, [poolV3FenixTk18.target], [1000]);
  });
  it(`not distributi any tokens if first epoch not started`, async () => {
    expect(await fenix.balanceOf(v2Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(deployed.merklDistributionCreator.target)).to.be.eq(ZERO);

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7500000'));

    await deployed.voter.distributeAll();

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7500000'));
    expect(await fenix.balanceOf(v2Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(deployed.merklDistributionCreator.target)).to.be.eq(ZERO);
  });

  it(`should fail during distribution if gauge params invalid for distribute to merkl`, async () => {
    await time.increase(86400 * 7);

    expect(await fenix.balanceOf(v2Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(deployed.merklDistributionCreator.target)).to.be.eq(ZERO);

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7500000'));

    await expect(deployed.voter.distributeAll()).to.be.revertedWithCustomError(deployed.merklGaugeMiddleman, 'InvalidParams');
  });
  it(`should success set gauge params and whitelist for distribution to mekrl`, async () => {
    await deployed.merklDistributionCreator.setRewardTokenMinAmounts([fenix.target], [1]);

    await deployed.merklGaugeMiddleman.setGauge(v3Gauge.target, {
      uniV3Pool: poolV3FenixTk18.target,
      rewardToken: fenix.target,
      positionWrappers: [signers.otherUser1.address, signers.otherUser2.address, signers.deployer.address],
      wrapperTypes: [0, 1, 2],
      amount: ethers.parseEther('1'),
      propToken0: 4000,
      propToken1: 2000,
      propFees: 4000,
      isOutOfRangeIncentivized: 0,
      epochStart: 1,
      numEpoch: 1,
      boostedReward: 0,
      boostingAddress: ZERO_ADDRESS,
      rewardId: ethers.id('TEST') as string,
      additionalData: ethers.id('test2ng') as string,
    });
  });

  it(`should success claimFees from vaults adn send to internal_bribes`, async () => {
    expect(await fenix.balanceOf(await v2Gauge.feeVault())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v2Gauge.feeVault())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(await v3Gauge.feeVault())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v3Gauge.feeVault())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(await v2Gauge.internal_bribe())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v2Gauge.internal_bribe())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(await v3Gauge.internal_bribe())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v3Gauge.internal_bribe())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(await v2Gauge.external_bribe())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v2Gauge.external_bribe())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(v3Gauge.external_bribe())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(v3Gauge.external_bribe())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(v3Gauge.target)).to.be.eq(ZERO);

    expect(await fenix.balanceOf(v2Gauge.target)).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(v2Gauge.target)).to.be.eq(ZERO);

    await fenix.transfer(await v2Gauge.feeVault(), ONE_ETHER);
    await tokenTK18.mint(await v2Gauge.feeVault(), ONE_ETHER + ONE_ETHER);

    await fenix.transfer(await v3Gauge.feeVault(), ONE_ETHER + ONE_ETHER + ONE_ETHER);

    await v3Gauge.claimFees();
    await v2Gauge.claimFees();

    expect(await fenix.balanceOf(await v2Gauge.feeVault())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v2Gauge.feeVault())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(await v3Gauge.feeVault())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v3Gauge.feeVault())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(await v2Gauge.internal_bribe())).to.be.eq(ONE_ETHER);
    expect(await tokenTK18.balanceOf(await v2Gauge.internal_bribe())).to.be.eq(ONE_ETHER + ONE_ETHER);

    expect(await fenix.balanceOf(await v3Gauge.internal_bribe())).to.be.eq(ONE_ETHER + ONE_ETHER + ONE_ETHER);
    expect(await tokenTK18.balanceOf(await v3Gauge.internal_bribe())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(await v2Gauge.external_bribe())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(await v2Gauge.external_bribe())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(v3Gauge.external_bribe())).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(v3Gauge.external_bribe())).to.be.eq(ZERO);

    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(v3Gauge.target)).to.be.eq(ZERO);

    expect(await fenix.balanceOf(v2Gauge.target)).to.be.eq(ZERO);
    expect(await tokenTK18.balanceOf(v2Gauge.target)).to.be.eq(ZERO);
  });

  it(`emisison distributed on first epoch based on votes`, async () => {
    expect(await fenix.balanceOf(v2Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(ZERO);
    expect(await fenix.balanceOf(deployed.merklDistributionCreator.target)).to.be.eq(ZERO);

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7500000'));

    let emission = ethers.parseEther('225000') - (ethers.parseEther('225000') * BigInt(500)) / BigInt(10000); // emission without team amount

    await deployed.voter.distributeAll();

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7500000') + ethers.parseEther('225000'));

    expect(await fenix.balanceOf(v2Gauge.target)).to.be.closeTo((emission * BigInt(2)) / BigInt(3), ethers.parseEther('1')); // vote for this pool was 2/3
    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(ZERO); // nothing got to gauge, because distribution to merkle
    expect(await fenix.balanceOf(deployed.merklDistributionCreator.target)).to.be.closeTo(emission / BigInt(3), ethers.parseEther('1')); // voter for this pool was 1/3
  });

  it('Create new pool v3 for ICHI', async () => {
    await algebraCore.factory.createPool(tokenTK6.target, tokenTK18.target);

    poolV3Tk18Tk6 = (await ethers.getContractAt(
      POOL_ABI,
      await algebraCore.factory.poolByPair(tokenTK6.target, tokenTK18.target),
    )) as any as AlgebraPool;

    await poolV3Tk18Tk6.initialize(encodePriceSqrt(1, 1));

    ICHIVault = await ethers.deployContract('ICHIMock', ['ICHI LP', 'ICHI', 18]);
  });

  it('Fail create gauge for ICHI v3 pair because not added factory and gauge factory for this type', async () => {
    await expect(deployed.voter.connect(signers.deployer).createGauge(ICHIVault.target, 2)).to.be.revertedWith('gaugetype');
  });

  it('Success add factory and create gaugeType for ICHI pool v3', async () => {
    v3IchiGaugeFactory = await deployGaugeFactory(
      signers.deployer,
      signers.proxyAdmin.address,
      signers.blastGovernor.address,
      await deployed.voter.getAddress(),
      await deployed.gaugeImplementation.getAddress(),
      await deployed.merklGaugeMiddleman.getAddress(),
    );
    await deployed.voter.addFactory(algebraCore.factory.target, v3IchiGaugeFactory.target);

    expect(await deployed.voter.gaugeFactories()).to.be.deep.eq([
      deployed.gaugeFactory.target,
      v3CommonGaugeFactory.target,
      v3IchiGaugeFactory.target,
    ]);
    expect(await deployed.voter.factories()).to.be.deep.eq([
      deployed.v2PairFactory.target,
      algebraCore.factory.target,
      algebraCore.factory.target,
    ]);
  });

  it('Fail create gauge because ichi vault not containse right pool address', async () => {
    await ICHIVault.setPool(poolV2FenixTk18.target);
    await expect(deployed.voter.createGauge(ICHIVault.target, 2)).to.be.revertedWith('wrong tokens');
  });

  it('correct initialzie and create gauge for ICHI Vault', async () => {
    await ICHIVault.setPool(poolV3Tk18Tk6.target);

    await deployed.voter.createGauge(ICHIVault.target, 2);

    let gauge = await deployed.voter.gauges(ICHIVault.target);
    expect(gauge).to.be.not.eq(ZERO_ADDRESS);
    v3GaugeICHI = (await ethers.getContractAt('GaugeUpgradeable', gauge)) as any as GaugeUpgradeable;

    expect(await v3GaugeICHI.internal_bribe()).to.be.not.eq(ZERO_ADDRESS);
    expect(await v3GaugeICHI.external_bribe()).to.be.not.eq(ZERO_ADDRESS);
    expect(await v3GaugeICHI.internal_bribe()).to.be.eq(await deployed.voter.internal_bribes(v3GaugeICHI.target));
    expect(await v3GaugeICHI.external_bribe()).to.be.eq(await deployed.voter.external_bribes(v3GaugeICHI.target));
    expect(await v3GaugeICHI.DISTRIBUTION()).to.be.eq(deployed.voter.target);
    expect(await v3GaugeICHI.TOKEN()).to.be.eq(ICHIVault.target);
    expect(await v3GaugeICHI.VE()).to.be.eq(deployed.votingEscrow.target);

    expect(await v3GaugeICHI.emergency()).to.be.false;
    expect(await v3GaugeICHI.isDistributeEmissionToMerkle()).to.be.true;
    expect(await v3GaugeICHI.merklGaugeMiddleman()).to.be.eq(deployed.merklGaugeMiddleman.target);

    expect(await v3GaugeICHI.DURATION()).to.be.eq(86400 * 7);
    expect(await v3GaugeICHI.feeVault()).to.be.eq(await poolV3Tk18Tk6.communityVault());
    expect(await v3GaugeICHI.feeVault()).to.be.not.eq(ZERO_ADDRESS);
  });

  it(`voter parameters after create gagues should be corect`, async () => {
    expect(await deployed.voter.gauges(poolV2FenixTk18.target)).to.be.eq(v2Gauge.target);
    expect(await deployed.voter.gauges(poolV3FenixTk18.target)).to.be.eq(v3Gauge.target);
    expect(await deployed.voter.gauges(ICHIVault.target)).to.be.eq(v3GaugeICHI.target);

    expect(await deployed.voter.poolForGauge(v2Gauge.target)).to.be.eq(poolV2FenixTk18.target);
    expect(await deployed.voter.poolForGauge(v3Gauge.target)).to.be.eq(poolV3FenixTk18.target);

    expect(await deployed.voter.poolForGauge(v3GaugeICHI.target)).to.be.eq(ICHIVault.target);

    expect(await deployed.voter.isGauge(v3Gauge.target)).to.be.true;
    expect(await deployed.voter.isGauge(v2Gauge.target)).to.be.true;
    expect(await deployed.voter.isGauge(v3GaugeICHI.target)).to.be.true;
  });

  it(`configure merkl distribution for ICHI vault`, async () => {
    await deployed.merklGaugeMiddleman.setGauge(v3GaugeICHI.target, {
      uniV3Pool: poolV3Tk18Tk6.target,
      rewardToken: fenix.target,
      positionWrappers: [signers.otherUser1.address, signers.otherUser2.address, signers.deployer.address],
      wrapperTypes: [0, 1, 2],
      amount: ethers.parseEther('1'),
      propToken0: 4000,
      propToken1: 2000,
      propFees: 4000,
      isOutOfRangeIncentivized: 0,
      epochStart: 1,
      numEpoch: 1,
      boostedReward: 0,
      boostingAddress: ZERO_ADDRESS,
      rewardId: ethers.id('TEST') as string,
      additionalData: ethers.id('test2ng') as string,
    });
  });

  it(`new user voter for new gauge and old user vot for previus gauges`, async () => {
    await fenix.transfer(signers.otherUser2.address, ethers.parseEther('100'));

    await fenix.connect(signers.otherUser2).approve(deployed.votingEscrow.target, ethers.parseEther('100'));

    await deployed.votingEscrow.connect(signers.otherUser2).create_lock(ethers.parseEther('100'), 163 * 86400);

    user3TokenId = await deployed.votingEscrow.totalTokens();

    await deployed.voter.vote(user1TokenId, [poolV2FenixTk18.target], [1000]); // 100 fnx
    await deployed.voter.connect(signers.otherUser1).vote(user2TokenId, [poolV3FenixTk18.target], [1000]); // 50 fnx
    await deployed.voter.connect(signers.otherUser2).vote(user3TokenId, [ICHIVault.target], [1000]); // 100 fnx
  });

  it(`emisison distributed on second epoch based on votes`, async () => {
    let previesBalanceV2Gauge = await fenix.balanceOf(v2Gauge.target);
    let previesBalanceV3Gauge = await fenix.balanceOf(v3Gauge.target);
    let previesBalanceIchiGauge = await fenix.balanceOf(ICHIVault.target);
    let previeusBalanceMerkleDistributor = await fenix.balanceOf(deployed.merklDistributionCreator.target);

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7725000'));
    await time.increase(7 * 86400);

    await deployed.voter.distributeAll();

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7725000') + ethers.parseEther('228375'));

    let emission = ethers.parseEther('228375') - (ethers.parseEther('228375') * BigInt(500)) / BigInt(10000); // emission without team amount

    expect(await fenix.balanceOf(v2Gauge.target)).to.be.closeTo(
      previesBalanceV2Gauge + (emission * BigInt(2)) / BigInt(5),
      ethers.parseEther('1'),
    ); // vote for this pool was 2/5

    expect(await fenix.balanceOf(v3Gauge.target)).to.be.eq(previesBalanceV3Gauge); // nothing got to gauge, because distribution to merkle

    expect(await fenix.balanceOf(v3GaugeICHI.target)).to.be.eq(previesBalanceIchiGauge); // nothing got to gauge, because distribution to merkle

    expect(await fenix.balanceOf(deployed.merklDistributionCreator.target)).to.be.closeTo(
      previeusBalanceMerkleDistributor + (emission * BigInt(3)) / BigInt(5),
      ethers.parseEther('1'),
    );
  });
});

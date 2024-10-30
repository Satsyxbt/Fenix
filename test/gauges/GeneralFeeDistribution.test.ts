import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect, use } from 'chai';
import { ethers } from 'hardhat';
import {
  BribeUpgradeable,
  ERC20Mock,
  FeesVaultFactoryUpgradeable,
  FeesVaultUpgradeable,
  Fenix,
  GaugeFactoryUpgradeable,
  GaugeFactoryUpgradeable__factory,
  GaugeUpgradeable,
  Pair,
  PairFactoryUpgradeable,
  VoterUpgradeableV2,
} from '../../typechain-types';
import { ERRORS, GaugeType, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployAlgebraCore,
  deployERC20MockToken,
  deployGaugeFactory,
  deployGaugeImplementation,
} from '../utils/coreFixture';
import { erc20Wrap } from '../../lib/fenix-dex-v3/src/farming/test/shared';
import { AlgebraFactoryUpgradeable, AlgebraPool, IAlgebraPool } from '@cryptoalgebra/integral-core/typechain';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { pool } from '@cryptoalgebra/integral-core/typechain/contracts/interfaces';

describe('GaugeFactoryUpgradeable', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;

  let v2PairsGaugeImplementation: GaugeUpgradeable;
  let v3PairsGuageImplementation: GaugeUpgradeable;
  let v2GaugeFactory: GaugeFactoryUpgradeable;
  let v3GaugeFactory: GaugeFactoryUpgradeable;
  let FeesVaultFactoryUpgradeable: FeesVaultFactoryUpgradeable;
  let Voter: VoterUpgradeableV2;
  let AlgebraFactory: AlgebraFactoryUpgradeable;
  let PairFactory: PairFactoryUpgradeable;

  let Fenix: Fenix;
  let tokenTR6: ERC20Mock;
  let tokenTR18: ERC20Mock;

  let currentEpoch: bigint;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    Fenix = deployed.fenix;
    FeesVaultFactoryUpgradeable = deployed.feesVaultFactory;
    PairFactory = deployed.v2PairFactory;
    Voter = deployed.voter;

    v2PairsGaugeImplementation = await deployGaugeImplementation(signers.deployer, GaugeType.V2PairsGauge);
    v3PairsGuageImplementation = await deployGaugeImplementation(signers.deployer, GaugeType.V3PairsGauge);

    v2GaugeFactory = await deployGaugeFactory(
      signers.deployer,
      signers.proxyAdmin.address,
      signers.blastGovernor.address,
      deployed.voter.target.toString(),
      v2PairsGaugeImplementation.target.toString(),
      ethers.ZeroAddress,
    );

    v3GaugeFactory = await deployGaugeFactory(
      signers.deployer,
      signers.proxyAdmin.address,
      signers.blastGovernor.address,
      deployed.voter.target.toString(),
      v3PairsGuageImplementation.target.toString(),
      ethers.ZeroAddress,
    );

    let algebraCore = await deployAlgebraCore(await deployed.blastPoints.getAddress());

    AlgebraFactory = algebraCore.factory;
    await AlgebraFactory.grantRole(await AlgebraFactory.POOLS_CREATOR_ROLE(), signers.deployer.address);
    await AlgebraFactory.setVaultFactory(FeesVaultFactoryUpgradeable.target);
    await FeesVaultFactoryUpgradeable.grantRole(await FeesVaultFactoryUpgradeable.WHITELISTED_CREATOR_ROLE(), AlgebraFactory.target);
    await Voter.updateAddress('v2GaugeFactory', v2GaugeFactory.target);
    await Voter.updateAddress('v3GaugeFactory', v3GaugeFactory.target);
    await Voter.updateAddress('v3PoolFactory', AlgebraFactory.target);
    await v3GaugeFactory.setMerklGaugeMiddleman(deployed.merklGaugeMiddleman.target);

    tokenTR6 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);
    tokenTR18 = await deployERC20MockToken(signers.deployer, 'TR18', 'TR18', 18);

    await Voter.distributeAll();

    currentEpoch = await deployed.minter.active_period();
  });

  it('Gauge implementation correct typed', async () => {
    expect(await v2PairsGaugeImplementation.gaugeType()).to.be.not.eq(await v3PairsGuageImplementation.gaugeType());
    expect(await v2PairsGaugeImplementation.gaugeType()).to.be.eq(GaugeType.V2PairsGauge);
    expect(await v3PairsGuageImplementation.gaugeType()).to.be.eq(GaugeType.V3PairsGauge);
  });

  describe('Gauge deployment flow', async () => {
    it('success deployed gauge, return correct gaute type base on impl for v2', async () => {
      await PairFactory.createPair(Fenix.target, tokenTR18.target, false);
      let pair = await PairFactory.getPair(Fenix.target, tokenTR18.target, false);
      await Voter.createV2Gauge(pair);
      let gauge = await Voter.poolToGauge(pair);
      let gaugeInstance = await ethers.getContractAt('GaugeUpgradeable', gauge);
      expect(await gaugeInstance.gaugeType()).to.be.eq(GaugeType.V2PairsGauge);
    });

    it('success deployed gauge, return correct gaute type base on impl for v3', async () => {
      await AlgebraFactory.createPool(Fenix.target, tokenTR18.target);
      let pool = await AlgebraFactory.poolByPair(Fenix.target, tokenTR18.target);
      let poolInstance = await ethers.getContractAt('IAlgebraPool', pool);
      await poolInstance.initialize(encodePriceSqrt(1, 1));
      await Voter.createV3Gauge(pool);
      let gauge = await Voter.poolToGauge(pool);
      let gaugeInstance = await ethers.getContractAt('GaugeUpgradeable', gauge);
      expect(await gaugeInstance.gaugeType()).to.be.eq(GaugeType.V3PairsGauge);
    });
  });

  describe('Claim fees for v3', async () => {
    let pool1: IAlgebraPool;
    let pool2: IAlgebraPool;
    let feesVault1: FeesVaultUpgradeable;
    let feesVault2: FeesVaultUpgradeable;
    let externalBribePool1: BribeUpgradeable;
    let externalBribePool2: BribeUpgradeable;
    let internalBribePool1: BribeUpgradeable;
    let internalBribePool2: BribeUpgradeable;
    let gauge1: GaugeUpgradeable;
    let gauge2: GaugeUpgradeable;

    beforeEach(async () => {
      await AlgebraFactory.createPool(Fenix.target, tokenTR18.target);
      await AlgebraFactory.createPool(Fenix.target, tokenTR6.target);
      pool1 = (await ethers.getContractAt(
        'IAlgebraPool',
        await AlgebraFactory.poolByPair(Fenix.target, tokenTR18.target),
      )) as any as IAlgebraPool;
      pool2 = (await ethers.getContractAt(
        'IAlgebraPool',
        await AlgebraFactory.poolByPair(Fenix.target, tokenTR6.target),
      )) as any as IAlgebraPool;

      await pool1.initialize(encodePriceSqrt(1, 1));
      await pool2.initialize(encodePriceSqrt(1, 1));

      feesVault1 = await ethers.getContractAt('FeesVaultUpgradeable', await pool1.communityVault());
      feesVault2 = await ethers.getContractAt('FeesVaultUpgradeable', await pool2.communityVault());

      await Voter.createV3Gauge(pool1.target);
      await Voter.createV3Gauge(pool2.target);

      gauge1 = await ethers.getContractAt('GaugeUpgradeable', await Voter.poolToGauge(pool1.target));
      gauge2 = await ethers.getContractAt('GaugeUpgradeable', await Voter.poolToGauge(pool2.target));

      internalBribePool1 = await ethers.getContractAt('BribeUpgradeable', await gauge1.internal_bribe());
      externalBribePool1 = await ethers.getContractAt('BribeUpgradeable', await gauge1.external_bribe());

      internalBribePool2 = await ethers.getContractAt('BribeUpgradeable', await gauge2.internal_bribe());
      externalBribePool2 = await ethers.getContractAt('BribeUpgradeable', await gauge2.external_bribe());
    });

    it('state before', async () => {
      expect(await Fenix.balanceOf(gauge1.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(gauge2.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(internalBribePool1.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(internalBribePool2.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(externalBribePool1.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(externalBribePool2.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(feesVault2.target)).to.be.eq(0);

      expect(await tokenTR18.balanceOf(gauge1.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(gauge2.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(internalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(internalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(externalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(externalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(feesVault2.target)).to.be.eq(0);

      expect(await tokenTR6.balanceOf(gauge1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(gauge2.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(internalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(internalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(externalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(externalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault2.target)).to.be.eq(0);
    });

    it('gauge correct typed', async () => {
      expect(await gauge1.gaugeType()).to.be.eq(GaugeType.V3PairsGauge);
      expect(await gauge2.gaugeType()).to.be.eq(GaugeType.V3PairsGauge);
    });

    it('pool1, gauge correct claim fees from fees vault and distribute to internal bribe', async () => {
      await Fenix.transfer(feesVault1.target, ethers.parseEther('100'));
      await tokenTR18.mint(feesVault1.target, ethers.parseEther('1'));

      let expectToken0Claimed = ethers.parseEther('100');
      let expectToken1Claimed = ethers.parseEther('1');
      if (Fenix.target.toString().toLocaleLowerCase() > tokenTR18.target.toString().toLocaleLowerCase()) {
        expectToken1Claimed = ethers.parseEther('100');
        expectToken0Claimed = ethers.parseEther('1');
      }
      let tx = await gauge1.claimFees();
      await expect(tx).to.be.emit(gauge1, 'ClaimFees').withArgs(signers.deployer.address, expectToken0Claimed, expectToken1Claimed);
      await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(feesVault1.target, gauge1.target, ethers.parseEther('100'));
      await expect(tx).to.be.emit(tokenTR18, 'Transfer').withArgs(feesVault1.target, gauge1.target, ethers.parseEther('1'));
      await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(gauge1.target, internalBribePool1.target, ethers.parseEther('100'));
      await expect(tx).to.be.emit(tokenTR18, 'Transfer').withArgs(gauge1.target, internalBribePool1.target, ethers.parseEther('1'));
      await expect(tx).to.be.emit(internalBribePool1, 'RewardAdded').withArgs(Fenix.target, ethers.parseEther('100'), currentEpoch);
      await expect(tx).to.be.emit(internalBribePool1, 'RewardAdded').withArgs(tokenTR18.target, ethers.parseEther('1'), currentEpoch);

      expect((await internalBribePool1.rewardData(Fenix.target, currentEpoch)).rewardsPerEpoch).to.be.eq(ethers.parseEther('100'));
      expect((await internalBribePool1.rewardData(tokenTR18.target, currentEpoch)).rewardsPerEpoch).to.be.eq(ethers.parseEther('1'));
      expect((await internalBribePool1.rewardData(Fenix.target, currentEpoch - 86400n * 7n)).rewardsPerEpoch).to.be.eq(0);
      expect((await internalBribePool1.rewardData(tokenTR18.target, currentEpoch - 86400n * 7n)).rewardsPerEpoch).to.be.eq(0);

      await Fenix.transfer(feesVault1.target, ethers.parseEther('100'));
      await tokenTR18.mint(feesVault1.target, ethers.parseEther('1'));

      tx = await gauge1.claimFees();
      await expect(tx).to.be.emit(gauge1, 'ClaimFees').withArgs(signers.deployer.address, expectToken0Claimed, expectToken1Claimed);
      await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(feesVault1.target, gauge1.target, ethers.parseEther('100'));
      await expect(tx).to.be.emit(tokenTR18, 'Transfer').withArgs(feesVault1.target, gauge1.target, ethers.parseEther('1'));
      await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(gauge1.target, internalBribePool1.target, ethers.parseEther('100'));
      await expect(tx).to.be.emit(tokenTR18, 'Transfer').withArgs(gauge1.target, internalBribePool1.target, ethers.parseEther('1'));
      await expect(tx).to.be.emit(internalBribePool1, 'RewardAdded').withArgs(Fenix.target, ethers.parseEther('100'), currentEpoch);
      await expect(tx).to.be.emit(internalBribePool1, 'RewardAdded').withArgs(tokenTR18.target, ethers.parseEther('1'), currentEpoch);

      expect((await internalBribePool1.rewardData(Fenix.target, currentEpoch)).rewardsPerEpoch).to.be.eq(ethers.parseEther('200'));
      expect((await internalBribePool1.rewardData(tokenTR18.target, currentEpoch)).rewardsPerEpoch).to.be.eq(ethers.parseEther('2'));
      expect((await internalBribePool1.rewardData(Fenix.target, currentEpoch - 86400n * 7n)).rewardsPerEpoch).to.be.eq(0);
      expect((await internalBribePool1.rewardData(tokenTR18.target, currentEpoch - 86400n * 7n)).rewardsPerEpoch).to.be.eq(0);

      expect(await Fenix.balanceOf(gauge2.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(internalBribePool2.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(externalBribePool2.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(feesVault2.target)).to.be.eq(0);

      expect(await tokenTR18.balanceOf(gauge2.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(internalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(externalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(feesVault2.target)).to.be.eq(0);

      expect(await tokenTR6.balanceOf(gauge2.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(internalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(externalBribePool2.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault2.target)).to.be.eq(0);

      expect((await internalBribePool2.rewardData(Fenix.target, currentEpoch)).rewardsPerEpoch).to.be.eq(0);
      expect((await internalBribePool2.rewardData(tokenTR18.target, currentEpoch)).rewardsPerEpoch).to.be.eq(0);
      expect((await internalBribePool2.rewardData(Fenix.target, currentEpoch - 86400n * 7n)).rewardsPerEpoch).to.be.eq(0);
      expect((await internalBribePool2.rewardData(tokenTR18.target, currentEpoch - 86400n * 7n)).rewardsPerEpoch).to.be.eq(0);
    });
  });

  describe('Claim fees for v2', async () => {
    let pool1: Pair;
    let feesVault1: FeesVaultUpgradeable;
    let externalBribePool1: BribeUpgradeable;
    let internalBribePool1: BribeUpgradeable;
    let gauge1: GaugeUpgradeable;
    let lpBalanceUser1: bigint;
    let lpBalanceUser2: bigint;

    beforeEach(async () => {
      await PairFactory.createPair(Fenix.target, tokenTR6.target, false);
      pool1 = await ethers.getContractAt('Pair', await PairFactory.getPair(Fenix.target, tokenTR6.target, false));

      await Fenix.transfer(pool1.target, ethers.parseEther('1000'));
      await tokenTR6.mint(pool1.target, 1000e6);
      await pool1.connect(signers.otherUser1).mint(signers.otherUser1.address);

      await Fenix.transfer(pool1.target, ethers.parseEther('1000'));
      await tokenTR6.mint(pool1.target, 1000e6);
      await pool1.connect(signers.otherUser2).mint(signers.otherUser2.address);

      feesVault1 = await ethers.getContractAt('FeesVaultUpgradeable', await pool1.communityVault());

      await Voter.createV2Gauge(pool1.target);

      gauge1 = await ethers.getContractAt('GaugeUpgradeable', await Voter.poolToGauge(pool1.target));

      internalBribePool1 = await ethers.getContractAt('BribeUpgradeable', await gauge1.internal_bribe());
      externalBribePool1 = await ethers.getContractAt('BribeUpgradeable', await gauge1.external_bribe());

      lpBalanceUser1 = await pool1.balanceOf(signers.otherUser1.address);
      lpBalanceUser2 = await pool1.balanceOf(signers.otherUser2.address);
    });

    it('state before', async () => {
      expect(await Fenix.balanceOf(gauge1.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(internalBribePool1.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(externalBribePool1.target)).to.be.eq(0);
      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);

      expect(await tokenTR18.balanceOf(gauge1.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(internalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(externalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR18.balanceOf(feesVault1.target)).to.be.eq(0);

      expect(await tokenTR6.balanceOf(gauge1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(internalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(externalBribePool1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);

      expect(await tokenTR6.balanceOf(signers.fenixTeam.address)).to.be.eq(0);
      expect(await Fenix.balanceOf(signers.fenixTeam.address)).to.be.eq(0);
    });

    it('gauge correct typed', async () => {
      expect(await gauge1.gaugeType()).to.be.eq(GaugeType.V2PairsGauge);
    });

    it('without stakes in gauge, v2 pool - 1% swap fees, 10% protocol fee - 90% to lp, 95% fees to gauge', async () => {
      await PairFactory.setProtocolFee(1000);
      await PairFactory.setFee(false, 100);

      await FeesVaultFactoryUpgradeable.grantRole(
        await FeesVaultFactoryUpgradeable.FEES_VAULT_ADMINISTRATOR_ROLE(),
        signers.deployer.address,
      );
      await FeesVaultFactoryUpgradeable.setCustomDistributionConfig(feesVault1.target, {
        toGaugeRate: 9500,
        recipients: [signers.fenixTeam.address],
        rates: [500],
      });

      await Fenix.transfer(signers.otherUser3.address, ethers.parseEther('2'));
      await tokenTR6.mint(signers.otherUser3.address, 2e6);

      let router = await ethers.deployContract('RouterV2', [signers.blastGovernor.address, PairFactory.target, ethers.ZeroAddress]);
      await Fenix.connect(signers.otherUser3).approve(router.target, ethers.parseEther('10000'));
      await tokenTR6.connect(signers.otherUser3).approve(router.target, 2e6);

      await router
        .connect(signers.otherUser3)
        .swapExactTokensForTokensSimple(
          ethers.parseEther('1'),
          1,
          Fenix.target,
          tokenTR6.target,
          false,
          signers.otherUser3.address,
          (await time.latest()) + 100,
        );

      await router
        .connect(signers.otherUser3)
        .swapExactTokensForTokensSimple(
          1e6,
          1,
          tokenTR6.target,
          Fenix.target,
          false,
          signers.otherUser3.address,
          (await time.latest()) + 100,
        );

      // after swap, fee should be 0.01e18 fnx, and 0.01e6 token6
      // 0.009e18, 0.009e6 go to lp providers
      // 0.001e18, 0.001e6 go to fees vaults

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.eq(ethers.parseEther('0.009'));
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.eq(0.009e6);
      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(ethers.parseEther('0.001'));
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0.001e6);

      await gauge1.claimFees();

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.eq(ethers.parseEther('0.009'));
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.eq(0.009e6);

      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);

      await pool1.connect(signers.otherUser1).claimFees();
      await pool1.connect(signers.otherUser2).claimFees();

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.closeTo(0, 1e6);
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.closeTo(0, 1e2);
      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);

      expect(await Fenix.balanceOf(internalBribePool1.target)).to.be.eq(ethers.parseEther('0.00095'));
      expect(await Fenix.balanceOf(signers.fenixTeam.address)).to.be.eq(ethers.parseEther('0.00005'));

      expect(await tokenTR6.balanceOf(internalBribePool1.target)).to.be.eq(0.00095e6);
      expect(await tokenTR6.balanceOf(signers.fenixTeam.address)).to.be.eq(0.00005e6);

      expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.closeTo(ethers.parseEther('0.0045'), 1e6);
      expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.closeTo(0.0045e6, 3);
      expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.closeTo(ethers.parseEther('0.0045'), 1e6);
      expect(await tokenTR6.balanceOf(signers.otherUser2.address)).to.be.closeTo(0.0045e6, 3);
    });

    it('50% lp stakes in gauge, v2 pool - 1% swap fees, 10% protocol fee - 90% to lp, 95% fees to gauge', async () => {
      await PairFactory.setProtocolFee(1000);
      await PairFactory.setFee(false, 100);

      await FeesVaultFactoryUpgradeable.grantRole(
        await FeesVaultFactoryUpgradeable.FEES_VAULT_ADMINISTRATOR_ROLE(),
        signers.deployer.address,
      );
      await FeesVaultFactoryUpgradeable.setCustomDistributionConfig(feesVault1.target, {
        toGaugeRate: 9500,
        recipients: [signers.fenixTeam.address],
        rates: [500],
      });

      await pool1.connect(signers.otherUser1).approve(gauge1.target, ethers.MaxUint256);
      await gauge1.connect(signers.otherUser1).depositAll();
      await Fenix.transfer(signers.otherUser3.address, ethers.parseEther('2'));
      await tokenTR6.mint(signers.otherUser3.address, 2e6);

      let router = await ethers.deployContract('RouterV2', [signers.blastGovernor.address, PairFactory.target, ethers.ZeroAddress]);
      await Fenix.connect(signers.otherUser3).approve(router.target, ethers.parseEther('10000'));
      await tokenTR6.connect(signers.otherUser3).approve(router.target, 2e6);

      await router
        .connect(signers.otherUser3)
        .swapExactTokensForTokensSimple(
          ethers.parseEther('1'),
          1,
          Fenix.target,
          tokenTR6.target,
          false,
          signers.otherUser3.address,
          (await time.latest()) + 100,
        );

      await router
        .connect(signers.otherUser3)
        .swapExactTokensForTokensSimple(
          1e6,
          1,
          tokenTR6.target,
          Fenix.target,
          false,
          signers.otherUser3.address,
          (await time.latest()) + 100,
        );

      // after swap, fee should be 0.01e18 fnx, and 0.01e6 token6
      // 0.009e18, 0.009e6 go to lp providers
      // 0.001e18, 0.001e6 go to fees vaults

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.eq(ethers.parseEther('0.009'));
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.eq(0.009e6);
      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(ethers.parseEther('0.001'));
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0.001e6);

      await gauge1.claimFees();

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.closeTo(ethers.parseEther('0.0045'), 1e6);
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.closeTo(0.0045e6, 3);

      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);

      await pool1.connect(signers.otherUser1).claimFees();
      await pool1.connect(signers.otherUser2).claimFees();

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.closeTo(0, 1e6);
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.closeTo(0, 1e2);
      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);

      expect(await Fenix.balanceOf(internalBribePool1.target)).to.be.closeTo(ethers.parseEther('0.00545'), 1e6);
      expect(await Fenix.balanceOf(signers.fenixTeam.address)).to.be.eq(ethers.parseEther('0.00005'));

      expect(await tokenTR6.balanceOf(internalBribePool1.target)).to.be.closeTo(0.00545e6, 3);
      expect(await tokenTR6.balanceOf(signers.fenixTeam.address)).to.be.eq(0.00005e6);

      expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.closeTo(ethers.parseEther('0.0045'), 1e6);
      expect(await tokenTR6.balanceOf(signers.otherUser2.address)).to.be.closeTo(0.0045e6, 3);
    });
    it('100% lp stakes in gauge, v2 pool - 1% swap fees, 10% protocol fee - 90% to lp, 95% fees to gauge', async () => {
      await PairFactory.setProtocolFee(1000);
      await PairFactory.setFee(false, 100);

      await FeesVaultFactoryUpgradeable.grantRole(
        await FeesVaultFactoryUpgradeable.FEES_VAULT_ADMINISTRATOR_ROLE(),
        signers.deployer.address,
      );
      await FeesVaultFactoryUpgradeable.setCustomDistributionConfig(feesVault1.target, {
        toGaugeRate: 9500,
        recipients: [signers.fenixTeam.address],
        rates: [500],
      });

      await pool1.connect(signers.otherUser1).approve(gauge1.target, ethers.MaxUint256);
      await gauge1.connect(signers.otherUser1).depositAll();
      await pool1.connect(signers.otherUser2).approve(gauge1.target, ethers.MaxUint256);
      await gauge1.connect(signers.otherUser2).depositAll();

      await Fenix.transfer(signers.otherUser3.address, ethers.parseEther('2'));
      await tokenTR6.mint(signers.otherUser3.address, 2e6);

      let router = await ethers.deployContract('RouterV2', [signers.blastGovernor.address, PairFactory.target, ethers.ZeroAddress]);
      await Fenix.connect(signers.otherUser3).approve(router.target, ethers.parseEther('10000'));
      await tokenTR6.connect(signers.otherUser3).approve(router.target, 2e6);

      await router
        .connect(signers.otherUser3)
        .swapExactTokensForTokensSimple(
          ethers.parseEther('1'),
          1,
          Fenix.target,
          tokenTR6.target,
          false,
          signers.otherUser3.address,
          (await time.latest()) + 100,
        );

      await router
        .connect(signers.otherUser3)
        .swapExactTokensForTokensSimple(
          1e6,
          1,
          tokenTR6.target,
          Fenix.target,
          false,
          signers.otherUser3.address,
          (await time.latest()) + 100,
        );

      // after swap, fee should be 0.01e18 fnx, and 0.01e6 token6
      // 0.009e18, 0.009e6 go to lp providers
      // 0.001e18, 0.001e6 go to fees vaults

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.eq(ethers.parseEther('0.009'));
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.eq(0.009e6);
      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(ethers.parseEther('0.001'));
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0.001e6);

      await gauge1.claimFees();

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.closeTo(0, 1e6);
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.closeTo(0, 3);

      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);

      await pool1.connect(signers.otherUser1).claimFees();
      await pool1.connect(signers.otherUser2).claimFees();

      expect(await Fenix.balanceOf(await pool1.fees())).to.be.closeTo(0, 1e6);
      expect(await tokenTR6.balanceOf(await pool1.fees())).to.be.closeTo(0, 3);

      expect(await Fenix.balanceOf(feesVault1.target)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(feesVault1.target)).to.be.eq(0);

      expect(await Fenix.balanceOf(internalBribePool1.target)).to.be.closeTo(ethers.parseEther('0.00995'), 1e6);
      expect(await Fenix.balanceOf(signers.fenixTeam.address)).to.be.eq(ethers.parseEther('0.00005'));

      expect(await tokenTR6.balanceOf(internalBribePool1.target)).to.be.closeTo(0.00995e6, 3);
      expect(await tokenTR6.balanceOf(signers.fenixTeam.address)).to.be.eq(0.00005e6);

      expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await tokenTR6.balanceOf(signers.otherUser2.address)).to.be.eq(0);
    });
  });
});

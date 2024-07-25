import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  AlgebraFNXPriceProviderUpgradeable,
  ERC20Mock,
  Fenix,
  VeBoostUpgradeable,
  VeBoostUpgradeable__factory,
} from '../../typechain-types';
import { ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployAlgebraCore,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../utils/coreFixture';
import { Cases, eToString } from './veBoostCases';

describe('VeBoostUpgradeable', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;

  let factory: VeBoostUpgradeable__factory;
  let veBoostImplementation: VeBoostUpgradeable;
  let veBoost: VeBoostUpgradeable;
  let priceProvider: AlgebraFNXPriceProviderUpgradeable;
  let fenix: Fenix;
  let tokenTR6: ERC20Mock;
  let tokenTR18: ERC20Mock;
  let mockVotingEscrow: HardhatEthersSigner;

  async function deployPriceProviderWith(
    usdToken: ERC20Mock,
    usdReserve: bigint,
    fnxReserve: bigint,
  ): Promise<AlgebraFNXPriceProviderUpgradeable> {
    let factoryPriceProvider = await ethers.getContractFactory('AlgebraFNXPriceProviderUpgradeable');
    let implementationPriceProvider = await factoryPriceProvider.deploy(signers.deployer.address);
    priceProvider = factoryPriceProvider.attach(
      await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementationPriceProvider.getAddress()),
    ) as AlgebraFNXPriceProviderUpgradeable;

    let algebraCore = await deployAlgebraCore(await deployed.blastPoints.getAddress());

    let algebraFactory = algebraCore.factory;
    await algebraFactory.grantRole(await algebraFactory.POOLS_CREATOR_ROLE(), signers.deployer.address);

    let deployedPoolAddr = await algebraCore.factory.createPool.staticCall(fenix.target, usdToken.target);

    await algebraCore.factory.createPool(fenix.target, usdToken.target);
    let pool = await ethers.getContractAt(POOL_ABI, deployedPoolAddr);

    let price = encodePriceSqrt(usdReserve, fnxReserve);
    if ((await pool.token0()) == usdToken.target) {
      price = encodePriceSqrt(fnxReserve, usdReserve);
    }
    await pool.initialize(price);

    await priceProvider.initialize(signers.blastGovernor.address, pool.target, fenix.target, usdToken.target);
    return priceProvider;
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = deployed.fenix;
    mockVotingEscrow = signers.otherUser5;

    tokenTR6 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);
    tokenTR18 = await deployERC20MockToken(signers.deployer, 'TR18', 'TR18', 18);

    let pp = await deployPriceProviderWith(tokenTR6, BigInt(1e6), ONE_ETHER);

    factory = await ethers.getContractFactory('VeBoostUpgradeable');
    veBoostImplementation = await factory.deploy(signers.deployer.address);
    veBoost = factory.attach(
      (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await veBoostImplementation.getAddress()))
        .target,
    ) as VeBoostUpgradeable;
    await veBoost.initialize(signers.blastGovernor.address, fenix.target, mockVotingEscrow.address, pp.target);
  });

  describe('Deployment', function () {
    it('Should fail if try initialize on implementation', async function () {
      await expect(
        veBoostImplementation.initialize(
          signers.blastGovernor.address,
          await fenix.getAddress(),
          mockVotingEscrow.address,
          priceProvider.target,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should fail if try second time to initialize', async function () {
      await expect(
        veBoost.initialize(signers.blastGovernor.address, await fenix.getAddress(), mockVotingEscrow.address, priceProvider.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should fail if try set zero address', async function () {
      const veB = factory.attach(
        await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await veBoostImplementation.getAddress()),
      ) as VeBoostUpgradeable;
      await expect(
        veB.initialize(ZERO_ADDRESS, await fenix.getAddress(), mockVotingEscrow.address, priceProvider.target),
      ).to.be.revertedWithCustomError(veB, 'AddressZero');
      await expect(
        veB.initialize(signers.blastGovernor.address, ZERO_ADDRESS, mockVotingEscrow.address, priceProvider.target),
      ).to.be.revertedWithCustomError(veB, 'AddressZero');
      await expect(
        veB.initialize(signers.blastGovernor.address, await fenix.getAddress(), ZERO_ADDRESS, priceProvider.target),
      ).to.be.revertedWithCustomError(veB, 'AddressZero');
      await expect(
        veB.initialize(signers.blastGovernor.address, await fenix.getAddress(), mockVotingEscrow.address, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(veB, 'AddressZero');
    });

    it('Should corect set initial parameters', async function () {
      expect(await veBoost.fenix()).to.be.equal(await fenix.getAddress());
      expect(await veBoost.votingEscrow()).to.be.equal(mockVotingEscrow.address);
    });

    it('Should correct initialzie initial parameters', async () => {
      expect(await veBoost.owner()).to.be.equal(signers.deployer.address);
      expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('10') / BigInt(10000));
      expect(await veBoost.getMinLockedTimeForBoost()).to.be.equal(182 * 86400);
      expect(await veBoost.getBoostFNXPercentage()).to.be.equal(1000);

      expect(await fenix.allowance(veBoost.target, mockVotingEscrow.address)).to.be.eq(ethers.MaxUint256);
    });
  });
  describe('Ownable functions', async () => {
    describe('#setPriceProvider', async () => {
      it('should fail if try call from not owner', async () => {
        await expect(veBoost.connect(signers.otherUser1).setPriceProvider(signers.otherUser1.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('should correct call and set parameters', async () => {
        let pp = await deployPriceProviderWith(tokenTR6, BigInt(1e6), ONE_ETHER);

        expect(await veBoost.priceProvider()).to.be.not.eq(pp);
        await expect(veBoost.setPriceProvider(pp.target)).to.be.emit(veBoost, 'PriceProvider').withArgs(pp.target);
        expect(await veBoost.priceProvider()).to.be.eq(pp);
      });
    });
    describe('#setFNXBoostPercentage', async () => {
      it('should fail if try call from not owner', async () => {
        await expect(veBoost.connect(signers.otherUser1).setFNXBoostPercentage(50)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should correct call and set parameters', async () => {
        expect(await veBoost.getBoostFNXPercentage()).to.be.eq(1_000);
        await expect(veBoost.setFNXBoostPercentage(5678)).to.be.emit(veBoost, 'FNXBoostPercentage').withArgs(5678);
        expect(await veBoost.getBoostFNXPercentage()).to.be.eq(5678);
      });
    });
    describe('#setMinUSDAmount', async () => {
      it('should fail if try call from not owner', async () => {
        await expect(veBoost.connect(signers.otherUser1).setMinUSDAmount(0)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should correct call and set parameters', async () => {
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('10') / BigInt(10000));
        await expect(veBoost.setMinUSDAmount(ethers.parseEther('123.1')))
          .to.be.emit(veBoost, 'MinUSDAmount')
          .withArgs(ethers.parseEther('123.1'));
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(
          ethers.parseEther('123.1'),
          ethers.parseEther('123.1') / BigInt(10000),
        );
      });
    });
    describe('#setMinLockedTime', async () => {
      it('should fail if try call from not owner', async () => {
        await expect(veBoost.connect(signers.otherUser1).setMinLockedTime(0)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should fail if try set more than VotingEscrow MAX lock time (6 month)', async () => {
        await expect(veBoost.setMinLockedTime(182 * 86400 + 2)).to.be.revertedWithCustomError(veBoost, 'InvalidMinLockedTime');
        await expect(veBoost.setMinLockedTime(182 * 86400 + 1)).to.be.revertedWithCustomError(veBoost, 'InvalidMinLockedTime');
        await expect(veBoost.setMinLockedTime(182 * 86400 - 1)).to.be.not.reverted;
        await expect(veBoost.setMinLockedTime(182 * 86400)).to.be.not.reverted;
      });
      it('should correct call and set parameters', async () => {
        expect(await veBoost.getMinLockedTimeForBoost()).to.be.eq(182 * 86400);
        await expect(veBoost.setMinLockedTime(91 * 86400))
          .to.be.emit(veBoost, 'MinLockedTime')
          .withArgs(91 * 86400);
        expect(await veBoost.getMinLockedTimeForBoost()).to.be.eq(91 * 86400);
      });
    });
    describe('#addRewardToken', async () => {
      it('should fail if try call from not owner', async () => {
        await expect(veBoost.connect(signers.otherUser1).addRewardToken(tokenTR18.target)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should fail if try add fenix like reward token', async () => {
        await expect(veBoost.addRewardToken(await veBoost.fenix())).to.be.revertedWithCustomError(veBoost, 'RewardTokenExist');
      });
      it('should fail if try add zero address', async () => {
        await expect(veBoost.addRewardToken(ZERO_ADDRESS)).to.be.revertedWithCustomError(veBoost, 'AddressZero');
      });
      it('should fail if try add already added token', async () => {
        await veBoost.addRewardToken(tokenTR18.target);
        expect(await veBoost.rewardTokens()).to.deep.eq([tokenTR18.target]);
        await expect(veBoost.addRewardToken(tokenTR18.target)).to.be.revertedWithCustomError(veBoost, 'RewardTokenExist');
      });
      it('should fail if try add fenix like reward token', async () => {
        expect(await veBoost.rewardTokens()).to.deep.eq([]);
        await expect(veBoost.addRewardToken(fenix.target)).to.be.revertedWithCustomError(veBoost, 'RewardTokenExist');
      });
      it('should correct call and add new reward token', async () => {
        expect(await veBoost.rewardTokens()).to.deep.eq([]);
        await expect(veBoost.addRewardToken(tokenTR18.target)).to.be.emit(veBoost, 'AddRewardToken').withArgs(tokenTR18.target);
        expect(await veBoost.rewardTokens()).to.deep.eq([tokenTR18.target]);
        await expect(veBoost.addRewardToken(tokenTR6.target)).to.be.emit(veBoost, 'AddRewardToken').withArgs(tokenTR6.target);
        expect(await veBoost.rewardTokens()).to.deep.eq([tokenTR18.target, tokenTR6.target]);
      });
    });
    describe('#removeRewardToken', async () => {
      it('should fail if try call from not owner', async () => {
        await expect(veBoost.connect(signers.otherUser1).removeRewardToken(tokenTR18.target)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });

      it('should fail if try remove not exists reward token', async () => {
        expect(await veBoost.rewardTokens()).to.deep.eq([]);
        await expect(veBoost.removeRewardToken(tokenTR18.target)).to.be.revertedWithCustomError(veBoost, 'RewardTokenNotExist');
      });

      it('should correct call and remove reward token from list', async () => {
        expect(await veBoost.rewardTokens()).to.deep.eq([]);
        await veBoost.addRewardToken(tokenTR18.target);
        expect(await veBoost.rewardTokens()).to.deep.eq([tokenTR18.target]);
        await expect(veBoost.removeRewardToken(tokenTR18.target)).to.be.emit(veBoost, 'RemoveRewardToken').withArgs(tokenTR18.target);
        expect(await veBoost.rewardTokens()).to.deep.eq([]);
      });
    });

    describe('#recoverTokens', async () => {
      it('should fail if try call from not owner', async () => {
        await expect(veBoost.connect(signers.otherUser1).recoverTokens(tokenTR18.target, 1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should fail if try recover more tokens than balance', async () => {
        await expect(veBoost.recoverTokens(fenix.target, ONE)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      });
      it('should correct call and recover erc20 tokens from contract', async () => {
        await fenix.transfer(veBoost.target, 1);
        await tokenTR18.mint(veBoost.target, ONE_ETHER);

        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ONE);
        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ONE_ETHER);

        await expect(veBoost.recoverTokens(fenix.target, 1)).to.be.emit(veBoost, 'RecoverToken').withArgs(fenix.target, ONE);

        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ONE_ETHER);

        let t = ONE_ETHER - ONE - ONE - ONE;
        await expect(veBoost.recoverTokens(tokenTR18.target, t)).to.be.emit(veBoost, 'RecoverToken').withArgs(tokenTR18.target, t);

        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ONE + ONE + ONE);
      });
    });
  });

  describe('View functions', async () => {
    describe('rewardTokens', async () => {
      it('return empty list if tokens not added', async () => {
        expect(await veBoost.rewardTokens()).to.be.deep.eq([]);
      });
      it('return corect list after added', async () => {
        await veBoost.addRewardToken(tokenTR18.target);
        expect(await veBoost.rewardTokens()).to.be.deep.eq([tokenTR18.target]);
        await veBoost.addRewardToken(tokenTR6.target);
        expect(await veBoost.rewardTokens()).to.be.deep.eq([tokenTR18.target, tokenTR6.target]);
      });
      it('return corect list after remove tokens & last token', async () => {
        await veBoost.addRewardToken(tokenTR6.target);
        await veBoost.addRewardToken(tokenTR18.target);
        expect(await veBoost.rewardTokens()).to.be.deep.eq([tokenTR6.target, tokenTR18.target]);
        await veBoost.removeRewardToken(tokenTR6.target);
        expect(await veBoost.rewardTokens()).to.be.deep.eq([tokenTR18.target]);
        await veBoost.addRewardToken(tokenTR6.target);
        await veBoost.removeRewardToken(tokenTR18.target);
        expect(await veBoost.rewardTokens()).to.be.deep.eq([tokenTR6.target]);
        await veBoost.removeRewardToken(tokenTR6.target);
        expect(await veBoost.rewardTokens()).to.be.deep.eq([]);
      });
    });
    describe('getMinFNXAmountForBoost', async () => {
      it('Should return current min fnx amount correctly', async () => {
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('10') / BigInt(10000));
      });
      it('Should return current min fnx amount correctly after update', async () => {
        await veBoost.setMinUSDAmount(ethers.parseEther('100'));
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('100'), ethers.parseEther('100') / BigInt(10000));
      });
      it('Should return current min fnx amount correctly after update price', async () => {
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('10') / BigInt(10000));

        let pp = await deployPriceProviderWith(tokenTR6, BigInt(1e6), ONE_ETHER * BigInt(2));
        await veBoost.setPriceProvider(pp);

        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('20'), ethers.parseEther('20') / BigInt(10000));

        pp = await deployPriceProviderWith(tokenTR6, BigInt(1e6), ethers.parseEther('1.25'));
        await veBoost.setPriceProvider(pp);
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('12.5'), ethers.parseEther('12.5') / BigInt(10000));

        pp = await deployPriceProviderWith(tokenTR6, BigInt(1e6), ethers.parseEther('0.231'));
        await veBoost.setPriceProvider(pp);
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('2.31'), ethers.parseEther('2.31') / BigInt(10000));
      });

      it('Should return current min fnx amount correctly with diff usd token decimals', async () => {
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('10') / BigInt(10000));

        let pp = await deployPriceProviderWith(tokenTR6, BigInt(1e6), ONE_ETHER * BigInt(2));
        await veBoost.setPriceProvider(pp);
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('20'), ethers.parseEther('20') / BigInt(10000));

        pp = await deployPriceProviderWith(tokenTR18, BigInt(1e18), ONE_ETHER * BigInt(2));
        await veBoost.setPriceProvider(pp);
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('20'), ethers.parseEther('20') / BigInt(10000));

        pp = await deployPriceProviderWith(await deployERC20MockToken(signers.deployer, 't', 't', 21), BigInt(1e21), ONE_ETHER * BigInt(2));
        await veBoost.setPriceProvider(pp);
        expect(await veBoost.getMinFNXAmountForBoost()).to.be.closeTo(ethers.parseEther('20'), ethers.parseEther('20') / BigInt(10000));
      });
    });
    describe('#calculateBoostFNXAmount', async () => {
      it('Should return zero fnx amount less the min FNX amount', async () => {
        expect(await veBoost.calculateBoostFNXAmount(ZERO)).to.be.eq(ZERO);
        expect(await veBoost.calculateBoostFNXAmount(ONE)).to.be.eq(ZERO);
        expect(await veBoost.calculateBoostFNXAmount(ethers.parseEther('9.99') - ONE)).to.be.eq(ZERO);
      });
      it('Should corect calculate boost fnx amount', async () => {
        let minFNXAmount = ethers.parseEther('50');
        expect(await veBoost.calculateBoostFNXAmount(minFNXAmount)).to.be.eq(ethers.parseEther('5')); // 10%
        expect(await veBoost.calculateBoostFNXAmount(ethers.parseEther('50.1'))).to.be.eq(ethers.parseEther('5.01')); // 10%
        expect(await veBoost.calculateBoostFNXAmount(ethers.parseEther('1234567.123456'))).to.be.eq(ethers.parseEther('123456.7123456')); // 10%
      });
      it('Should corect calculate boost fnx amount after change boostPercentage', async () => {
        let minFNXAmount = ethers.parseEther('50');
        expect(await veBoost.calculateBoostFNXAmount(minFNXAmount)).to.be.eq(ethers.parseEther('5')); // 10%

        await veBoost.setFNXBoostPercentage(523); // 5.23%
        expect(await veBoost.calculateBoostFNXAmount(ethers.parseEther('50'))).to.be.eq(ethers.parseEther('2.615')); // 10%

        await veBoost.setFNXBoostPercentage(0); // 5.23%
        expect(await veBoost.calculateBoostFNXAmount(ethers.parseEther('50'))).to.be.eq(ZERO); // 0%

        await veBoost.setFNXBoostPercentage(10001); // 100.01%
        expect(await veBoost.calculateBoostFNXAmount(ethers.parseEther('50'))).to.be.eq(ethers.parseEther('50.005')); // 100.01%
      });
    });
  });
  describe('#beforeFNXBoostPaid', async () => {
    it('fail if caller not votingEscrow', async () => {
      await expect(
        veBoost
          .connect(signers.otherUser1)
          .beforeFNXBoostPaid(signers.otherUser1.address, 1, ethers.parseEther('100'), ethers.parseEther('10')),
      ).to.be.revertedWithCustomError(veBoost, 'AccessDenied');
    });
    it('fail if provide not expected paidBoostFNXAmount', async () => {
      await expect(
        veBoost
          .connect(mockVotingEscrow)
          .beforeFNXBoostPaid(signers.otherUser1.address, 1, ethers.parseEther('49'), ethers.parseEther('1')),
      ).to.be.revertedWithCustomError(veBoost, 'InvalidBoostAmount');

      await expect(
        veBoost
          .connect(mockVotingEscrow)
          .beforeFNXBoostPaid(signers.otherUser1.address, 1, ethers.parseEther('50'), ethers.parseEther('5') + ONE),
      ).to.be.revertedWithCustomError(veBoost, 'InvalidBoostAmount');
    });
    it('votingEscrow can take FNX from veBoost contract', async () => {
      expect(await fenix.allowance(veBoost.target, mockVotingEscrow.address)).to.be.eq(ethers.MaxUint256);
      await fenix.transfer(veBoost.target, ONE_ETHER);

      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ONE_ETHER);
      expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
      await fenix.connect(mockVotingEscrow).transferFrom(veBoost.target, mockVotingEscrow.address, ONE);
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ONE_ETHER - ONE);
      expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ONE);

      await fenix.connect(mockVotingEscrow).transferFrom(veBoost.target, mockVotingEscrow.address, ONE_ETHER - ONE);
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ZERO);
      expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ONE_ETHER);
    });
    describe('success -', async () => {
      it('call without any additional rewards token distribution', async () => {
        await fenix.transfer(veBoost.target, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('10'));

        expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await tokenTR6.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
        expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(ZERO);

        expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ZERO);

        await veBoost
          .connect(mockVotingEscrow)
          .beforeFNXBoostPaid(signers.otherUser1.address, 1, ethers.parseEther('100'), ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('10'));

        expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await tokenTR6.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
        expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(ZERO);

        expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ZERO);
      });

      describe('call with one additional token distribution', async () => {
        beforeEach(async () => {
          await tokenTR18.mint(veBoost.target, ethers.parseEther('25'));
          await fenix.transfer(veBoost.target, ethers.parseEther('100'));
          await veBoost.addRewardToken(tokenTR18.target);
        });

        it('__check setup', async () => {
          expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));

          expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await tokenTR6.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(ZERO);

          expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await tokenTR18.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('25'));
        });

        it('corect paid additional tokens to token owner', async () => {
          await veBoost
            .connect(mockVotingEscrow)
            .beforeFNXBoostPaid(signers.otherUser1.address, 1, ethers.parseEther('100'), ethers.parseEther('10'));

          // simulate transferFrom like voting escrow
          await fenix.connect(mockVotingEscrow).transferFrom(veBoost.target, mockVotingEscrow.address, ethers.parseEther('10'));

          expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ethers.parseEther('10'));
          expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('90'));

          expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await tokenTR6.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(ZERO);

          expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('2.5'));
          expect(await tokenTR18.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('22.5'));
        });

        it('should not fail if additional tokens balansce is zero', async () => {
          await veBoost.addRewardToken(tokenTR6.target);

          await veBoost
            .connect(mockVotingEscrow)
            .beforeFNXBoostPaid(signers.otherUser1.address, 1, ethers.parseEther('100'), ethers.parseEther('10'));

          // simulate transferFrom like voting escrow
          await fenix.connect(mockVotingEscrow).transferFrom(veBoost.target, mockVotingEscrow.address, ethers.parseEther('10'));

          expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ethers.parseEther('10'));
          expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('90'));

          expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await tokenTR6.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(ZERO);

          expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('2.5'));
          expect(await tokenTR18.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('22.5'));
        });

        it('should correct work with tokens 6 decimlas', async () => {
          await veBoost.addRewardToken(tokenTR6.target);
          await tokenTR6.mint(veBoost.target, 12e6);
          expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(12e6);

          await veBoost
            .connect(mockVotingEscrow)
            .beforeFNXBoostPaid(signers.otherUser1.address, 1, ethers.parseEther('990'), ethers.parseEther('99'));

          // simulate transferFrom like voting escrow
          await fenix.connect(mockVotingEscrow).transferFrom(veBoost.target, mockVotingEscrow.address, ethers.parseEther('99'));

          expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(ethers.parseEther('99'));
          expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1'));

          expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(11.88e6);
          expect(await tokenTR6.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(0.12e6);

          expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('24.75'));
          expect(await tokenTR18.balanceOf(mockVotingEscrow.address)).to.be.eq(ZERO);
          expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('0.25'));
        });
      });
    });
  });

  describe('tests cases - ', async () => {
    for (let index = 0; index < Cases.length; index++) {
      const iterator = Cases[index];
      it(`${index} case - ${eToString(iterator)}`, async () => {
        if (iterator.priceReserves) {
          let pp = await deployPriceProviderWith(tokenTR6, iterator.priceReserves[0], iterator.priceReserves[1]);
          await veBoost.setPriceProvider(pp.target);
        } else {
          let pp = await deployPriceProviderWith(tokenTR6, BigInt(1e6), ONE_ETHER); // 1:1 price
          await veBoost.setPriceProvider(pp.target);
        }
        if (iterator.fenixBalance) {
          await fenix.transfer(veBoost.target, iterator.fenixBalance);
        }
        if (iterator.token6Balance) {
          await tokenTR6.mint(veBoost.target, iterator.token6Balance);
          await veBoost.addRewardToken(tokenTR6.target);
        }
        if (iterator.token18Balance) {
          await tokenTR18.mint(veBoost.target, iterator.token18Balance);
          await veBoost.addRewardToken(tokenTR18.target);
        }

        await veBoost.setFNXBoostPercentage(iterator.fnxBoostPercentage);

        let paidBoost = await veBoost.calculateBoostFNXAmount(iterator.depositedFNXAmount || 0);

        paidBoost = paidBoost > (await veBoost.getAvailableBoostFNXAmount()) ? await veBoost.getAvailableBoostFNXAmount() : paidBoost;

        await veBoost.connect(mockVotingEscrow).beforeFNXBoostPaid(signers.otherUser1.address, 1, iterator.depositedFNXAmount, paidBoost);

        await fenix.connect(mockVotingEscrow).transferFrom(veBoost.target, mockVotingEscrow.address, paidBoost);

        expect(await tokenTR6.balanceOf(veBoost.target)).to.be.eq(iterator.expectVeBoostToken6Balance || 0);

        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(iterator.expectVeBoostFenixBalance || 0);

        expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(iterator.expectUserToken18Balance || 0);

        expect(await tokenTR6.balanceOf(signers.otherUser1.address)).to.be.eq(iterator.expectUserToken6Balance || 0);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(iterator.expectUserFenixBalance || 0);

        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(iterator.expectVeBoostToken18Balance || 0);

        expect(await fenix.balanceOf(mockVotingEscrow.address)).to.be.eq(iterator.expectUserFenixVotingEscrowBalance || 0);
      });
    }
  });
});

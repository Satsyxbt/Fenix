import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import * as typechainTypes from '../../../typechain-types';
import { ERRORS, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployAlgebraCore,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../../utils/coreFixture';
import { VotingEscrowUpgradeableV2 } from '../../../typechain-types';

describe('VotingEscrowUpgradeableEarlyExit', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;

  let factory: typechainTypes.VotingEscrowUpgradeableV2__factory;
  let votingEscrowImplementation: VotingEscrowUpgradeableV2;
  let votingEscrow: VotingEscrowUpgradeableV2;
  let veBoost: typechainTypes.VeBoostUpgradeable;

  let fenix: typechainTypes.Fenix;
  let tokenTR6: typechainTypes.ERC20Mock;
  let tokenTR18: typechainTypes.ERC20Mock;
  let priceProvider: typechainTypes.AlgebraFNXPriceProviderUpgradeable;

  async function deployPriceProviderWith(
    usdToken: typechainTypes.ERC20Mock,
    usdReserve: bigint,
    fnxReserve: bigint,
  ): Promise<typechainTypes.AlgebraFNXPriceProviderUpgradeable> {
    let factoryPriceProvider = await ethers.getContractFactory('AlgebraFNXPriceProviderUpgradeable');
    let implementationPriceProvider = await factoryPriceProvider.deploy(signers.blastGovernor.address);
    priceProvider = factoryPriceProvider.attach(
      await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementationPriceProvider.getAddress()),
    ) as typechainTypes.AlgebraFNXPriceProviderUpgradeable;

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
    veBoost = deployed.veBoost;

    tokenTR6 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);
    tokenTR18 = await deployERC20MockToken(signers.deployer, 'TR18', 'TR18', 18);

    factory = await ethers.getContractFactory('VotingEscrowUpgradeableV2');
    votingEscrowImplementation = (await factory.deploy(signers.deployer.address)) as any as VotingEscrowUpgradeableV2;

    votingEscrow = deployed.votingEscrow;
    await veBoost.initialize(
      signers.blastGovernor.address,
      fenix.target,
      votingEscrow.target,
      (
        await deployPriceProviderWith(tokenTR6, BigInt(1e6), ONE_ETHER)
      ).target,
    );
  });

  describe('Deployment', function () {
    it('Should fail if try initialize on implementation', async function () {
      let t = await factory.deploy(signers.blastGovernor.address);
      await expect(t.initialize(signers.blastGovernor.address, await fenix.getAddress())).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try second time to initialize', async function () {
      await expect(votingEscrow.initialize(signers.blastGovernor.address, await fenix.getAddress())).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should corect set initial parameters', async function () {
      expect(await votingEscrow.token()).to.be.equal(await fenix.getAddress());
      expect(await votingEscrow.owner()).to.be.equal(signers.deployer.address);
      expect(await votingEscrow.voter()).to.be.equal(deployed.voter.target);
      expect(await votingEscrow.veBoost()).to.be.eq(ZERO_ADDRESS);
    });
  });

  describe('Interaction with veBoost', async () => {
    describe('setup ve boost', async () => {
      it('fail if try setup from not team address', async () => {
        await expect(votingEscrow.connect(signers.blastGovernor).updateAddress('veBoost', deployed.veBoost.target)).to.be.reverted;
        await expect(votingEscrow.updateAddress('veBoost', deployed.veBoost.target)).to.be.not.reverted;
      });
      it('success set ve boost address', async () => {
        expect(await votingEscrow.veBoost()).to.be.eq(ZERO_ADDRESS);
        await votingEscrow.updateAddress('veBoost', deployed.veBoost.target);
        expect(await votingEscrow.veBoost()).to.be.eq(deployed.veBoost.target);
      });
    });
    describe('have not effect if -', async () => {
      beforeEach(async () => {
        await fenix.transfer(signers.otherUser1.address, ethers.parseEther('100'));
        await fenix.transfer(veBoost.target, ethers.parseEther('100'));

        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);
      });

      it('veBoost not setup', async () => {
        expect(await votingEscrow.veBoost()).to.be.eq(ZERO_ADDRESS);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ZERO);

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 182 * 86400, signers.otherUser1.address);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
      });

      it('during token merge ', async () => {
        expect(await votingEscrow.veBoost()).to.be.eq(ZERO_ADDRESS);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ZERO);

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('50'), 182 * 86400, signers.otherUser1.address);
        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('50'), 182 * 86400, signers.otherUser1.address);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));

        await votingEscrow.updateAddress('veBoost', veBoost.target);

        await votingEscrow.connect(signers.otherUser1).merge(1, 2);

        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
      });

      it('should not provide fnx boost if call by create_lock_without_boost', async () => {
        await votingEscrow.updateAddress('veBoost', veBoost.target);
        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));

        await votingEscrow
          .connect(signers.otherUser1)
          .create_lock_for_without_boost(ethers.parseEther('100'), 182 * 86400, signers.otherUser1.address);
        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
      });
      it('during token increase unlock', async () => {
        expect(await votingEscrow.veBoost()).to.be.eq(ZERO_ADDRESS);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ZERO);

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 14 * 86400, signers.otherUser1.address);

        await votingEscrow.updateAddress('veBoost', veBoost.target);

        await votingEscrow.connect(signers.otherUser1).increase_unlock_time(1, (182 - 14) * 86400);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
      });
    });

    describe('Correct integration with veBoost', async () => {
      it('not provide boost if lock less then max period', async () => {
        await fenix.transfer(signers.otherUser1.address, ethers.parseEther('100'));
        await fenix.transfer(veBoost.target, ethers.parseEther('100'));
        await votingEscrow.updateAddress('veBoost', veBoost.target);
        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 174 * 86400, signers.otherUser1.address);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
      });
      it('not provide boost if fnx amount less then min', async () => {
        await veBoost.setMinUSDAmount(ethers.parseEther('101'));
        await fenix.transfer(signers.otherUser1.address, ethers.parseEther('100'));
        await fenix.transfer(veBoost.target, ethers.parseEther('100'));
        await votingEscrow.updateAddress('veBoost', veBoost.target);
        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 182 * 86400, signers.otherUser1.address);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));
      });
      it('success provide fnx boost value on 10%', async () => {
        await fenix.transfer(signers.otherUser1.address, ethers.parseEther('100'));
        await fenix.transfer(veBoost.target, ethers.parseEther('100'));
        await votingEscrow.updateAddress('veBoost', veBoost.target);
        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 182 * 86400, signers.otherUser1.address);
        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100') + ethers.parseEther('10'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('110'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('90'));
      });
      it('success provide fnx boost value with USDC on 4%', async () => {
        await fenix.transfer(signers.otherUser1.address, ethers.parseEther('100'));
        await fenix.transfer(veBoost.target, ethers.parseEther('100'));
        await tokenTR18.mint(veBoost.target, 50e6);

        await veBoost.addRewardToken(tokenTR18.target);
        await votingEscrow.updateAddress('veBoost', veBoost.target);
        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 182 * 86400, signers.otherUser1.address);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100') + ethers.parseEther('10'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('110'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('90'));
        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(45e6);
        expect(await tokenTR18.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(5e6);
      });
      it('success provide fnx boost if not enought on veBoost address', async () => {
        await fenix.transfer(signers.otherUser1.address, ethers.parseEther('100'));
        await fenix.transfer(veBoost.target, ethers.parseEther('1'));
        await tokenTR18.mint(veBoost.target, 50e6);

        await veBoost.addRewardToken(tokenTR18.target);
        await votingEscrow.updateAddress('veBoost', veBoost.target);
        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1'));

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 182 * 86400, signers.otherUser1.address);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('101'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('101'));
        expect(await tokenTR18.balanceOf(veBoost.target)).to.be.eq(0);
        expect(await tokenTR18.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await tokenTR18.balanceOf(signers.otherUser1.address)).to.be.eq(50e6);
      });
      it('success provide fnx boost value during increase amount with unlock on max', async () => {
        await fenix.transfer(signers.otherUser1.address, ethers.parseEther('200'));
        await fenix.transfer(veBoost.target, ethers.parseEther('100'));
        await votingEscrow.updateAddress('veBoost', veBoost.target);
        await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('200'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('100'));

        await votingEscrow.connect(signers.otherUser1).create_lock_for(ethers.parseEther('100'), 182 * 86400, signers.otherUser1.address);

        await votingEscrow.connect(signers.otherUser1).deposit_for(1, ethers.parseEther('100'));

        expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('220'));
        expect((await votingEscrow.nftStates(1)).locked.amount).to.be.eq(ethers.parseEther('220'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('220'));
        expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('80'));
      });
    });
  });
});

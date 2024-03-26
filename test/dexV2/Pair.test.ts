import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, FeesVaultUpgradeable, Pair, PairFactoryUpgradeable, PairFactoryUpgradeable__factory } from '../../typechain-types';
import { ONE_ETHER, ZERO } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';

const PRECISION = BigInt(10000);
describe('Pair Contract', function () {
  let signers: SignersList;
  let pairFactoryFactory: PairFactoryUpgradeable__factory;
  let pairFactory: PairFactoryUpgradeable;
  let feesVaultFactory: FeesVaultUpgradeable;
  let deployed: CoreFixtureDeployed;
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let pairStable: Pair;
  let pairVolatily: Pair;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;

    pairFactoryFactory = await ethers.getContractFactory('PairFactoryUpgradeable');
    pairFactory = deployed.v2PairFactory;
    feesVaultFactory = deployed.feesVaultFactory;

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

    await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), pairFactory.target);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK6.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
    pairStable = await ethers.getContractAt('Pair', await pairFactory.getPair(deployed.fenix.target, tokenTK6.target, true));
    pairVolatily = await ethers.getContractAt('Pair', await pairFactory.getPair(tokenTK18.target, tokenTK6.target, false));
  });

  describe('deployments', async () => {
    it('fail if try initialzie second time', async () => {
      await expect(
        pairVolatily.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          tokenTK18.target,
          tokenTK6.target,
          true,
          signers.otherUser1.address,
        ),
      ).to.be.revertedWith('Initialized');
    });
    it('corect initialize start parameters', async () => {
      expect(await pairVolatily.factory()).to.be.eq(pairFactory.target);

      if (tokenTK18.target.toString().toLowerCase() < tokenTK6.target.toString().toLowerCase()) {
        expect(await pairVolatily.name()).to.be.eq('VolatileV1 AMM - TK18/TK6');
        expect(await pairVolatily.symbol()).to.be.eq('vAMM-TK18/TK6');
      } else {
        expect(await pairVolatily.name()).to.be.eq('VolatileV1 AMM - TK6/TK18');
        expect(await pairVolatily.symbol()).to.be.eq('vAMM-TK6/TK18');
      }

      expect(await pairStable.factory()).to.be.eq(pairFactory.target);

      if (deployed.fenix.target.toString().toLowerCase() < tokenTK6.target.toString().toLowerCase()) {
        expect(await pairStable.name()).to.be.eq('StableV1 AMM - FNX/TK6');
        expect(await pairStable.symbol()).to.be.eq('sAMM-FNX/TK6');
      } else {
        expect(await pairStable.name()).to.be.eq('StableV1 AMM - TK6/FNX');
        expect(await pairStable.symbol()).to.be.eq('sAMM-TK6/FNX');
      }
    });
  });
  describe('swaps fees corect calculate and transfer to feesVault for volatility pairs', async () => {
    it('case protocol fee 0, volatility pair, volatility fee 0.1%', async () => {
      await pairFactory.setFee(false, 10);
      await pairFactory.setProtocolFee(0);

      expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);

      await tokenTK18.mint(pairVolatily.target, ONE_ETHER);

      await tokenTK6.mint(pairVolatily.target, 1e6);

      await pairVolatily.mint(signers.deployer.address);

      if ((await pairVolatily.token0()) == tokenTK18.target) {
        await tokenTK18.mint(pairVolatily.target, ethers.parseEther('0.12'));

        await pairVolatily.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(10)) / PRECISION;
        let calcIndex = (calcFee * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index0()).to.be.eq(calcIndex);

        expect(await tokenTK18.balanceOf(await pairVolatily.fees())).to.be.eq(calcFee);

        expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);
      } else {
        await tokenTK18.mint(pairVolatily.target, ethers.parseEther('0.12'));

        await pairVolatily.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(10)) / PRECISION;
        let calcIndex = (calcFee * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index1()).to.be.eq(calcIndex);

        expect(await tokenTK18.balanceOf(await pairVolatily.fees())).to.be.eq(calcFee);

        expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);
      }
    });
    it('case protocol fee 100%, volatility pair, custom fee 5% (MAX_FEE)', async () => {
      await pairFactory.setCustomFee(pairVolatily.target, 500);
      await pairFactory.setCustomProtocolFee(pairVolatily.target, PRECISION);

      expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);

      await tokenTK18.mint(pairVolatily.target, ONE_ETHER);

      await tokenTK6.mint(pairVolatily.target, 1e6);

      await pairVolatily.mint(signers.deployer.address);

      if ((await pairVolatily.token0()) == tokenTK18.target) {
        await tokenTK18.mint(pairVolatily.target, ethers.parseEther('0.12'));

        await pairVolatily.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(500)) / PRECISION;

        expect(await pairVolatily.index0()).to.be.eq(ZERO);

        expect(await tokenTK18.balanceOf(await pairVolatily.fees())).to.be.eq(ZERO);

        expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      } else {
        await tokenTK18.mint(pairVolatily.target, ethers.parseEther('0.12'));

        await pairVolatily.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(500)) / PRECISION;

        expect(await pairVolatily.index1()).to.be.eq(ZERO);

        expect(await tokenTK18.balanceOf(await pairVolatily.fees())).to.be.eq(ZERO);

        expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      }
    });
    it('case protocol fee 80%, volatility pair, custom fee 0.8%', async () => {
      await pairFactory.setCustomFee(pairVolatily.target, 80);
      await pairFactory.setCustomProtocolFee(pairVolatily.target, 8000);

      expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);

      await tokenTK18.mint(pairVolatily.target, ONE_ETHER);

      await tokenTK6.mint(pairVolatily.target, 1e6);

      await pairVolatily.mint(signers.deployer.address);

      if ((await pairVolatily.token0()) == tokenTK18.target) {
        await tokenTK18.mint(pairVolatily.target, ethers.parseEther('0.12'));

        await pairVolatily.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index0()).to.be.eq(calcIndex);

        expect(await tokenTK18.balanceOf(await pairVolatily.fees())).to.be.eq(calcFeeToFees);

        expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      } else {
        await tokenTK18.mint(pairVolatily.target, ethers.parseEther('0.12'));

        await pairVolatily.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index1()).to.be.eq(calcIndex);

        expect(await tokenTK18.balanceOf(await pairVolatily.fees())).to.be.eq(calcFeeToFees);

        expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      }
    });
    it('reverse case protocol fee 0, volatility pair, volatility fee 0.1%', async () => {
      await pairFactory.setFee(false, 10);
      await pairFactory.setProtocolFee(0);

      expect(await tokenTK6.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);

      await tokenTK18.mint(pairVolatily.target, ONE_ETHER);

      await tokenTK6.mint(pairVolatily.target, 1e6);

      await pairVolatily.mint(signers.deployer.address);

      if ((await pairVolatily.token0()) == tokenTK6.target) {
        await tokenTK6.mint(pairVolatily.target, 1.2e5);

        await pairVolatily.swap(0, ethers.parseEther('0.1'), signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(10)) / PRECISION;
        let calcIndex = (calcFee * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index0()).to.be.eq(calcIndex);

        expect(await tokenTK6.balanceOf(await pairVolatily.fees())).to.be.eq(calcFee);

        expect(await tokenTK6.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);
      } else {
        await tokenTK6.mint(pairVolatily.target, 1.2e5);

        await pairVolatily.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(10)) / PRECISION;
        let calcIndex = (calcFee * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index1()).to.be.eq(calcIndex);

        expect(await tokenTK6.balanceOf(await pairVolatily.fees())).to.be.eq(calcFee);

        expect(await tokenTK6.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);
      }
    });
    it('reverse case protocol fee 100%, volatility pair, custom fee 5% (MAX_FEE)', async () => {
      await pairFactory.setCustomFee(pairVolatily.target, 500);
      await pairFactory.setCustomProtocolFee(pairVolatily.target, PRECISION);

      expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);

      await tokenTK18.mint(pairVolatily.target, ONE_ETHER);

      await tokenTK6.mint(pairVolatily.target, 1e6);

      await pairVolatily.mint(signers.deployer.address);

      if ((await pairVolatily.token0()) == tokenTK6.target) {
        await tokenTK6.mint(pairVolatily.target, BigInt(1.2e5));

        await pairVolatily.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(500)) / PRECISION;

        expect(await pairVolatily.index0()).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairVolatily.fees())).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      } else {
        await tokenTK6.mint(pairVolatily.target, BigInt(1.2e5));

        await pairVolatily.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(500)) / PRECISION;

        expect(await pairVolatily.index1()).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairVolatily.fees())).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      }
    });
    it('reverse case protocol fee 80%, volatility pair, custom fee 0.8%', async () => {
      await pairFactory.setCustomFee(pairVolatily.target, 80);
      await pairFactory.setCustomProtocolFee(pairVolatily.target, 8000);

      expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);

      await tokenTK18.mint(pairVolatily.target, ONE_ETHER);

      await tokenTK6.mint(pairVolatily.target, 1e6);

      await pairVolatily.mint(signers.deployer.address);

      if ((await pairVolatily.token0()) == tokenTK6.target) {
        await tokenTK6.mint(pairVolatily.target, BigInt(1.2e5));

        await pairVolatily.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index0()).to.be.eq(calcIndex);

        expect(await tokenTK6.balanceOf(await pairVolatily.fees())).to.be.eq(calcFeeToFees);

        expect(await tokenTK6.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      } else {
        await tokenTK6.mint(pairVolatily.target, BigInt(1.2e5));

        await pairVolatily.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairVolatily.totalSupply());

        expect(await pairVolatily.index1()).to.be.eq(calcIndex);

        expect(await tokenTK6.balanceOf(await pairVolatily.fees())).to.be.eq(calcFeeToFees);

        expect(await tokenTK6.balanceOf(await pairVolatily.communityVault())).to.be.eq(calcFee);
      }
    });
  });
  describe('swaps fees corect calculate and transfer to feesVault for stable pairs', async () => {
    it('case protocol fee 0%, pairStable pair, stable fee 0.1% (MAX_FEE)', async () => {
      await pairFactory.setFee(true, 10);
      await pairFactory.setProtocolFee(0);

      expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(ZERO);

      await deployed.fenix.transfer(pairStable.target, ONE_ETHER);

      await tokenTK6.mint(pairStable.target, 1e6);

      await pairStable.mint(signers.deployer.address);

      if ((await pairStable.token0()) == deployed.fenix.target) {
        await deployed.fenix.transfer(pairStable.target, ethers.parseEther('0.12'));

        await pairStable.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(10)) / PRECISION;
        let calcIndex = (calcFee * ethers.parseEther('1')) / (await pairStable.totalSupply());

        expect(await pairStable.index0()).to.be.eq(calcIndex);

        expect(await deployed.fenix.balanceOf(await pairStable.fees())).to.be.eq(calcFee);

        expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(ZERO);
      } else {
        await deployed.fenix.transfer(pairStable.target, ethers.parseEther('0.12'));

        await pairStable.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(10)) / PRECISION;
        let calcIndex = (calcFee * ethers.parseEther('1')) / (await pairStable.totalSupply());

        expect(await pairStable.index1()).to.be.eq(calcIndex);

        expect(await deployed.fenix.balanceOf(await pairStable.fees())).to.be.eq(calcFee);

        expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(ZERO);
      }
    });
    it('case protocol fee 100%, pairStable pair, custom fee 5% (MAX_FEE)', async () => {
      await pairFactory.setCustomFee(pairStable.target, 500);
      await pairFactory.setCustomProtocolFee(pairStable.target, PRECISION);

      expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(ZERO);

      await deployed.fenix.transfer(pairStable.target, ONE_ETHER);

      await tokenTK6.mint(pairStable.target, 1e6);

      await pairStable.mint(signers.deployer.address);

      if ((await pairStable.token0()) == deployed.fenix.target) {
        await deployed.fenix.transfer(pairStable.target, ethers.parseEther('0.12'));

        await pairStable.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(500)) / PRECISION;

        expect(await pairStable.index0()).to.be.eq(ZERO);

        expect(await deployed.fenix.balanceOf(await pairStable.fees())).to.be.eq(ZERO);

        expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      } else {
        await deployed.fenix.transfer(pairStable.target, ethers.parseEther('0.12'));

        await pairStable.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(500)) / PRECISION;

        expect(await pairStable.index1()).to.be.eq(ZERO);

        expect(await deployed.fenix.balanceOf(await pairStable.fees())).to.be.eq(ZERO);

        expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      }
    });
    it('case protocol fee 80%, pairStable, custom fee 0.8%', async () => {
      await pairFactory.setCustomFee(pairStable.target, 80);
      await pairFactory.setCustomProtocolFee(pairStable.target, 8000);

      expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(ZERO);

      await deployed.fenix.transfer(pairStable.target, ONE_ETHER);

      await tokenTK6.mint(pairStable.target, 1e6);

      await pairStable.mint(signers.deployer.address);

      if ((await pairStable.token0()) == deployed.fenix.target) {
        await deployed.fenix.transfer(pairStable.target, ethers.parseEther('0.12'));

        await pairStable.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairStable.totalSupply());

        expect(await pairStable.index0()).to.be.eq(calcIndex);

        expect(await deployed.fenix.balanceOf(await pairStable.fees())).to.be.eq(calcFeeToFees);

        expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      } else {
        await deployed.fenix.transfer(pairStable.target, ethers.parseEther('0.12'));

        await pairStable.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (ethers.parseEther('0.12') * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairStable.totalSupply());

        expect(await pairStable.index1()).to.be.eq(calcIndex);

        expect(await deployed.fenix.balanceOf(await pairStable.fees())).to.be.eq(calcFeeToFees);

        expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      }
    });
    it('reverse case protocol fee 100%, volatility pair, custom fee 5% (MAX_FEE)', async () => {
      await pairFactory.setCustomFee(pairStable.target, 500);
      await pairFactory.setCustomProtocolFee(pairStable.target, PRECISION);

      expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(ZERO);

      await deployed.fenix.transfer(pairStable.target, ONE_ETHER);

      await tokenTK6.mint(pairStable.target, 1e6);

      await pairStable.mint(signers.deployer.address);

      if ((await pairStable.token0()) == tokenTK6.target) {
        await tokenTK6.mint(pairStable.target, BigInt(1.2e5));

        await pairStable.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(500)) / PRECISION;

        expect(await pairStable.index0()).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairStable.fees())).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      } else {
        await tokenTK6.mint(pairStable.target, BigInt(1.2e5));

        await pairStable.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(500)) / PRECISION;

        expect(await pairStable.index1()).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairStable.fees())).to.be.eq(ZERO);

        expect(await tokenTK6.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      }
    });
    it('reverse case protocol fee 80%, pairStable, custom fee 0.8%', async () => {
      await pairFactory.setCustomFee(pairStable.target, 80);
      await pairFactory.setCustomProtocolFee(pairStable.target, 8000);

      expect(await deployed.fenix.balanceOf(await pairStable.communityVault())).to.be.eq(ZERO);

      await deployed.fenix.transfer(pairStable.target, ONE_ETHER);

      await tokenTK6.mint(pairStable.target, 1e6);

      await pairStable.mint(signers.deployer.address);

      if ((await pairStable.token0()) == tokenTK6.target) {
        await tokenTK6.mint(pairStable.target, BigInt(1.2e5));

        await pairStable.swap(0, 1e5, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairStable.totalSupply());

        expect(await pairStable.index0()).to.be.eq(calcIndex);

        expect(await tokenTK6.balanceOf(await pairStable.fees())).to.be.eq(calcFeeToFees);

        expect(await tokenTK6.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      } else {
        await tokenTK6.mint(pairStable.target, BigInt(1.2e5));

        await pairStable.swap(1e5, 0, signers.deployer.address, '0x');

        let calcFee = (BigInt(1.2e5) * BigInt(80)) / PRECISION;

        let calcFeeToFees = (calcFee * BigInt(2000)) / PRECISION;

        calcFee = calcFee - calcFeeToFees;

        let calcIndex = (calcFeeToFees * ethers.parseEther('1')) / (await pairStable.totalSupply());

        expect(await pairStable.index1()).to.be.eq(calcIndex);

        expect(await tokenTK6.balanceOf(await pairStable.fees())).to.be.eq(calcFeeToFees);

        expect(await tokenTK6.balanceOf(await pairStable.communityVault())).to.be.eq(calcFee);
      }
    });
  });
  describe('#setCommunityVault', async () => {
    it('fails if caller is not PAIRS_ADMINISTRATOR', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).setCommunityVault(signers.otherUser1)).to.be.revertedWith('ACCESS_DENIED');
    });
    it('should corect set new community vault and emit event', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).setCommunityVault(signers.otherUser1)).to.be.revertedWith('ACCESS_DENIED');

      await pairFactory.grantRole(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address);

      expect(await pairVolatily.communityVault()).to.be.not.eq(signers.otherUser1.address);
      await expect(pairVolatily.connect(signers.otherUser1).setCommunityVault(signers.otherUser1))
        .to.be.emit(pairVolatily, 'SetCommunityVault')
        .withArgs(signers.otherUser1);
      expect(await pairVolatily.communityVault()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#claim', async () => {
    it('fails if caller is not PAIR_ADMINISTRATOR or factory', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).claim(tokenTK18.target, signers.otherUser1.address, 1)).to.be.revertedWith(
        'ACCESS_DENIED',
      );

      await pairFactory.grantRole(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address);
      await expect(pairVolatily.connect(signers.otherUser1).claim(tokenTK18.target, signers.otherUser1.address, 1)).to.be.not.revertedWith(
        'ACCESS_DENIED',
      );
    });
  });

  describe('#configure', async () => {
    it('fails if caller is not PAIR_ADMINISTRATOR or factory', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).configure(tokenTK18.target, 1)).to.be.revertedWith('ACCESS_DENIED');
      await pairFactory.grantRole(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address);
      await expect(pairVolatily.connect(signers.otherUser1).configure(tokenTK18.target, 1)).to.be.not.revertedWith('ACCESS_DENIED');
    });
  });
});

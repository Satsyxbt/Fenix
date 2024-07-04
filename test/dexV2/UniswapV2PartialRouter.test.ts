import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, Pair, PairFactoryUpgradeable, RouterV2, UniswapV2PartialRouter, WETH9 } from '../../typechain-types';
import { WETH_PREDEPLOYED_ADDRESS, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';

describe('Pair Contract', function () {
  let signers: SignersList;
  let pairFactory: PairFactoryUpgradeable;
  let deployed: CoreFixtureDeployed;
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let weth9: WETH9;
  let pairStable: Pair;
  let pairVolatily: Pair;
  let router: UniswapV2PartialRouter;

  async function deadline() {
    return (await time.latest()) + 1000;
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;

    pairFactory = deployed.v2PairFactory;
    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);
    weth9 = await ethers.deployContract('WETH9');

    router = await ethers.deployContract('UniswapV2PartialRouter', [signers.deployer.address, pairFactory.target, weth9]);

    pairStable = await ethers.getContractAt(
      'Pair',
      await deployed.v2PairFactory.connect(signers.deployer).createPair.staticCall(tokenTK18.target, tokenTK6.target, false),
    );
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(weth9.target, tokenTK18.target, true);
    pairVolatily = await ethers.getContractAt(
      'Pair',
      await deployed.v2PairFactory.connect(signers.deployer).createPair.staticCall(weth9.target, tokenTK18.target, false),
    );

    await deployed.v2PairFactory.connect(signers.deployer).createPair(weth9.target, tokenTK18.target, false);

    await weth9.approve(router.target, ethers.MaxUint256);
    await tokenTK18.approve(router.target, ethers.MaxUint256);
    await tokenTK6.approve(router.target, ethers.MaxUint256);
    await pairVolatily.approve(router.target, ethers.MaxUint256);

    await tokenTK6.mint(signers.deployer.address, ethers.parseEther('1000'));
    await tokenTK18.mint(signers.deployer.address, ethers.parseEther('1000'));
    await weth9.deposit({ value: ethers.parseEther('1000') });
  });

  describe('correct initialize contract', async () => {
    it('factory', async () => {
      expect(await router.factory()).to.be.eq(pairFactory.target);
    });
    it('WETH', async () => {
      expect(await router.WETH()).to.be.eq(weth9.target);
    });
    it('wETH', async () => {
      expect(await router.wETH()).to.be.eq(weth9.target);
    });
  });
  describe('pathsToVolatilityRoute', async () => {
    it('zero element in path', async () => {
      await expect(router.pathsToVolatilityRoutes([])).to.be.reverted;
    });
    it('one element in path', async () => {
      expect(await router.pathsToVolatilityRoutes([tokenTK18.target])).to.be.deep.eq([]);
    });
    it('should correct convert path to volatility routes, singel pool', async () => {
      expect(await router.pathsToVolatilityRoutes([tokenTK18.target, tokenTK6.target])).to.be.deep.eq([
        [tokenTK18.target, tokenTK6.target, false],
      ]);
    });
    it('should correct convert path to volatility routes, two pool', async () => {
      expect(await router.pathsToVolatilityRoutes([tokenTK18.target, tokenTK6.target, weth9.target])).to.be.deep.eq([
        [tokenTK18.target, tokenTK6.target, false],
        [tokenTK6.target, weth9.target, false],
      ]);
    });
  });
  describe('#addLiquidity', async () => {
    it('should be the same for volatility pool', async () => {
      let parentResult = await router['addLiquidity(address,address,bool,uint256,uint256,uint256,uint256,address,uint256)'].staticCall(
        weth9.target,
        tokenTK18.target,
        false,
        ethers.parseEther('1'),
        ethers.parseEther('1'),
        0,
        0,
        signers.deployer.address,
        await deadline(),
      );
      let childResult = await router['addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)'].staticCall(
        weth9.target,
        tokenTK18.target,
        ethers.parseEther('1'),
        ethers.parseEther('1'),
        0,
        0,
        signers.deployer.address,
        await deadline(),
      );
      expect(parentResult).to.be.deep.eq(childResult);
    });
  });

  describe('#addLiquidityETH', async () => {
    it('should be the same for volatility pool', async () => {
      let parentResult = await router['addLiquidityETH(address,bool,uint256,uint256,uint256,address,uint256)'].staticCall(
        tokenTK18.target,
        false,
        ethers.parseEther('1'),
        0,
        0,
        signers.deployer.address,
        await deadline(),
        { value: ethers.parseEther('1') },
      );

      let childResult = await router['addLiquidityETH(address,uint256,uint256,uint256,address,uint256)'].staticCall(
        tokenTK18.target,
        ethers.parseEther('1'),
        0,
        0,
        signers.deployer.address,
        await deadline(),
        { value: ethers.parseEther('1') },
      );
      expect(parentResult).to.be.deep.eq(childResult);
    });
  });

  describe('with liquidity', async () => {
    beforeEach(async () => {
      await router['addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)'](
        weth9.target,
        tokenTK18.target,
        ethers.parseEther('1'),
        ethers.parseEther('2'),
        0,
        0,
        signers.deployer.address,
        await deadline(),
      );
      await router['addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)'](
        tokenTK6.target,
        tokenTK18.target,
        ethers.parseEther('2'),
        ethers.parseEther('4'),
        0,
        0,
        signers.deployer.address,
        await deadline(),
      );
    });
    it('#getReserves()', async () => {
      expect(await router['getReserves(address,address)'](weth9.target, tokenTK18.target)).to.be.deep.eq([
        ethers.parseEther('1'),
        ethers.parseEther('2'),
      ]);
      expect(await router['getReserves(address,address)'](weth9.target, tokenTK18.target)).to.be.deep.eq(
        await router['getReserves(address,address,bool)'](weth9.target, tokenTK18.target, false),
      );
    });
    it('#getAmountsOut', async () => {
      expect(await router['getAmountsOut(uint256,address[])'](ethers.parseEther('1'), [tokenTK18.target, weth9.target])).to.be.deep.eq(
        await router['getAmountsOut(uint256,(address,address,bool)[])'](ethers.parseEther('1'), [[tokenTK18.target, weth9.target, false]]),
      );
      expect(
        await router['getAmountsOut(uint256,address[])'](ethers.parseEther('1'), [weth9.target, tokenTK18.target, tokenTK6.target]),
      ).to.be.deep.eq(
        await router['getAmountsOut(uint256,(address,address,bool)[])'](ethers.parseEther('1'), [
          [weth9.target, tokenTK18.target, false],
          [tokenTK18.target, tokenTK6.target, false],
        ]),
      );
    });
    describe('#removeLiquidity', async () => {
      it('should be the same for volatility pool', async () => {
        let parentResult = await router['removeLiquidity(address,address,bool,uint256,uint256,uint256,address,uint256)'].staticCall(
          weth9.target,
          tokenTK18.target,
          false,
          ethers.parseEther('0.1'),
          0,
          0,
          signers.deployer.address,
          await deadline(),
        );

        let childResult = await router['removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)'].staticCall(
          weth9.target,
          tokenTK18.target,
          ethers.parseEther('0.1'),
          0,
          0,
          signers.deployer.address,
          await deadline(),
        );
        expect(parentResult).to.be.deep.eq(childResult);
      });
    });
    describe('#removeLiquidityETH', async () => {
      it('should be the same for volatility pool', async () => {
        let parentResult = await router['removeLiquidityETH(address,bool,uint256,uint256,uint256,address,uint256)'].staticCall(
          tokenTK18.target,
          false,
          ethers.parseEther('0.1'),
          0,
          0,
          signers.deployer.address,
          await deadline(),
        );

        let childResult = await router['removeLiquidityETH(address,uint256,uint256,uint256,address,uint256)'].staticCall(
          tokenTK18.target,
          ethers.parseEther('0.1'),
          0,
          0,
          signers.deployer.address,
          await deadline(),
        );
        expect(parentResult).to.be.deep.eq(childResult);
      });
    });

    describe('#removeLiquidity', async () => {
      it('should be the same for volatility pool', async () => {
        let parentResult = await router['removeLiquidity(address,address,bool,uint256,uint256,uint256,address,uint256)'].staticCall(
          weth9.target,
          tokenTK18.target,
          false,
          ethers.parseEther('0.1'),
          0,
          0,
          signers.deployer.address,
          await deadline(),
        );

        let childResult = await router['removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)'].staticCall(
          weth9.target,
          tokenTK18.target,
          ethers.parseEther('0.1'),
          0,
          0,
          signers.deployer.address,
          await deadline(),
        );
        expect(parentResult).to.be.deep.eq(childResult);
      });
    });
    describe('#removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
      it('should be the same for volatility pool', async () => {
        let parentResult = await router[
          'removeLiquidityETHSupportingFeeOnTransferTokens(address,bool,uint256,uint256,uint256,address,uint256)'
        ].staticCall(tokenTK18.target, false, ethers.parseEther('0.1'), 0, 0, signers.deployer.address, await deadline());

        let childResult = await router[
          'removeLiquidityETHSupportingFeeOnTransferTokens(address,uint256,uint256,uint256,address,uint256)'
        ].staticCall(tokenTK18.target, ethers.parseEther('0.1'), 0, 0, signers.deployer.address, await deadline());
        expect(parentResult.amountETH).to.be.deep.eq(childResult);
      });
    });
    describe('swapExactTokensForTokens', async () => {
      it('same for volatility pool', async () => {
        let parentResult = await router['swapExactTokensForTokens(uint256,uint256,(address,address,bool)[],address,uint256)'].staticCall(
          ethers.parseEther('0.1'),
          1,
          [{ from: weth9.target, to: tokenTK18.target, stable: false }],
          signers.deployer.address,
          await deadline(),
        );

        let childResult = await router['swapExactTokensForTokens(uint256,uint256,address[],address,uint256)'].staticCall(
          ethers.parseEther('0.1'),
          1,
          [weth9.target, tokenTK18.target],
          signers.deployer.address,
          await deadline(),
        );

        expect(parentResult).to.be.deep.eq(childResult);
      });
    });
    describe('swapExactETHForTokens', async () => {
      it('same for volatility pool', async () => {
        let childResult = await router['swapExactETHForTokens(uint256,address[],address,uint256)'].staticCall(
          1,
          [weth9.target, tokenTK18.target],
          signers.deployer.address,
          await deadline(),
          { value: ethers.parseEther('0.1') },
        );

        let parentResult = await router['swapExactETHForTokens(uint256,(address,address,bool)[],address,uint256)'].staticCall(
          1,
          [[weth9.target, tokenTK18.target, false]],
          signers.deployer.address,
          await deadline(),
          { value: ethers.parseEther('0.1') },
        );

        expect(parentResult).to.be.deep.eq(childResult);
      });
    });
  });
});

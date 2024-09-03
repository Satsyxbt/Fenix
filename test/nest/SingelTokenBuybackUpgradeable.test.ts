import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';

import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  Pair,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  SingelTokenBuybackUpgradeableMock,
  SingelTokenBuybackUpgradeableMock__factory,
} from '../../typechain-types';
import { ERRORS, ONE_ETHER, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  getSigners,
} from '../utils/coreFixture';

describe('SingelTokenBuybackUpgradeable Contract', function () {
  let signers: SignersList;

  let pathProvider: RouterV2PathProviderUpgradeable;
  let factory: SingelTokenBuybackUpgradeableMock__factory;
  let singelTokenBuyback: SingelTokenBuybackUpgradeableMock;
  let singelTokenBuybackImpl: SingelTokenBuybackUpgradeableMock;

  let deployed: CoreFixtureDeployed;

  let routerV2: RouterV2;

  let USDT: ERC20Mock;
  let WETH: ERC20Mock;
  let FENIX: ERC20Mock;

  async function createPairWithObservation(
    signer: HardhatEthersSigner,
    tokenA: ERC20Mock,
    tokenB: ERC20Mock,
    stable: boolean,
    reserveA: any,
    reserveB: any,
  ): Promise<Pair> {
    await deployed.v2PairFactory.connect(signer).createPair(tokenA.target, tokenB.target, stable);

    let pair = await ethers.getContractAt('Pair', await deployed.v2PairFactory.getPair(tokenA.target, tokenB.target, stable));

    await tokenA.mint(pair.target, reserveA);
    await tokenB.mint(pair.target, reserveB);
    await pair.mint(signer.address);

    await time.increase(1801);

    await tokenA.mint(pair.target, reserveA);
    await tokenB.mint(pair.target, reserveB);
    await pair.mint(signer.address);

    await time.increase(1801);

    await tokenA.mint(pair.target, reserveA);
    await tokenB.mint(pair.target, reserveB);
    await pair.mint(signer.address);
    await time.increase(1801);

    await tokenA.mint(pair.target, reserveA);
    await tokenB.mint(pair.target, reserveB);
    await pair.mint(signer.address);
    await time.increase(1801);
    return pair;
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = await getSigners();

    USDT = await deployERC20MockToken(signers.deployer, 'USDT', 'USDT', 6);
    WETH = await deployERC20MockToken(signers.deployer, 'WETH', 'WETH', 18);
    FENIX = await deployERC20MockToken(signers.deployer, 'FENIX', 'FNX', 18);

    let pathProviderFactory = await ethers.getContractFactory('RouterV2PathProviderUpgradeable');
    let pathProviderImpl = await pathProviderFactory.deploy(signers.deployer.address);

    pathProvider = pathProviderFactory.attach(
      (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await pathProviderImpl.getAddress())).target,
    ) as any as RouterV2PathProviderUpgradeable;

    routerV2 = await ethers.deployContract('RouterV2', [
      signers.blastGovernor.address,
      deployed.v2PairFactory.target,
      WETH_PREDEPLOYED_ADDRESS,
    ]);
    await pathProvider.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target);

    factory = await ethers.getContractFactory('SingelTokenBuybackUpgradeableMock');
    singelTokenBuybackImpl = await factory.deploy();

    singelTokenBuyback = (await ethers.getContractAt(
      'SingelTokenBuybackUpgradeableMock',
      (
        await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await singelTokenBuybackImpl.getAddress())
      ).target,
    )) as any as SingelTokenBuybackUpgradeableMock;

    await singelTokenBuyback.initialize(pathProvider.target, FENIX.target);
  });

  describe('Deployment', async () => {
    it('fail if try initialize second time', async () => {
      await expect(singelTokenBuyback.initialize(pathProvider.target, FENIX.target)).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('correct set provided params', async () => {
      expect(await singelTokenBuyback.routerV2PathProvider()).to.be.eq(pathProvider.target);
      expect(await singelTokenBuyback.owner()).to.be.eq(signers.deployer.address);
    });

    it('correct init params', async () => {
      expect(await singelTokenBuyback.MAX_SLIPPAGE()).to.be.eq(400);
      expect(await singelTokenBuyback.SLIPPAGE_PRECISION()).to.be.eq(10000);
    });
  });
  describe('#getBuybackTargetToken', async () => {
    it('should return correct target token', async () => {
      expect(await singelTokenBuyback.getBuybackTargetToken()).to.be.eq(FENIX.target);
    });
  });

  describe('#buybackTokenByV2', async () => {
    it('fail if call from not authorized wallet', async () => {
      await expect(
        singelTokenBuyback.connect(signers.otherUser1).buybackTokenByV2(USDT.target, [], 100, (await time.latest()) + 8600),
      ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
    it('fail if call with incorrect slippage', async () => {
      await expect(singelTokenBuyback.buybackTokenByV2(USDT.target, [], 401, (await time.latest()) + 8600)).to.be.revertedWithCustomError(
        singelTokenBuyback,
        'IncorrectSlippage',
      );
    });
    it('fail if call with zero input token', async () => {
      await expect(singelTokenBuyback.buybackTokenByV2(ZERO_ADDRESS, [], 400, (await time.latest()) + 8600)).to.be.revertedWithCustomError(
        singelTokenBuyback,
        'ZeroAddress',
      );
    });
    it('fail if call with input token == target token', async () => {
      await expect(singelTokenBuyback.buybackTokenByV2(FENIX.target, [], 400, (await time.latest()) + 8600)).to.be.revertedWithCustomError(
        singelTokenBuyback,
        'IncorrectInputToken',
      );
    });
    it('fail if balance input token is zero', async () => {
      await expect(singelTokenBuyback.buybackTokenByV2(USDT.target, [], 400, (await time.latest()) + 8600)).to.be.revertedWithCustomError(
        singelTokenBuyback,
        'ZeroBalance',
      );
    });
    it('fail if routes not exists', async () => {
      await USDT.mint(singelTokenBuyback.target, 1);
      await expect(singelTokenBuyback.buybackTokenByV2(USDT.target, [], 400, (await time.latest()) + 8600)).to.be.revertedWithCustomError(
        singelTokenBuyback,
        'RouteNotFound',
      );
    });

    describe('with input routers', async () => {
      it('fail if user provide route with incorrect input token', async () => {
        await USDT.mint(singelTokenBuyback.target, 1e6);

        await expect(
          singelTokenBuyback.buybackTokenByV2(
            USDT.target,
            [
              {
                from: WETH.target,
                to: USDT.target,
                stable: true,
              },
              {
                from: USDT.target,
                to: FENIX.target,
                stable: true,
              },
            ],
            400,
            (await time.latest()) + 8600,
          ),
        ).to.be.revertedWithCustomError(singelTokenBuyback, 'InvalidInputRoutes');
      });
      it('fail if user provide route with incorrect output token', async () => {
        await USDT.mint(singelTokenBuyback.target, 1e6);

        await expect(
          singelTokenBuyback.buybackTokenByV2(
            USDT.target,
            [
              {
                from: USDT.target,
                to: USDT.target,
                stable: true,
              },
              {
                from: WETH.target,
                to: USDT.target,
                stable: true,
              },
            ],
            400,
            (await time.latest()) + 8600,
          ),
        ).to.be.revertedWithCustomError(singelTokenBuyback, 'InvalidInputRoutes');
      });
      it('fail if user provide route with not allowed tokens for this actions', async () => {
        await USDT.mint(singelTokenBuyback.target, 1e6);

        await expect(
          singelTokenBuyback.buybackTokenByV2(
            USDT.target,
            [
              {
                from: USDT.target,
                to: WETH.target,
                stable: true,
              },
              {
                from: WETH.target,
                to: FENIX.target,
                stable: true,
              },
            ],
            400,
            (await time.latest()) + 8600,
          ),
        ).to.be.revertedWithCustomError(singelTokenBuyback, 'InvalidInputRoutes');

        await pathProvider.setAllowedTokenInInputRouters(USDT.target, true);
        await pathProvider.setAllowedTokenInInputRouters(WETH.target, true);

        await createPairWithObservation(signers.deployer, USDT, WETH, false, 1e6, ethers.parseEther('1'));
        await createPairWithObservation(signers.deployer, WETH, FENIX, true, ethers.parseEther('100'), ethers.parseEther('100'));

        await expect(
          singelTokenBuyback.buybackTokenByV2(
            USDT.target,
            [
              {
                from: USDT.target,
                to: WETH.target,
                stable: false,
              },
              {
                from: WETH.target,
                to: FENIX.target,
                stable: true,
              },
            ],
            400,
            (await time.latest()) + 8600,
          ),
        ).to.be.not.reverted;

        await pathProvider.setAllowedTokenInInputRouters(WETH.target, false);
        await USDT.mint(singelTokenBuyback.target, 1e6);

        await expect(
          singelTokenBuyback.buybackTokenByV2(
            USDT.target,
            [
              {
                from: USDT.target,
                to: WETH.target,
                stable: true,
              },
              {
                from: WETH.target,
                to: FENIX.target,
                stable: true,
              },
            ],
            400,
            (await time.latest()) + 8600,
          ),
        ).to.be.revertedWithCustomError(singelTokenBuyback, 'InvalidInputRoutes');
      });
      it('correct buyback token by user flow if that better then from path provider', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 200e6);
        let USDT_FENIX_VOLATILITY = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('200'));

        let WETH_FENIX_VOLATILITY = await createPairWithObservation(
          signers.deployer,
          WETH,
          FENIX,
          false,
          ethers.parseEther('100'),
          ethers.parseEther('100'),
        );

        await pathProvider.setAllowedTokenInInputRouters(WETH.target, true);
        await pathProvider.setAllowedTokenInInputRouters(USDT.target, true);

        let amountOut = await WETH_USDT_VOLATILITY.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(2e6, 0.1e6);

        amountOut = await USDT_FENIX_VOLATILITY.getAmountOut(amountOut, USDT.target);

        expect(amountOut).to.be.closeTo(ethers.parseEther('4'), ethers.parseEther('0.1'));

        await WETH.mint(singelTokenBuyback.target, ONE_ETHER);

        let result = await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER);
        expect(result.amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));

        await expect(
          singelTokenBuyback.buybackTokenByV2(
            WETH.target,
            [
              {
                from: WETH.target,
                to: USDT.target,
                stable: false,
              },
              { from: USDT.target, to: FENIX.target, stable: false },
            ],
            100,
            (await time.latest()) + 3600,
          ),
        ).to.be.emit(singelTokenBuyback, 'BuybackTokenByV2');
        expect(await FENIX.balanceOf(singelTokenBuyback.target)).to.be.eq(amountOut);
        expect(amountOut).to.be.closeTo(ethers.parseEther('4'), ethers.parseEther('0.1'));
      });
      it('not buyback token by user flow if that worse then from path provider', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 99e6);
        let USDT_FENIX_VOLATILITY = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('50'));

        let WETH_FENIX_VOLATILITY = await createPairWithObservation(
          signers.deployer,
          WETH,
          FENIX,
          false,
          ethers.parseEther('100'),
          ethers.parseEther('100'),
        );

        await pathProvider.setAllowedTokenInInputRouters(WETH.target, true);
        await pathProvider.setAllowedTokenInInputRouters(USDT.target, true);

        let amountOut = await WETH_USDT_VOLATILITY.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(1e6, 0.1e6);
        amountOut = await USDT_FENIX_VOLATILITY.getAmountOut(amountOut, USDT.target);

        expect(amountOut).to.be.closeTo(ethers.parseEther('0.5'), ethers.parseEther('0.1'));

        await WETH.mint(singelTokenBuyback.target, ONE_ETHER);

        let result = await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER);
        expect(result.amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.05'));

        await expect(
          singelTokenBuyback.buybackTokenByV2(
            WETH.target,
            [
              {
                from: WETH.target,
                to: USDT.target,
                stable: false,
              },
              { from: USDT.target, to: FENIX.target, stable: false },
            ],
            100,
            (await time.latest()) + 3600,
          ),
        ).to.be.emit(singelTokenBuyback, 'BuybackTokenByV2');
        expect(await FENIX.balanceOf(singelTokenBuyback.target)).to.be.eq(result.amountOut);
        expect(result.amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.05'));
      });
    });

    describe('correct buyback', async () => {
      it('correct buyback token by direct route from routev2 path stabel provided', async () => {
        let FENIX_USDT_STABLE = await createPairWithObservation(signers.deployer, USDT, FENIX, true, 10000e6, ethers.parseEther('10000'));

        await USDT.mint(singelTokenBuyback.target, 100e6);
        expect(await USDT.balanceOf(singelTokenBuyback.target)).to.be.eq(100e6);

        let balanceBefore = await FENIX.balanceOf(singelTokenBuyback.target);

        let result = await pathProvider.getOptimalTokenToTokenRoute(USDT.target, FENIX.target, 100e6);

        await expect(singelTokenBuyback.buybackTokenByV2(USDT.target, [], 100, (await time.latest()) + 3600)).to.be.emit(
          singelTokenBuyback,
          'BuybackTokenByV2',
        );
        expect(result.amountOut).to.be.closeTo(ethers.parseEther('100'), ethers.parseEther('0.1'));

        expect(await FENIX.balanceOf(singelTokenBuyback.target)).to.be.eq(balanceBefore + result.amountOut);
        expect(await USDT.balanceOf(singelTokenBuyback.target)).to.be.eq(ZERO);
      });

      it('correct buyback token by direct route from routev2 path volatility provided', async () => {
        let FENIX_USDT_VOLATILITY = await createPairWithObservation(
          signers.deployer,
          USDT,
          FENIX,
          false,
          10000e6,
          ethers.parseEther('20000'),
        );

        await USDT.mint(singelTokenBuyback.target, 100e6);

        let balanceBefore = await FENIX.balanceOf(singelTokenBuyback.target);

        let result = await pathProvider.getOptimalTokenToTokenRoute(USDT.target, FENIX.target, 100e6);

        await expect(singelTokenBuyback.buybackTokenByV2(USDT.target, [], 100, (await time.latest()) + 3600)).to.be.emit(
          singelTokenBuyback,
          'BuybackTokenByV2',
        );
        expect(result.amountOut).to.be.closeTo(ethers.parseEther('200'), ethers.parseEther('1'));
        expect(await FENIX.balanceOf(singelTokenBuyback.target)).to.be.eq(balanceBefore + result.amountOut);
        expect(await USDT.balanceOf(singelTokenBuyback.target)).to.be.eq(ZERO);
      });

      it('correct buyback token by best not direct route', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 200e6);
        let WETH_USDT_STABLE = await createPairWithObservation(signers.deployer, WETH, USDT, true, ethers.parseEther('100'), 100e6);

        let USDT_FENIX_VOLATILITY = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('100'));
        let USDT_FENIX_STABLE = await createPairWithObservation(signers.deployer, USDT, FENIX, true, 100e6, ethers.parseEther('100'));

        let WETH_FENIX_VOLATILITY = await createPairWithObservation(
          signers.deployer,
          WETH,
          FENIX,
          false,
          ethers.parseEther('100'),
          ethers.parseEther('100'),
        );

        let WETH_FENIX_STABEL = await createPairWithObservation(
          signers.deployer,
          WETH,
          FENIX,
          true,
          ethers.parseEther('100'),
          ethers.parseEther('100'),
        );

        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: true });
        await pathProvider.addRouteToToken(FENIX.target, { from: WETH.target, to: FENIX.target, stable: true });
        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: false });
        await pathProvider.addRouteToToken(FENIX.target, { from: WETH.target, to: FENIX.target, stable: false });

        let amountOut = await WETH_USDT_VOLATILITY.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(2e6, 0.1e6);

        amountOut = await USDT_FENIX_STABLE.getAmountOut(amountOut, USDT.target);

        expect(amountOut).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.01'));

        await WETH.mint(singelTokenBuyback.target, ONE_ETHER);
        await USDT.mint(singelTokenBuyback.target, 20e6);

        let balanceBefore = await FENIX.balanceOf(singelTokenBuyback.target);

        let result = await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER);

        await expect(singelTokenBuyback.buybackTokenByV2(WETH.target, [], 100, (await time.latest()) + 3600)).to.be.emit(
          singelTokenBuyback,
          'BuybackTokenByV2',
        );

        expect(result.amountOut).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.1'));

        expect(await FENIX.balanceOf(singelTokenBuyback.target)).to.be.eq(balanceBefore + result.amountOut);
        expect(await FENIX.balanceOf(singelTokenBuyback.target)).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.1'));

        expect(await WETH.balanceOf(singelTokenBuyback.target)).to.be.eq(ZERO);
        expect(await USDT.balanceOf(singelTokenBuyback.target)).to.be.not.eq(ZERO);

        await expect(singelTokenBuyback.buybackTokenByV2(USDT.target, [], 100, (await time.latest()) + 3600)).to.be.emit(
          singelTokenBuyback,
          'BuybackTokenByV2',
        );
        expect(await USDT.balanceOf(singelTokenBuyback.target)).to.be.eq(ZERO);

        expect(await FENIX.balanceOf(singelTokenBuyback.target)).to.be.closeTo(ethers.parseEther('22'), ethers.parseEther('0.1'));
      });
    });
  });
});

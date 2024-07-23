import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  Pair,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  RouterV2PathProviderUpgradeable__factory,
} from '../../typechain-types';
import { ERRORS, ONE_ETHER, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  getSigners,
} from '../utils/coreFixture';

describe('RouterV2PathProviderUpgradeable Contract', function () {
  let signers: SignersList;

  let pathProvider: RouterV2PathProviderUpgradeable;
  let factory: RouterV2PathProviderUpgradeable__factory;
  let pathProviderImpl: RouterV2PathProviderUpgradeable;
  let deployed: CoreFixtureDeployed;

  let routerV2: RouterV2;
  let USDT: ERC20Mock;
  let WETH: ERC20Mock;
  let FENIX: ERC20Mock;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = await getSigners();

    USDT = await deployERC20MockToken(signers.deployer, 'USDT', 'USDT', 6);
    WETH = await deployERC20MockToken(signers.deployer, 'WETH', 'WETH', 18);
    FENIX = await deployERC20MockToken(signers.deployer, 'FENIX', 'FNX', 18);

    factory = await ethers.getContractFactory('RouterV2PathProviderUpgradeable');
    pathProviderImpl = await factory.deploy(signers.deployer.address);

    pathProvider = factory.attach(
      (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await pathProviderImpl.getAddress())).target,
    ) as any as RouterV2PathProviderUpgradeable;

    routerV2 = await ethers.deployContract('RouterV2', [
      signers.blastGovernor.address,
      deployed.v2PairFactory.target,
      WETH_PREDEPLOYED_ADDRESS,
    ]);
    await pathProvider.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target);
  });

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

  describe('Deployment', async () => {
    it('fail if try initialize on implementatrion', async () => {
      await expect(
        pathProviderImpl.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('fail if try initialize second time', async () => {
      await expect(
        pathProviderImpl.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('fail if `factory` is zero address', async () => {
      let newPathProvider = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await pathProviderImpl.getAddress())).target,
      ) as any as RouterV2PathProviderUpgradeable;

      await expect(
        newPathProvider.initialize(signers.blastGovernor.address, ZERO_ADDRESS, deployed.v2PairFactory.target),
      ).to.be.revertedWithCustomError(newPathProvider, 'AddressZero');
    });
    it('fail if `router` is zero address', async () => {
      let newPathProvider = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await pathProviderImpl.getAddress())).target,
      ) as any as RouterV2PathProviderUpgradeable;

      await expect(
        newPathProvider.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(newPathProvider, 'AddressZero');
    });

    it('correct set provided params', async () => {
      expect(await pathProvider.factory()).to.be.eq(deployed.v2PairFactory.target);
      expect(await pathProvider.router()).to.be.eq(routerV2.target);
      expect(await pathProvider.owner()).to.be.eq(signers.deployer.address);
    });
  });

  describe('#setAllowedTokenInInputRouters', async () => {
    it('fail if call from not owner', async () => {
      await expect(pathProvider.connect(signers.otherUser1).setAllowedTokenInInputRouters(USDT.target, true)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
    it('should correct change isAllowedTokenInInputRoutes result', async () => {
      expect(await pathProvider.isAllowedTokenInInputRoutes(WETH.target)).to.be.false;
      expect(await pathProvider.isAllowedTokenInInputRoutes(USDT.target)).to.be.false;
      await pathProvider.setAllowedTokenInInputRouters(USDT.target, true);
      expect(await pathProvider.isAllowedTokenInInputRoutes(USDT.target)).to.be.true;
      expect(await pathProvider.isAllowedTokenInInputRoutes(WETH.target)).to.be.false;
      await pathProvider.setAllowedTokenInInputRouters(USDT.target, false);
      expect(await pathProvider.isAllowedTokenInInputRoutes(USDT.target)).to.be.false;
      expect(await pathProvider.isAllowedTokenInInputRoutes(WETH.target)).to.be.false;
    });
    it('correct change and emit event', async () => {
      expect(await pathProvider.isAllowedTokenInInputRoutes(USDT.target)).to.be.false;
      await expect(pathProvider.setAllowedTokenInInputRouters(USDT.target, false))
        .to.be.emit(pathProvider, 'SetAllowedTokenInInputRouters')
        .withArgs(USDT.target, false);

      expect(await pathProvider.isAllowedTokenInInputRoutes(USDT.target)).to.be.false;
      await expect(pathProvider.setAllowedTokenInInputRouters(USDT.target, true))
        .to.be.emit(pathProvider, 'SetAllowedTokenInInputRouters')
        .withArgs(USDT.target, true);

      expect(await pathProvider.isAllowedTokenInInputRoutes(USDT.target)).to.be.true;
      expect(await pathProvider.isAllowedTokenInInputRoutes(WETH.target)).to.be.false;

      await expect(pathProvider.setAllowedTokenInInputRouters(WETH.target, true))
        .to.be.emit(pathProvider, 'SetAllowedTokenInInputRouters')
        .withArgs(WETH.target, true);
      expect(await pathProvider.isAllowedTokenInInputRoutes(USDT.target)).to.be.true;
      expect(await pathProvider.isAllowedTokenInInputRoutes(WETH.target)).to.be.true;
    });
  });
  describe('#addRouteToToken', async () => {
    it('fail if call from not owner', async () => {
      await expect(
        pathProvider
          .connect(signers.otherUser1)
          .addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });

    it('fail if try add already added route', async () => {
      await pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false });
      await expect(
        pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'RouteAlreadyExist');
    });

    it('fail if try add route with zero from token', async () => {
      await expect(
        pathProvider.addRouteToToken(deployed.fenix.target, { from: ZERO_ADDRESS, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'AddressZero');
    });

    it('fail if try add route with zero` token', async () => {
      await expect(
        pathProvider.addRouteToToken(ZERO_ADDRESS, { from: WETH.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'AddressZero');
    });

    it('fail if try add route with invalid route', async () => {
      await expect(
        pathProvider.addRouteToToken(deployed.fenix.target, { from: deployed.fenix.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'InvalidRoute');
    });

    it('fail if try add route with invalid route', async () => {
      await expect(
        pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: USDT.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'InvalidRoute');
    });

    it('should correct add route to token', async () => {
      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([]);

      await expect(pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false }))
        .to.be.emit(pathProvider, 'AddRouteToToken')
        .withArgs(deployed.fenix.target, [WETH.target, deployed.fenix.target, false]);

      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([[WETH.target, deployed.fenix.target, false]]);

      await expect(pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: true }))
        .to.be.emit(pathProvider, 'AddRouteToToken')
        .withArgs(deployed.fenix.target, [WETH.target, deployed.fenix.target, true]);

      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([
        [WETH.target, deployed.fenix.target, false],
        [WETH.target, deployed.fenix.target, true],
      ]);

      expect(await pathProvider.getTokenRoutes(WETH.target)).to.be.deep.eq([]);

      await expect(pathProvider.addRouteToToken(WETH.target, { from: USDT.target, to: WETH.target, stable: true }))
        .to.be.emit(pathProvider, 'AddRouteToToken')
        .withArgs(WETH.target, [USDT.target, WETH.target, true]);

      expect(await pathProvider.getTokenRoutes(WETH.target)).to.be.deep.eq([[USDT.target, WETH.target, true]]);
      expect(await pathProvider.getTokenRoutes(USDT)).to.be.deep.eq([]);

      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([
        [WETH.target, deployed.fenix.target, false],
        [WETH.target, deployed.fenix.target, true],
      ]);
    });
  });
  describe('#removeRouteFromToken', async () => {
    it('fail if call from not owner', async () => {
      await expect(
        pathProvider
          .connect(signers.otherUser1)
          .removeRouteFromToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });

    it('fail if try remove not exist route', async () => {
      await expect(
        pathProvider.removeRouteFromToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'RouteNotExist');
    });

    it('fail if try remove route with zero from token', async () => {
      await expect(
        pathProvider.removeRouteFromToken(deployed.fenix.target, { from: ZERO_ADDRESS, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'AddressZero');
    });

    it('fail if try remove route with zero` token', async () => {
      await expect(
        pathProvider.removeRouteFromToken(ZERO_ADDRESS, { from: WETH.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'AddressZero');
    });

    it('fail if try remove route with invalid route', async () => {
      await expect(
        pathProvider.removeRouteFromToken(deployed.fenix.target, { from: deployed.fenix.target, to: deployed.fenix.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'InvalidRoute');
    });

    it('fail if try remove route with invalid route', async () => {
      await expect(
        pathProvider.removeRouteFromToken(deployed.fenix.target, { from: WETH.target, to: USDT.target, stable: false }),
      ).to.be.revertedWithCustomError(pathProvider, 'InvalidRoute');
    });

    it('should correct remove route to token', async () => {
      await pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false });
      await pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: true });
      await pathProvider.addRouteToToken(WETH.target, { from: USDT.target, to: WETH.target, stable: true });

      expect(await pathProvider.getTokenRoutes(WETH.target)).to.be.deep.eq([[USDT.target, WETH.target, true]]);
      expect(await pathProvider.getTokenRoutes(USDT)).to.be.deep.eq([]);
      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([
        [WETH.target, deployed.fenix.target, false],
        [WETH.target, deployed.fenix.target, true],
      ]);

      await expect(
        pathProvider.removeRouteFromToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false }),
      )
        .to.be.emit(pathProvider, 'RemoveRouteFromToken')
        .withArgs(deployed.fenix.target, [WETH.target, deployed.fenix.target, false]);

      expect(await pathProvider.getTokenRoutes(WETH.target)).to.be.deep.eq([[USDT.target, WETH.target, true]]);
      expect(await pathProvider.getTokenRoutes(USDT)).to.be.deep.eq([]);
      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([[WETH.target, deployed.fenix.target, true]]);

      await expect(pathProvider.removeRouteFromToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: true }))
        .to.be.emit(pathProvider, 'RemoveRouteFromToken')
        .withArgs(deployed.fenix.target, [WETH.target, deployed.fenix.target, true]);

      expect(await pathProvider.getTokenRoutes(WETH.target)).to.be.deep.eq([[USDT.target, WETH.target, true]]);
      expect(await pathProvider.getTokenRoutes(USDT)).to.be.deep.eq([]);
      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([]);

      await pathProvider.addRouteToToken(deployed.fenix.target, { from: USDT.target, to: deployed.fenix.target, stable: false });

      expect(await pathProvider.getTokenRoutes(WETH.target)).to.be.deep.eq([[USDT.target, WETH.target, true]]);
      expect(await pathProvider.getTokenRoutes(USDT)).to.be.deep.eq([]);
      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([[USDT.target, deployed.fenix.target, false]]);

      await pathProvider.removeRouteFromToken(WETH.target, { from: USDT.target, to: WETH.target, stable: true });
      await pathProvider.removeRouteFromToken(deployed.fenix.target, { from: USDT.target, to: deployed.fenix.target, stable: false });

      expect(await pathProvider.getTokenRoutes(WETH.target)).to.be.deep.eq([]);
      expect(await pathProvider.getTokenRoutes(USDT)).to.be.deep.eq([]);
      expect(await pathProvider.getTokenRoutes(deployed.fenix.target)).to.be.deep.eq([]);
    });
  });
  describe('#isValidInputRoutes', async () => {
    it('return false if in routers chain present not allowed tokens', async () => {
      await pathProvider.setAllowedTokenInInputRouters(USDT.target, true);
      await pathProvider.setAllowedTokenInInputRouters(WETH.target, true);
      await pathProvider.setAllowedTokenInInputRouters(deployed.fenix.target, true);

      expect(
        await pathProvider.isValidInputRoutes([
          { from: USDT.target, to: WETH.target, stable: true },
          { from: WETH.target, to: deployed.fenix.target, stable: true },
          { from: deployed.fenix.target, to: USDT.target, stable: true },
        ]),
      ).to.be.true;

      await pathProvider.setAllowedTokenInInputRouters(WETH.target, false);
      expect(
        await pathProvider.isValidInputRoutes([
          { from: USDT.target, to: WETH.target, stable: true },
          { from: WETH.target, to: deployed.fenix.target, stable: true },
          { from: deployed.fenix.target, to: USDT.target, stable: true },
        ]),
      ).to.be.false;

      expect(
        await pathProvider.isValidInputRoutes([
          { from: USDT.target, to: WETH.target, stable: true },
          { from: USDT.target, to: deployed.fenix.target, stable: true },
          { from: deployed.fenix.target, to: USDT.target, stable: true },
        ]),
      ).to.be.true;
    });

    it('return true if in routers chain (from token) present only allowed tokens', async () => {
      expect(await pathProvider.isValidInputRoutes([{ from: USDT.target, to: WETH.target, stable: true }])).to.be.false;
      await pathProvider.setAllowedTokenInInputRouters(USDT.target, true);

      expect(await pathProvider.isValidInputRoutes([{ from: USDT.target, to: WETH.target, stable: true }])).to.be.true;
      expect(await pathProvider.isValidInputRoutes([{ from: WETH.target, to: USDT.target, stable: true }])).to.be.false;

      expect(
        await pathProvider.isValidInputRoutes([
          { from: WETH.target, to: USDT.target, stable: true },
          { from: USDT.target, to: deployed.fenix.target, stable: false },
        ]),
      ).to.be.false;

      await pathProvider.setAllowedTokenInInputRouters(WETH.target, true);

      expect(
        await pathProvider.isValidInputRoutes([
          { from: WETH.target, to: USDT.target, stable: true },
          { from: USDT.target, to: deployed.fenix.target, stable: false },
        ]),
      ).to.be.true;
    });

    it('return true if provide zero routes chain', async () => {
      expect(await pathProvider.isValidInputRoutes([])).to.be.true;
    });
  });
  describe('#getRoutesTokenToToken', async () => {
    it('should return empty array if token havent any routes', async () => {
      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([]);
    });

    it('should return array with two router for one route for token', async () => {
      await pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false });
      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [USDT.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, false],
        ],
        [
          [USDT.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, false],
        ],
      ]);
    });

    it('should return correct array route', async () => {
      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([]);
      expect(await pathProvider.getRoutesTokenToToken(WETH.target, deployed.fenix.target)).to.be.deep.eq([]);
      expect(await pathProvider.getRoutesTokenToToken(deployed.fenix.target, deployed.fenix.target)).to.be.deep.eq([]);

      await pathProvider.addRouteToToken(deployed.fenix.target, {
        from: signers.blastGovernor.address,
        to: deployed.fenix.target,
        stable: false,
      });

      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [USDT.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [USDT.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
      ]);

      expect(await pathProvider.getRoutesTokenToToken(WETH.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [WETH.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [WETH.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
      ]);
      expect(await pathProvider.getRoutesTokenToToken(deployed.fenix.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [deployed.fenix.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [deployed.fenix.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
      ]);

      await pathProvider.addRouteToToken(deployed.fenix.target, {
        from: WETH.target,
        to: deployed.fenix.target,
        stable: true,
      });

      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [USDT.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [USDT.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [USDT.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, true],
        ],
        [
          [USDT.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, true],
        ],
      ]);

      expect(await pathProvider.getRoutesTokenToToken(WETH.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [WETH.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [WETH.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
      ]);
      expect(await pathProvider.getRoutesTokenToToken(deployed.fenix.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [deployed.fenix.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [deployed.fenix.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [deployed.fenix.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, true],
        ],
        [
          [deployed.fenix.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, true],
        ],
      ]);
    });
    it('should return correct array route for diff settings', async () => {
      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([]);

      await pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: false });

      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [USDT.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, false],
        ],
        [
          [USDT.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, false],
        ],
      ]);

      await pathProvider.addRouteToToken(deployed.fenix.target, { from: WETH.target, to: deployed.fenix.target, stable: true });

      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [USDT.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, false],
        ],
        [
          [USDT.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, false],
        ],
        [
          [USDT.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, true],
        ],
        [
          [USDT.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, true],
        ],
      ]);

      await pathProvider.addRouteToToken(deployed.fenix.target, {
        from: signers.blastGovernor.address,
        to: deployed.fenix.target,
        stable: false,
      });

      expect(await pathProvider.getRoutesTokenToToken(USDT.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [USDT.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, false],
        ],
        [
          [USDT.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, false],
        ],
        [
          [USDT.target, WETH.target, true],
          [WETH.target, deployed.fenix.target, true],
        ],
        [
          [USDT.target, WETH.target, false],
          [WETH.target, deployed.fenix.target, true],
        ],
        [
          [USDT.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [USDT.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
      ]);
      expect(await pathProvider.getRoutesTokenToToken(WETH.target, deployed.fenix.target)).to.be.deep.eq([
        [
          [WETH.target, signers.blastGovernor.address, true],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
        [
          [WETH.target, signers.blastGovernor.address, false],
          [signers.blastGovernor.address, deployed.fenix.target, false],
        ],
      ]);

      expect(await pathProvider.getRoutesTokenToToken(deployed.fenix.target, USDT.target)).to.be.deep.eq([]);
      expect(await pathProvider.getRoutesTokenToToken(deployed.fenix.target, WETH.target)).to.be.deep.eq([]);
      expect(await pathProvider.getRoutesTokenToToken(WETH.target, USDT.target)).to.be.deep.eq([]);
      expect(await pathProvider.getRoutesTokenToToken(USDT.target, WETH.target)).to.be.deep.eq([]);
    });
  });
  describe('#getOptimalTokenToTokenRoute', async () => {
    it('if not exists any route, return empty and zero', async () => {
      expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, ethers.parseEther('1'))).to.be.deep.eq([
        [],
        0,
      ]);
    });

    it('if exist only volatility route, should return volatility route and amount out', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, false);

      let pair = await ethers.getContractAt('Pair', await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, false));

      await USDT.mint(pair.target, ethers.parseEther('100'));

      await deployed.fenix.transfer(pair.target, ethers.parseEther('100'));

      await pair.mint(signers.deployer.address);

      let amountOut = await pair.getAmountOut(ethers.parseEther('1'), USDT.target);

      expect(amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.03'));

      expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, ethers.parseEther('1'))).to.be.deep.eq([
        [[USDT.target, deployed.fenix.target, false]],
        amountOut,
      ]);
    });

    it('if exist only volatility route, and fail amount out should return zero', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, false);

      expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, ethers.parseEther('1'))).to.be.deep.eq([
        [],
        0,
      ]);
    });

    it('if exist only stable route, should return stable route and amount out', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, true);

      let pair = await ethers.getContractAt('Pair', await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, true));

      await USDT.mint(pair.target, 100e6);

      await deployed.fenix.transfer(pair.target, ethers.parseEther('100'));

      await pair.mint(signers.deployer.address);

      let amountOut = await pair.getAmountOut(1e6, USDT.target);

      expect(amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.01'));

      expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, 1e6)).to.be.deep.eq([
        [[USDT.target, deployed.fenix.target, true]],
        amountOut,
      ]);
    });

    it('if exist only stable route, and fail amount out should return zero', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, true);

      expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, ethers.parseEther('1'))).to.be.deep.eq([
        [],
        0,
      ]);
    });

    it('if exist volatility and stable route, and fail amount both out should return zero', async () => {
      await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, false);
      await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, true);

      expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, ethers.parseEther('1'))).to.be.deep.eq([
        [],
        0,
      ]);
    });
    describe('only with route', async () => {
      it('should return route if singel', async () => {
        let pairFirst = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);

        let pairSecond = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('200'));

        let amountOutStable = await pairFirst.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOutStable).to.be.closeTo(1e6, 0.01e6);

        amountOutStable = await pairSecond.getAmountOut(amountOutStable, USDT.target);
        expect(amountOutStable).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.02'));

        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([]);
        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: false });
        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([[USDT.target, FENIX.target, false]]);

        expect(await pathProvider.getRoutesTokenToToken(WETH.target, FENIX.target)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, false],
          ],
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, false],
          ],
        ]);

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, false],
          ],
          amountOutStable,
        ]);
      });
      it('should return best route', async () => {
        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([]);
        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: false });
        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: true });

        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([
          [USDT.target, FENIX.target, false],
          [USDT.target, FENIX.target, true],
        ]);

        expect(await pathProvider.getRoutesTokenToToken(WETH.target, FENIX.target)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, false],
          ],
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, false],
          ],
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, true],
          ],
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, true],
          ],
        ]);

        let pairFirst = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);
        let pairSecondStabel = await createPairWithObservation(signers.deployer, USDT, FENIX, true, 100e6, ethers.parseEther('100'));
        let pairSecond = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('99'));

        let amountOutStable = await pairFirst.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOutStable).to.be.closeTo(1e6, 0.01e6);

        let amountOut = await pairSecondStabel.getAmountOut(amountOutStable, USDT.target);

        expect(await pairSecond.getAmountOut(amountOutStable, USDT.target)).to.be.lessThan(amountOut);

        expect(amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.01'));

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, true],
          ],
          amountOut,
        ]);
      });
      it('#2 should return best route', async () => {
        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([]);
        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: false });
        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: true });

        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([
          [USDT.target, FENIX.target, false],
          [USDT.target, FENIX.target, true],
        ]);

        expect(await pathProvider.getRoutesTokenToToken(WETH.target, FENIX.target)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, false],
          ],
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, false],
          ],
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, true],
          ],
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, true],
          ],
        ]);

        let pairFirst = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);
        let pairSecondStabel = await createPairWithObservation(signers.deployer, USDT, FENIX, true, 100e6, ethers.parseEther('100'));
        let pairSecond = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('200'));

        let amountOutStable = await pairFirst.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOutStable).to.be.closeTo(1e6, 0.01e6);

        let amountOut = await pairSecond.getAmountOut(amountOutStable, USDT.target);

        expect(await pairSecondStabel.getAmountOut(amountOutStable, USDT.target)).to.be.lessThan(amountOut);

        expect(amountOut).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.2'));

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, false],
          ],
          amountOut,
        ]);
      });
    });
    describe('stable vs volatility', async () => {
      it('should return stable route if better then volaitlity', async () => {
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, true);
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, false);

        let stablePair = await ethers.getContractAt('Pair', await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, true));
        let volatilityPair = await ethers.getContractAt(
          'Pair',
          await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, false),
        );

        await USDT.mint(stablePair.target, 100e6);
        await USDT.mint(volatilityPair.target, 100e6);

        await deployed.fenix.transfer(stablePair.target, ethers.parseEther('100'));
        await deployed.fenix.transfer(volatilityPair.target, ethers.parseEther('100'));

        await stablePair.mint(signers.deployer.address);
        await volatilityPair.mint(signers.deployer.address);

        let amountOutStable = await stablePair.getAmountOut(1e6, USDT.target);

        expect(amountOutStable).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.01'));

        expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, 1e6)).to.be.deep.eq([
          [[USDT.target, deployed.fenix.target, true]],
          amountOutStable,
        ]);
      });

      it('should return volatility route if better then stable', async () => {
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, true);
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, false);

        let stablePair = await ethers.getContractAt('Pair', await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, true));
        let volatilityPair = await ethers.getContractAt(
          'Pair',
          await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, false),
        );

        await USDT.mint(stablePair.target, 100e6);
        await USDT.mint(volatilityPair.target, 10e6);

        await deployed.fenix.transfer(stablePair.target, ethers.parseEther('100'));
        await deployed.fenix.transfer(volatilityPair.target, ethers.parseEther('100'));

        await stablePair.mint(signers.deployer.address);
        await volatilityPair.mint(signers.deployer.address);

        let amountOutVolatility = await volatilityPair.getAmountOut(1e6, USDT.target);

        expect(amountOutVolatility).to.be.closeTo(ethers.parseEther('10'), ethers.parseEther('1'));

        expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, 1e6)).to.be.deep.eq([
          [[USDT.target, deployed.fenix.target, false]],
          amountOutVolatility,
        ]);
      });

      it('should return volatility route if stable failed', async () => {
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, true);
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, false);

        let volatilityPair = await ethers.getContractAt(
          'Pair',
          await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, false),
        );

        await USDT.mint(volatilityPair.target, 100e6);

        await deployed.fenix.transfer(volatilityPair.target, ethers.parseEther('100'));

        await volatilityPair.mint(signers.deployer.address);

        let amountOutVolatility = await volatilityPair.getAmountOut(1e6, USDT.target);

        expect(amountOutVolatility).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.1'));

        expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, 1e6)).to.be.deep.eq([
          [[USDT.target, deployed.fenix.target, false]],
          amountOutVolatility,
        ]);
      });
      it('should return stable route if volatility failed', async () => {
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, true);
        await deployed.v2PairFactory.createPair(USDT.target, deployed.fenix.target, false);

        let stablePair = await ethers.getContractAt('Pair', await deployed.v2PairFactory.getPair(USDT.target, deployed.fenix.target, true));

        await USDT.mint(stablePair.target, 100e6);

        await deployed.fenix.transfer(stablePair.target, ethers.parseEther('100'));

        await stablePair.mint(signers.deployer.address);

        let amountOutStable = await stablePair.getAmountOut(1e6, USDT.target);

        expect(amountOutStable).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.01'));

        expect(await pathProvider.getOptimalTokenToTokenRoute(USDT.target, deployed.fenix.target, 1e6)).to.be.deep.eq([
          [[USDT.target, deployed.fenix.target, true]],
          amountOutStable,
        ]);
      });
    });
    describe('stable & volatility & routes', async () => {
      it('all the same out, return dirrect volatility', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);
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

        let amountOut = await WETH_FENIX_VOLATILITY.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.01'));

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [[WETH.target, FENIX.target, false]],
          amountOut,
        ]);

        await pathProvider.addRouteToToken(FENIX.target, { from: WETH.target, to: FENIX.target, stable: false });

        expect(await pathProvider.getRoutesTokenToToken(WETH.target, FENIX.target)).to.be.deep.eq([]);
        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([[WETH.target, FENIX.target, false]]);
        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [[WETH.target, FENIX.target, false]],
          amountOut,
        ]);

        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: false });

        expect(await pathProvider.getRoutesTokenToToken(WETH.target, FENIX.target)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, false],
          ],
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, false],
          ],
        ]);
        expect(await pathProvider.getTokenRoutes(FENIX.target)).to.be.deep.eq([
          [WETH.target, FENIX.target, false],
          [USDT.target, FENIX.target, false],
        ]);
        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX, ONE_ETHER)).to.be.deep.eq([
          [[WETH.target, FENIX.target, false]],
          amountOut,
        ]);
      });
      it('return correct route #1', async () => {
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

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, true],
          ],
          amountOut,
        ]);
      });
      it('return correct route #2', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 200e6);
        let WETH_USDT_STABLE = await createPairWithObservation(signers.deployer, WETH, USDT, true, ethers.parseEther('100'), 100e6);

        let USDT_FENIX_VOLATILITY = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('200'));
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

        amountOut = await USDT_FENIX_VOLATILITY.getAmountOut(amountOut, USDT.target);

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, false],
            [USDT.target, FENIX.target, false],
          ],
          amountOut,
        ]);
      });
      it('return correct route #3', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);
        let WETH_USDT_STABLE = await createPairWithObservation(signers.deployer, WETH, USDT, true, ethers.parseEther('100'), 100e6);

        let USDT_FENIX_VOLATILITY = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('200'));
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

        let amountOut = await WETH_USDT_STABLE.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(1e6, 0.1e6);

        amountOut = await USDT_FENIX_VOLATILITY.getAmountOut(amountOut, USDT.target);

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, false],
          ],
          amountOut,
        ]);
      });
      it('return correct route #4', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);
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
          ethers.parseEther('1'),
          ethers.parseEther('1'),
        );

        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: true });
        await pathProvider.addRouteToToken(FENIX.target, { from: WETH.target, to: FENIX.target, stable: true });
        await pathProvider.addRouteToToken(FENIX.target, { from: USDT.target, to: FENIX.target, stable: false });
        await pathProvider.addRouteToToken(FENIX.target, { from: WETH.target, to: FENIX.target, stable: false });

        let amountOut = await WETH_USDT_STABLE.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(1e6, 0.1e6);

        amountOut = await USDT_FENIX_STABLE.getAmountOut(amountOut, USDT.target);

        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [
            [WETH.target, USDT.target, true],
            [USDT.target, FENIX.target, true],
          ],
          amountOut,
        ]);
      });
      it('return correct route #5', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);
        let WETH_USDT_STABLE = await createPairWithObservation(signers.deployer, WETH, USDT, true, ethers.parseEther('100'), 100e6);

        let USDT_FENIX_VOLATILITY = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 100e6, ethers.parseEther('100'));
        let USDT_FENIX_STABLE = await createPairWithObservation(signers.deployer, USDT, FENIX, true, 100e6, ethers.parseEther('100'));

        let WETH_FENIX_VOLATILITY = await createPairWithObservation(
          signers.deployer,
          WETH,
          FENIX,
          false,
          ethers.parseEther('100'),
          ethers.parseEther('200'),
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

        let amountOut = await WETH_FENIX_VOLATILITY.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.2'));
        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [[WETH.target, FENIX.target, false]],
          amountOut,
        ]);
      });
      it('return correct route #6', async () => {
        let WETH_USDT_VOLATILITY = await createPairWithObservation(signers.deployer, WETH, USDT, false, ethers.parseEther('100'), 100e6);
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

        let amountOut = await WETH_FENIX_STABEL.getAmountOut(ONE_ETHER, WETH.target);
        expect(amountOut).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.01'));
        expect(await pathProvider.getOptimalTokenToTokenRoute(WETH.target, FENIX.target, ONE_ETHER)).to.be.deep.eq([
          [[WETH.target, FENIX.target, true]],
          amountOut,
        ]);
      });
    });
  });
  describe('#getAmountOutQuote', async () => {
    it('should revert if chain have zero length', async () => {
      await expect(pathProvider.getAmountOutQuote(ethers.parseEther('1'), [])).to.be.revertedWithCustomError(pathProvider, 'InvalidPath');
    });

    it('should revert if chain have break', async () => {
      await deployed.v2PairFactory.createPair(WETH.target, USDT.target, false);
      let pair = await ethers.getContractAt('Pair', await deployed.v2PairFactory.getPair(USDT.target, WETH.target, false));
      await WETH.mint(pair.target, ethers.parseEther('100'));
      await USDT.mint(pair.target, ethers.parseEther('100'));
      await pair.mint(signers.deployer.address);

      await expect(
        pathProvider.getAmountOutQuote(ethers.parseEther('1'), [
          { from: WETH.target, to: USDT.target, stable: false },
          { from: WETH.target, to: deployed.fenix.target, stable: false },
        ]),
      ).to.revertedWithCustomError(pathProvider, 'InvalidPath');
    });

    it('should revert if use not initialzie pair (without observation window)', async () => {
      await deployed.v2PairFactory.createPair(WETH.target, USDT.target, false);

      await expect(
        pathProvider.getAmountOutQuote(ethers.parseEther('1'), [{ from: WETH.target, to: USDT.target, stable: false }]),
      ).to.be.revertedWithPanic(0x11);
    });

    it('should return zero if one pair from chain not exist', async () => {
      await createPairWithObservation(signers.deployer, WETH, USDT, false, ONE_ETHER, 1e6);
      await createPairWithObservation(signers.deployer, WETH, FENIX, true, ONE_ETHER, ONE_ETHER);

      expect(
        await pathProvider.getAmountOutQuote(ethers.parseEther('1'), [
          { from: WETH.target, to: USDT.target, stable: false },
          { from: USDT.target, to: FENIX.target, stable: true },
          { from: FENIX.target, to: WETH.target, stable: false },
        ]),
      ).to.be.eq(ZERO);

      expect(
        await pathProvider.getAmountOutQuote(ethers.parseEther('1'), [
          { from: WETH.target, to: USDT.target, stable: false },
          { from: USDT.target, to: WETH.target, stable: false },
        ]),
      ).to.be.not.eq(ZERO);
    });

    it('should return correct amoutn base on quote for singel chain', async () => {
      let pair = await createPairWithObservation(signers.deployer, WETH, FENIX, true, ethers.parseEther('33'), ethers.parseEther('33'));
      let outAmount = await pair.quote(WETH.target, ethers.parseEther('1'), 3);
      expect(outAmount).to.be.closeTo(ONE_ETHER, ethers.parseEther('0.001'));
      expect(
        await pathProvider.getAmountOutQuote(ethers.parseEther('1'), [{ from: WETH.target, to: FENIX.target, stable: true }]),
      ).to.be.eq(outAmount);
    });
    it('should return correct amoutn base on quote for chain with more then one element', async () => {
      let pair = await createPairWithObservation(signers.deployer, WETH, USDT, true, ethers.parseEther('33'), 33e6);
      let pairSecond = await createPairWithObservation(signers.deployer, USDT, FENIX, false, 33e6, ethers.parseEther('66'));

      let outAmount = await pair.quote(WETH.target, ethers.parseEther('1'), 3);
      expect(outAmount).to.be.closeTo(1e6, 0.01e6);

      outAmount = await pairSecond.quote(USDT.target, outAmount, 3);
      expect(outAmount).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.05'));
      expect(
        await pathProvider.getAmountOutQuote(ethers.parseEther('1'), [
          { from: WETH.target, to: USDT.target, stable: true },
          { from: USDT.target, to: FENIX.target, stable: false },
        ]),
      ).to.be.eq(outAmount);
    });
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, Pair, PairFactoryUpgradeable, RouterV2, UniswapV2PartialRouter } from '../../typechain-types';
import { WETH_PREDEPLOYED_ADDRESS, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';

describe('Pair Contract', function () {
  let signers: SignersList;
  let pairFactory: PairFactoryUpgradeable;
  let deployed: CoreFixtureDeployed;
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let pairStable: Pair;
  let pairVolatily: Pair;
  let router: UniswapV2PartialRouter;
  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;

    pairFactory = deployed.v2PairFactory;

    router = await ethers.deployContract('UniswapV2PartialRouter', [
      signers.deployer.address,
      pairFactory.target,
      WETH_PREDEPLOYED_ADDRESS,
    ]);

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK6.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
  });

  describe('correct initialize contract', async () => {
    it('factory', async () => {
      expect(await router.factory()).to.be.eq(pairFactory.target);
    });
    it('WETH', async () => {
      expect(await router.WETH()).to.be.eq(WETH_PREDEPLOYED_ADDRESS);
    });
    it('wETH', async () => {
      expect(await router.wETH()).to.be.eq(WETH_PREDEPLOYED_ADDRESS);
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
      expect(await router.pathsToVolatilityRoutes([tokenTK18.target, tokenTK6.target, WETH_PREDEPLOYED_ADDRESS])).to.be.deep.eq([
        [tokenTK18.target, tokenTK6.target, false],
        [tokenTK6.target, WETH_PREDEPLOYED_ADDRESS, false],
      ]);
    });
  });
});

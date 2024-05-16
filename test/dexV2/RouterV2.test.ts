import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, Pair, PairFactoryUpgradeable, RouterV2 } from '../../typechain-types';
import { WETH_PREDEPLOYED_ADDRESS, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';

describe('RouterV2 Contract', function () {
  let signers: SignersList;
  let pairFactory: PairFactoryUpgradeable;
  let deployed: CoreFixtureDeployed;
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let pairStable: Pair;
  let pairVolatily: Pair;
  let router: RouterV2;
  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    const modeSfs = await ethers.deployContract('ModeSfsMock');
    const modeSfsAddress = await modeSfs.getAddress();
    const sfsAssignTokenId = 1;

    pairFactory = deployed.v2PairFactory;

    router = await ethers.deployContract('RouterV2', [modeSfsAddress, sfsAssignTokenId, pairFactory.target, WETH_PREDEPLOYED_ADDRESS]);

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.solex.target, tokenTK6.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
  });
  describe('RouterV2 pairFor should always return the same precompiled address', async () => {
    it('tokenTK18.target, tokenTK6.target, true', async () => {
      expect(await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true)).to.be.eq(ZERO_ADDRESS);
      let fromRouter = await router.pairFor(tokenTK18.target, tokenTK6.target, true);
      let factAddress = await pairFactory.createPair.staticCall(tokenTK18.target, tokenTK6.target, true);
      await pairFactory.createPair(tokenTK18.target, tokenTK6.target, true);

      expect(fromRouter).to.be.eq(factAddress);
      expect(await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true)).to.be.not.eq(ZERO_ADDRESS);
      expect(await pairFactory.getPair(tokenTK6.target, tokenTK18.target, true)).to.be.eq(factAddress);
      expect(await pairFactory.getPair(tokenTK6.target, tokenTK18.target, true)).to.be.eq(fromRouter);
    });
    it('fenix.target, tokenTK6.target, false', async () => {
      expect(await pairFactory.getPair(deployed.solex.target, tokenTK6.target, false)).to.be.eq(ZERO_ADDRESS);
      let fromRouter = await router.pairFor(deployed.solex.target, tokenTK6.target, false);
      let factAddress = await pairFactory.createPair.staticCall(deployed.solex.target, tokenTK6.target, false);
      await pairFactory.createPair(deployed.solex.target, tokenTK6.target, false);

      expect(fromRouter).to.be.eq(factAddress);
      expect(await pairFactory.getPair(deployed.solex.target, tokenTK6.target, false)).to.be.not.eq(ZERO_ADDRESS);
      expect(await pairFactory.getPair(tokenTK6.target, deployed.solex.target, false)).to.be.eq(factAddress);
      expect(await pairFactory.getPair(tokenTK6.target, deployed.solex.target, false)).to.be.eq(fromRouter);
    });
  });
});

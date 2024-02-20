import { expect } from 'chai';
import { ethers } from 'hardhat';
import { FeesVaultFactory, PairFactoryUpgradeable__factory, PairFactoryUpgradeable, ERC20Mock, Pair } from '../../typechain-types';
import { ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../utils/coreFixture';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

const PRECISION = 10000;
describe('PairFactoryUpgradeable Contract', function () {
  let signers: SignersList;
  let pairFactoryFactory: PairFactoryUpgradeable__factory;
  let pairFactory: PairFactoryUpgradeable;
  let feesVaultFactory: FeesVaultFactory;
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

    await feesVaultFactory.setWhitelistedCreatorStatus(pairFactory.target, true);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK6.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
    pairStable = await ethers.getContractAt('Pair', await pairFactory.getPair(deployed.fenix.target, tokenTK6.target, true));
    pairVolatily = await ethers.getContractAt('Pair', await pairFactory.getPair(tokenTK18.target, tokenTK6.target, false));

    await deployed.fenix.transfer(pairStable.target, ethers.parseEther('10000'));
    await tokenTK6.mint(pairStable.target, ethers.parseEther('10000'));
    await pairStable.mint(signers.deployer.address);
  });

  describe('swaps fees corect calculate and transfer to feesVault', async () => {
    it('case', async () => {
      expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.eq(ZERO);
      if ((await pairVolatily.token0()) == tokenTK18.target) {
        await tokenTK18.mint(pairVolatily.target, ONE_ETHER);
      } else {
        await tokenTK6.mint(pairVolatily.target, ONE_ETHER);
      }
      await pairVolatily.swap(0, 1, signers.deployer.address, '0x');

      expect(await tokenTK18.balanceOf(await pairVolatily.communityVault())).to.be.not.eq(ZERO);
    });
  });

  describe('#setCommunityVault', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).setCommunityVault(signers.otherUser1)).to.be.revertedWith('ACCESS_DENIED');
    });
    it('should corect set new community vault', async () => {});
  });
  describe('#setCommunityVault', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).setCommunityVault(signers.otherUser1)).to.be.revertedWith('ACCESS_DENIED');
    });
  });

  describe('#claim', async () => {
    it('fails if caller is not factory', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).claim(tokenTK18.target, signers.otherUser1.address, 1)).to.be.revertedWith(
        'ACCESS_DENIED',
      );
    });
  });

  describe('#configure', async () => {
    it('fails if caller is not factory', async () => {
      await expect(pairVolatily.connect(signers.otherUser1).configure(tokenTK18.target, 1)).to.be.revertedWith('ACCESS_DENIED');
    });
  });
});

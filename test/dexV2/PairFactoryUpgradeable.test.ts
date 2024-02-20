import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  FeesVaultFactory,
  FeesVaultFactory__factory,
  FeesVaultUpgradeable,
  BlastMock,
  IBlastMock,
  PairFactoryUpgradeable__factory,
  PairFactoryUpgradeable,
  Pair,
  ERC20Mock,
  Pair__factory,
} from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ONE, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  deployV2PairFactory,
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
  let poolAddress: string;
  let poolAddress2: string;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;

    pairFactoryFactory = await ethers.getContractFactory('PairFactoryUpgradeable');
    pairFactory = deployed.v2PairFactory;
    feesVaultFactory = deployed.feesVaultFactory;

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

    await feesVaultFactory.setWhitelistedCreatorStatus(pairFactory.target, true);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, true);
    poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);
    poolAddress2 = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, false);
  });

  describe('Deployments', async () => {
    it('have MAX_FEE', async () => {
      expect(await pairFactory.MAX_FEE()).to.be.eq(25);
    });
    it('should correct set initial paused', async () => {
      expect(await pairFactory.isPaused()).to.be.false;
    });
    it('should correct set initial fees settings', async () => {
      expect(await pairFactory.stableFee()).to.be.eq(4);
      expect(await pairFactory.volatileFee()).to.be.eq(18);
      expect(await pairFactory.protocolFee()).to.be.eq(10000);
    });
    it('should correct set defaultBlastGovernor', async () => {
      expect(await pairFactory.defaultBlastGovernor()).to.be.eq(signers.blastGovernor.address);
    });
    it('should correct set deployer as owner in contract', async () => {
      expect(await pairFactory.owner()).to.be.eq(signers.deployer.address);
    });
    it('fails if try initialize on implementations', async () => {
      let newFactory = await pairFactoryFactory.connect(signers.deployer).deploy();
      await expect(newFactory.initialize(ZERO_ADDRESS, feesVaultFactory.target)).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fails if try initialize second time', async () => {
      await expect(pairFactory.initialize(signers.blastGovernor.address, feesVaultFactory.target)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('fails if provide zero governor address', async () => {
      const implementation = await pairFactoryFactory.deploy();
      const proxy = await deployTransaperntUpgradeableProxy(
        signers.deployer,
        signers.proxyAdmin.address,
        await implementation.getAddress(),
      );
      const attached = pairFactoryFactory.attach(proxy.target) as any as PairFactoryUpgradeable;

      await expect(attached.initialize(ZERO_ADDRESS, feesVaultFactory.target)).to.be.revertedWithCustomError(
        pairFactoryFactory,
        'AddressZero',
      );
    });
  });
  describe('#setPause', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setPause(true)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
    it('should corect set pause state from owner and emit events', async () => {
      expect(await pairFactory.isPaused()).to.be.false;
      await pairFactory.setPause(true);
      expect(await pairFactory.isPaused()).to.be.true;
      await pairFactory.setPause(false);
      expect(await pairFactory.isPaused()).to.be.false;
    });
  });
  describe('#getHookTarget', async () => {
    it('mock, always return zero address', async () => {
      expect(await pairFactory.getHookTarget(signers.otherUser1.address)).to.be.eq(ZERO_ADDRESS);
      expect(await pairFactory.getHookTarget(poolAddress)).to.be.eq(ZERO_ADDRESS);
      expect(await pairFactory.getHookTarget(poolAddress2)).to.be.eq(ZERO_ADDRESS);
    });
  });
  describe('#getFee', async () => {
    it('return default fee if custom not set', async () => {
      expect(await pairFactory.getFee(poolAddress, true)).to.be.eq(4);
      expect(await pairFactory.getFee(poolAddress, false)).to.be.eq(18);
      await pairFactory.setCustomFee(poolAddress, 1);
      expect(await pairFactory.getFee(poolAddress, true)).to.be.eq(1);
      expect(await pairFactory.getFee(poolAddress, false)).to.be.eq(1);
    });
  });
  describe('#getProtocolFee', async () => {
    it('return default protocol fee if custom not set', async () => {
      expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(PRECISION);
      await pairFactory.setCustomProtocolFee(poolAddress, 5);
      expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(5);
    });
  });
  describe('Fees', async () => {
    describe('#setProtocolFee', async () => {
      it('fails if caller is not factory owner', async () => {
        await expect(pairFactory.connect(signers.otherUser1).setProtocolFee(0)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('fails if try set protocol fee > 100%', async () => {
        await expect(pairFactory.setProtocolFee(PRECISION + 1)).to.be.reverted;
        await expect(pairFactory.setProtocolFee(PRECISION)).to.not.be.reverted;
      });
      it('should corect set protocol fee and emit event', async () => {
        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        await pairFactory.setProtocolFee(123);
        expect(await pairFactory.protocolFee()).to.be.eq(123);
        await pairFactory.setProtocolFee(0);
        expect(await pairFactory.protocolFee()).to.be.eq(0);
      });
    });
    describe('#setFee', async () => {
      it('fails if caller is not factory owner', async () => {
        await expect(pairFactory.connect(signers.otherUser1).setFee(false, 1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(pairFactory.connect(signers.otherUser1).setFee(true, 1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('fails if try set protocol fee > MAX_FEE% or fee == 0', async () => {
        await expect(pairFactory.setFee(false, 26)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
        await expect(pairFactory.setFee(false, 0)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
        await expect(pairFactory.setFee(true, 26)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
        await expect(pairFactory.setFee(true, 0)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
      });
      it('should corect set fee for stable pairs', async () => {
        expect(await pairFactory.stableFee()).to.be.eq(4);
        await pairFactory.setFee(true, 1);
        expect(await pairFactory.stableFee()).to.be.eq(1);
        await pairFactory.setFee(true, 25);
        expect(await pairFactory.stableFee()).to.be.eq(25);
        await pairFactory.setFee(true, 11);
        expect(await pairFactory.stableFee()).to.be.eq(11);
      });
      it('should corect set fee for volatily pair', async () => {
        expect(await pairFactory.volatileFee()).to.be.eq(18);
        await pairFactory.setFee(false, 1);
        expect(await pairFactory.volatileFee()).to.be.eq(1);
        await pairFactory.setFee(false, 25);
        expect(await pairFactory.volatileFee()).to.be.eq(25);
        await pairFactory.setFee(false, 11);
        expect(await pairFactory.volatileFee()).to.be.eq(11);
      });
    });
    describe('#setCustomProtocolFee', async () => {
      it('fails if caller is not factory owner', async () => {
        let poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);

        await expect(pairFactory.connect(signers.otherUser1).setCustomProtocolFee(poolAddress, 0)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('fails if try set fee for not pair address', async () => {
        await expect(pairFactory.setCustomProtocolFee(signers.deployer.address, 0)).to.be.revertedWithCustomError(
          pairFactory,
          'IncorrectPair',
        );
      });
      it('fails if try set custom protocol fee > 100%', async () => {
        let poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);
        await expect(pairFactory.setCustomProtocolFee(poolAddress, PRECISION + 1)).to.be.reverted;
        await expect(pairFactory.setCustomProtocolFee(poolAddress, PRECISION)).to.not.be.reverted;
      });
      it('should corect set custom protocol fee for pair', async () => {
        let poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);
        let poolAddress2 = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, false);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress2)).to.be.eq(PRECISION);

        await pairFactory.setCustomProtocolFee(poolAddress, 123);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(123);
        expect(await pairFactory.getProtocolFee(poolAddress2)).to.be.eq(PRECISION);

        await pairFactory.setCustomProtocolFee(poolAddress2, 555);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(123);
        expect(await pairFactory.getProtocolFee(poolAddress2)).to.be.eq(555);

        await pairFactory.setCustomProtocolFee(poolAddress, 1);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(1);
        expect(await pairFactory.getProtocolFee(poolAddress2)).to.be.eq(555);
      });
      it('should return current protocol fee if set custom protocol fee to zero', async () => {
        let poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(PRECISION);

        await pairFactory.setCustomProtocolFee(poolAddress, 123);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(123);

        await pairFactory.setCustomProtocolFee(poolAddress, 0);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(PRECISION);
      });
    });
  });
  describe('#setCommunityVaultFactory', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setCommunityVaultFactory(signers.otherUser1.address)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
    it('should correct change community vault factory', async () => {
      expect(await pairFactory.communityVaultFactory()).to.be.eq(feesVaultFactory.target);
      await pairFactory.setCommunityVaultFactory(signers.otherUser1.address);
      expect(await pairFactory.communityVaultFactory()).to.be.not.eq(feesVaultFactory.target);
      expect(await pairFactory.communityVaultFactory()).to.be.eq(signers.otherUser1.address);
    });
  });
  describe('#configure', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(pairFactory.connect(signers.otherUser1).configure(poolAddress, await tokenTK18.getAddress(), 0)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
  });
  describe('#claim', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(
        pairFactory.connect(signers.otherUser1).claim(poolAddress, tokenTK18.target, signers.otherUser1.address, 100),
      ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
  });
  describe('#createPair', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(pairFactory.connect(signers.otherUser1).createPair(deployed.fenix.target, tokenTK6.target, false)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
    it('fails if token address is same', async () => {
      await expect(pairFactory.createPair(deployed.fenix.target, deployed.fenix.target, false)).to.be.revertedWithCustomError(
        pairFactory,
        'IdenticalAddress',
      );
    });
    it('fails if token address is zero', async () => {
      await expect(pairFactory.createPair(deployed.fenix.target, ZERO_ADDRESS, false)).to.be.revertedWithCustomError(
        pairFactory,
        'AddressZero',
      );
    });
    it('fails if pair already exists', async () => {
      await expect(pairFactory.createPair(tokenTK18.target, tokenTK6.target, false)).to.be.revertedWithCustomError(
        pairFactory,
        'PairExist',
      );
    });
    it('success create pair', async () => {
      let count = (await pairFactory.allPairsLength()) + ONE;

      let newPairAddress = await pairFactory.createPair.staticCall(deployed.fenix.target, tokenTK6.target, false);

      await expect(pairFactory.createPair(deployed.fenix.target, tokenTK6.target, false))
        .to.be.emit(pairFactory, 'PairCreated')
        .withArgs(deployed.fenix, tokenTK6.target, false, newPairAddress, count);

      let pairAddress = await pairFactory.getPair(deployed.fenix, tokenTK6.target, false);
      let pair = await ethers.getContractAt('Pair', pairAddress);

      expect(newPairAddress).to.be.eq(pair);
      expect(await pairFactory.isPair(pair)).to.be.true;
      expect(await pairFactory.allPairs(count - ONE)).to.be.eq(pairAddress);
      expect(await pair.token0()).to.be.eq(deployed.fenix.target);
      expect(await pair.token1()).to.be.eq(tokenTK6.target);
      expect(await pair.factory()).to.be.eq(pairFactory.target);
    });
    it('success create feeVault for pair', async () => {
      let adr = await pairFactory.createPair.staticCall(deployed.fenix.target, tokenTK6.target, false);

      expect(await feesVaultFactory.getVaultForPool(adr)).to.be.eq(ZERO_ADDRESS);
      await pairFactory.createPair(deployed.fenix.target, tokenTK6.target, false);

      let pairAddress = await pairFactory.getPair(deployed.fenix, tokenTK6.target, false);
      let pair = await ethers.getContractAt('Pair', pairAddress);
      expect(await feesVaultFactory.getVaultForPool(adr)).to.be.not.eq(ZERO_ADDRESS);
      expect(await feesVaultFactory.getVaultForPool(adr)).to.be.eq(await pair.communityVault());
    });
  });
});

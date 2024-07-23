import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  FeesVaultFactoryUpgradeable,
  FeesVaultUpgradeable,
  PairFactoryUpgradeable,
  PairFactoryUpgradeable__factory,
  PairFees,
} from '../../typechain-types';
import { ERRORS, ONE, ZERO_ADDRESS, getAccessControlError } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../utils/coreFixture';

const PRECISION = 10000;
describe('PairFactoryUpgradeable Contract', function () {
  let signers: SignersList;
  let pairFactoryFactory: PairFactoryUpgradeable__factory;
  let pairFactory: PairFactoryUpgradeable;
  let feesVaultFactory: FeesVaultFactoryUpgradeable;
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

    await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), pairFactory.target);

    await pairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
    await pairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, true);
    poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);
    poolAddress2 = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, false);
  });

  describe('Deployments', async () => {
    it('has MAX_FEE', async () => {
      expect(await pairFactory.MAX_FEE()).to.be.eq(500);
    });
    it('has PAIRS_ADMINISTRATOR role', async () => {
      expect(await pairFactory.PAIRS_ADMINISTRATOR_ROLE()).to.be.eq('0x8bb7efba716b8bd9b59b6661dd03848105f980fb29035ebc6d805a30527f6e3d');
    });
    it('has FEES_MANAGER_ROLE role', async () => {
      expect(await pairFactory.FEES_MANAGER_ROLE()).to.be.eq('0xad51469fd38cb9e4028f769761e769052a9f1f331b57ad921ac8a45c7903db28');
    });
    it('has PAIRS_CREATOR_ROLE role', async () => {
      expect(await pairFactory.PAIRS_CREATOR_ROLE()).to.be.eq('0x4f895bdce78ed3edb90e9af75173c797e6234073a00b76fc9593b754504e7520');
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

    it('should correct set deployer as DEFAULT_ADMIN_ROLE in contract', async () => {
      expect(await pairFactory.hasRole(await pairFactory.DEFAULT_ADMIN_ROLE(), signers.deployer.address)).to.be.true;
    });

    it('fails if try initialize on implementations', async () => {
      let newFactory = await pairFactoryFactory.connect(signers.deployer).deploy(signers.deployer.address);
      await expect(
        newFactory.initialize(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, feesVaultFactory.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fails if try initialize second time', async () => {
      await expect(
        pairFactory.initialize(signers.blastGovernor.address, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, feesVaultFactory.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fails if provide zero governor address', async () => {
      const implementation = await pairFactoryFactory.deploy(signers.deployer.address);
      const proxy = await deployTransaperntUpgradeableProxy(
        signers.deployer,
        signers.proxyAdmin.address,

        await implementation.getAddress(),
      );
      const attached = pairFactoryFactory.attach(proxy.target) as any as PairFactoryUpgradeable;

      await expect(
        attached.initialize(
          ZERO_ADDRESS,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          deployed.v2PairImplementation.target,
          feesVaultFactory.target,
        ),
      ).to.be.revertedWithCustomError(pairFactoryFactory, 'AddressZero');
    });
    it('fails if provide zero implementations', async () => {
      const implementation = await pairFactoryFactory.deploy(signers.deployer.address);
      const proxy = await deployTransaperntUpgradeableProxy(
        signers.deployer,
        signers.proxyAdmin.address,

        await implementation.getAddress(),
      );
      const attached = pairFactoryFactory.attach(proxy.target) as any as PairFactoryUpgradeable;

      await expect(
        attached.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          ZERO_ADDRESS,
          feesVaultFactory.target,
        ),
      ).to.be.revertedWithCustomError(pairFactoryFactory, 'AddressZero');
    });
    it('fails if provide zero fees vault factory', async () => {
      const implementation = await pairFactoryFactory.deploy(signers.deployer.address);
      const proxy = await deployTransaperntUpgradeableProxy(
        signers.deployer,
        signers.proxyAdmin.address,

        await implementation.getAddress(),
      );
      const attached = pairFactoryFactory.attach(proxy.target) as any as PairFactoryUpgradeable;

      await expect(
        attached.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          deployed.v2PairImplementation.target,
          ZERO_ADDRESS,
        ),
      ).to.be.revertedWithCustomError(pairFactoryFactory, 'AddressZero');
    });
    it('fails if provide zero blastPoints', async () => {
      const implementation = await pairFactoryFactory.deploy(signers.deployer.address);
      const proxy = await deployTransaperntUpgradeableProxy(
        signers.deployer,
        signers.proxyAdmin.address,

        await implementation.getAddress(),
      );
      const attached = pairFactoryFactory.attach(proxy.target) as any as PairFactoryUpgradeable;

      await expect(
        attached.initialize(
          signers.blastGovernor.address,
          ZERO_ADDRESS,
          signers.blastGovernor.address,
          deployed.v2PairImplementation.target,
          feesVaultFactory.target,
        ),
      ).to.be.revertedWithCustomError(pairFactoryFactory, 'AddressZero');
    });
    it('fails if provide zero blastPoints operator', async () => {
      const implementation = await pairFactoryFactory.deploy(signers.deployer.address);
      const proxy = await deployTransaperntUpgradeableProxy(
        signers.deployer,
        signers.proxyAdmin.address,

        await implementation.getAddress(),
      );
      const attached = pairFactoryFactory.attach(proxy.target) as any as PairFactoryUpgradeable;

      await expect(
        attached.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          ZERO_ADDRESS,
          deployed.v2PairImplementation.target,
          feesVaultFactory.target,
        ),
      ).to.be.revertedWithCustomError(pairFactoryFactory, 'AddressZero');
    });
  });

  describe('#_checkAccessForBlastFactoryManager ', async () => {
    it('#setDefaultBlastGovernor fails if caller is not have PAIRS_ADMINISTRATOR_ROLE', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setDefaultBlastGovernor(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('#setConfigurationForRebaseToken fails if caller is not have PAIRS_ADMINISTRATOR_ROLE', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setConfigurationForRebaseToken(tokenTK18.target, true, 1)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('#setDefaultBlastPoints fails if caller is not have PAIRS_ADMINISTRATOR_ROLE', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setDefaultBlastPoints(tokenTK18.target)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('#setDefaultBlastPointsOperator fails if caller is not have PAIRS_ADMINISTRATOR_ROLE', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setDefaultBlastPointsOperator(tokenTK18.target)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
      );
    });
  });

  describe('#setPause', async () => {
    it('fails if caller is not have PAIRS_ADMINISTRATOR_ROLE', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setPause(true)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
      );
      await expect(pairFactory.connect(signers.otherUser1).setPause(false)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('should corect set pause state from owner and emit events', async () => {
      expect(await pairFactory.isPaused()).to.be.false;
      await expect(pairFactory.setPause(true)).to.be.emit(pairFactory, 'SetPaused').withArgs(true);

      expect(await pairFactory.isPaused()).to.be.true;
      await expect(pairFactory.setPause(false)).to.be.emit(pairFactory, 'SetPaused').withArgs(false);
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
      it('fails if caller is not have FEES_MANAGER_ROLE', async () => {
        await expect(pairFactory.connect(signers.otherUser1).setProtocolFee(0)).to.be.revertedWith(
          getAccessControlError(await pairFactory.FEES_MANAGER_ROLE(), signers.otherUser1.address),
        );
      });
      it('fails if try set protocol fee > 100%', async () => {
        await expect(pairFactory.setProtocolFee(PRECISION + 1)).to.be.reverted;
        await expect(pairFactory.setProtocolFee(PRECISION)).to.not.be.reverted;
      });
      it('should corect set protocol fee and emit event', async () => {
        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        await expect(pairFactory.setProtocolFee(123)).to.be.emit(pairFactory, 'SetProtocolFee').withArgs(123);
        expect(await pairFactory.protocolFee()).to.be.eq(123);
        await expect(pairFactory.setProtocolFee(0)).to.be.emit(pairFactory, 'SetProtocolFee').withArgs(0);
        expect(await pairFactory.protocolFee()).to.be.eq(0);
      });
    });
    describe('#setFee', async () => {
      it('fails if caller is not have FEES_MANAGER role', async () => {
        await expect(pairFactory.connect(signers.otherUser1).setFee(false, 1)).to.be.revertedWith(
          getAccessControlError(await pairFactory.FEES_MANAGER_ROLE(), signers.otherUser1.address),
        );
        await expect(pairFactory.connect(signers.otherUser1).setFee(true, 1)).to.be.revertedWith(
          getAccessControlError(await pairFactory.FEES_MANAGER_ROLE(), signers.otherUser1.address),
        );
      });
      it('fails if try set protocol fee > MAX_FEE% or fee == 0', async () => {
        await expect(pairFactory.setFee(false, 501)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
        await expect(pairFactory.setFee(false, 0)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
        await expect(pairFactory.setFee(true, 501)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
        await expect(pairFactory.setFee(true, 0)).to.be.revertedWithCustomError(pairFactory, 'IncorrcectFee');
      });
      it('should corect set fee for stable pairs', async () => {
        expect(await pairFactory.stableFee()).to.be.eq(4);
        await expect(pairFactory.setFee(true, 1)).to.be.emit(pairFactory, 'SetFee').withArgs(true, 1);
        expect(await pairFactory.stableFee()).to.be.eq(1);
        await expect(pairFactory.setFee(true, 25)).to.be.emit(pairFactory, 'SetFee').withArgs(true, 25);
        expect(await pairFactory.stableFee()).to.be.eq(25);
        await expect(pairFactory.setFee(true, 11)).to.be.emit(pairFactory, 'SetFee').withArgs(true, 11);
        expect(await pairFactory.stableFee()).to.be.eq(11);
      });
      it('should corect set fee for volatily pair', async () => {
        expect(await pairFactory.volatileFee()).to.be.eq(18);

        await expect(pairFactory.setFee(false, 1)).to.be.emit(pairFactory, 'SetFee').withArgs(false, 1);
        expect(await pairFactory.volatileFee()).to.be.eq(1);
        await expect(pairFactory.setFee(false, 25)).to.be.emit(pairFactory, 'SetFee').withArgs(false, 25);
        expect(await pairFactory.volatileFee()).to.be.eq(25);
        await expect(pairFactory.setFee(false, 11)).to.be.emit(pairFactory, 'SetFee').withArgs(false, 11);
        expect(await pairFactory.volatileFee()).to.be.eq(11);
      });
    });
    describe('#setCustomProtocolFee', async () => {
      it('fails if caller is not have FEES_MANAGER', async () => {
        let poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);
        await expect(pairFactory.connect(signers.otherUser1).setCustomProtocolFee(poolAddress, 0)).to.be.revertedWith(
          getAccessControlError(await pairFactory.FEES_MANAGER_ROLE(), signers.otherUser1.address),
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

        await expect(pairFactory.setCustomProtocolFee(poolAddress, 123))
          .to.be.emit(pairFactory, 'SetCustomProtocolFee')
          .withArgs(poolAddress, 123);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(123);
        expect(await pairFactory.getProtocolFee(poolAddress2)).to.be.eq(PRECISION);

        await expect(pairFactory.setCustomProtocolFee(poolAddress2, 555))
          .to.be.emit(pairFactory, 'SetCustomProtocolFee')
          .withArgs(poolAddress2, 555);

        expect(await pairFactory.protocolFee()).to.be.eq(PRECISION);
        expect(await pairFactory.getProtocolFee(poolAddress)).to.be.eq(123);
        expect(await pairFactory.getProtocolFee(poolAddress2)).to.be.eq(555);

        await expect(pairFactory.setCustomProtocolFee(poolAddress, 1))
          .to.be.emit(pairFactory, 'SetCustomProtocolFee')
          .withArgs(poolAddress, 1);

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
    it('fails if caller is not PAIRS_ADMINISTRATOR', async () => {
      await expect(pairFactory.connect(signers.otherUser1).setCommunityVaultFactory(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('should correct change community vault factory', async () => {
      expect(await pairFactory.communityVaultFactory()).to.be.eq(feesVaultFactory.target);
      await expect(pairFactory.setCommunityVaultFactory(signers.otherUser1.address))
        .to.be.emit(pairFactory, 'SetCommunityVaultFactory')
        .withArgs(signers.otherUser1.address);
      expect(await pairFactory.communityVaultFactory()).to.be.not.eq(feesVaultFactory.target);
      expect(await pairFactory.communityVaultFactory()).to.be.eq(signers.otherUser1.address);
    });
  });
  describe('#createPair', async () => {
    it('fails if caller is not have PAIRS_CREATOR_ROLE', async () => {
      await expect(pairFactory.connect(signers.otherUser1).createPair(deployed.fenix.target, tokenTK6.target, false)).to.be.revertedWith(
        getAccessControlError(await pairFactory.PAIRS_CREATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('fails if token address is same', async () => {
      await expect(pairFactory.createPair(deployed.fenix.target, deployed.fenix.target, false)).to.be.revertedWithCustomError(
        pairFactory,
        'IdenticalAddress',
      );
    });
    it('fails if try initialzie created Pair second time', async () => {
      let newPairAddress = await pairFactory.createPair.staticCall(deployed.fenix.target, tokenTK6.target, false);

      await pairFactory.createPair(deployed.fenix.target, tokenTK6.target, false);

      let p = await ethers.getContractAt('Pair', newPairAddress);

      await expect(
        p.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          tokenTK18.target,
          tokenTK6.target,
          true,
          deployed.feesVaultFactory.target,
        ),
      ).to.be.rejectedWith('Initialized');
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
    it('success create pair from other user if set public mode', async () => {
      let count = (await pairFactory.allPairsLength()) + ONE;

      await pairFactory.setIsPublicPoolCreationMode(true);

      let newPairAddress = await pairFactory
        .connect(signers.otherUser1)
        .createPair.staticCall(deployed.fenix.target, tokenTK6.target, false);
      const [token0, token1] =
        deployed.fenix.target.toString().toLowerCase() < tokenTK6.target.toString().toLowerCase()
          ? [deployed.fenix.target, tokenTK6.target]
          : [tokenTK6.target, deployed.fenix.target];

      let tx = await pairFactory.connect(signers.otherUser1).createPair(deployed.fenix.target, tokenTK6.target, false);
      let pairAddress = await pairFactory.getPair(deployed.fenix, tokenTK6.target, false);
      let pair = await ethers.getContractAt('Pair', pairAddress);

      await expect(tx).to.be.emit(pairFactory, 'PairCreated').withArgs(token0, token1, false, newPairAddress, count);

      expect(newPairAddress).to.be.eq(pair);
      expect(await pairFactory.isPair(pair)).to.be.true;
      expect(await pairFactory.allPairs(count - ONE)).to.be.eq(pairAddress);
      expect(await pair.token0()).to.be.eq(token0);
      expect(await pair.token1()).to.be.eq(token1);
      expect(await pair.factory()).to.be.eq(pairFactory.target);
    });
    it('success create pair', async () => {
      let count = (await pairFactory.allPairsLength()) + ONE;

      const [token0, token1] =
        deployed.fenix.target.toString().toLowerCase() < tokenTK6.target.toString().toLowerCase()
          ? [deployed.fenix.target, tokenTK6.target]
          : [tokenTK6.target, deployed.fenix.target];

      let newPairAddress = await pairFactory.createPair.staticCall(deployed.fenix.target, tokenTK6.target, false);
      let tx = await pairFactory.createPair(deployed.fenix.target, tokenTK6.target, false);
      let pairAddress = await pairFactory.getPair(deployed.fenix, tokenTK6.target, false);
      let pair = await ethers.getContractAt('Pair', pairAddress);

      await expect(tx).to.be.emit(pairFactory, 'PairCreated').withArgs(token0, token1, false, newPairAddress, count);

      expect(newPairAddress).to.be.eq(pair);
      expect(await pairFactory.isPair(pair)).to.be.true;
      expect(await pairFactory.allPairs(count - ONE)).to.be.eq(pairAddress);
      expect(await pair.token0()).to.be.eq(token0);
      expect(await pair.token1()).to.be.eq(token1);
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
    it('success create PairFees with correct parameters', async () => {
      await pairFactory.createPair(deployed.fenix.target, tokenTK6.target, false);

      let pairAddress = await pairFactory.getPair(deployed.fenix, tokenTK6.target, false);
      let pair = await ethers.getContractAt('Pair', pairAddress);

      let pairFeesAddr = await pair.fees();
      let pairFees = (await ethers.getContractAt('PairFees', pairFeesAddr)) as PairFees;

      expect(pairFeesAddr).to.be.not.eq(ZERO_ADDRESS);
      await expect(pairFees.connect(signers.otherUser1).configure(tokenTK6.target, 1)).to.be.revertedWith('ACCESS_DENIED');
      await expect(pairFees.configure(tokenTK6.target, 1)).to.be.not.revertedWith('ACCESS_DENIED');
    });
  });
});

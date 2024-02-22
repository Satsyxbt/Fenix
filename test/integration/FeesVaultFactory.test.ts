import { expect } from 'chai';
import { ethers } from 'hardhat';
import { FeesVaultFactory, FeesVaultFactory__factory, FeesVaultUpgradeable, BlastMock, IBlastMock } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('FeesVaultFactory Contract', function () {
  let signers: SignersList;
  let feesVaultFactory: FeesVaultFactory;
  let feesVaultImplementation: FeesVaultUpgradeable;
  let factory: FeesVaultFactory__factory;
  let deployed: CoreFixtureDeployed;
  let blast: BlastMock;
  let creator: HardhatEthersSigner;
  let mockPoolAddress1 = '0x1100000000000000000000000000000000000111';
  let mockPoolAddress2 = '0x1100000000000000000000000000000000000112';

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    creator = signers.fenixTeam;

    feesVaultFactory = deployed.feesVaultFactory;
    feesVaultImplementation = deployed.feesVaultImplementation;
    factory = await ethers.getContractFactory('FeesVaultFactory');

    let blastFactory = await ethers.getContractFactory('BlastMock');
    blast = blastFactory.attach(BLAST_PREDEPLOYED_ADDRESS) as BlastMock;

    await feesVaultFactory.setWhitelistedCreatorStatus(creator.address, true);
  });

  describe('Deployments', async () => {
    it('should correct set voter', async () => {
      expect(await feesVaultFactory.voter()).to.be.eq(deployed.voter.target);
    });
    it('should correct set initial feesVault implementation', async () => {
      expect(await feesVaultFactory.implementation()).to.be.eq(feesVaultImplementation.target);
    });
    it('should correct set defaultBlastGovernor', async () => {
      expect(await feesVaultFactory.defaultBlastGovernor()).to.be.eq(signers.blastGovernor.address);
    });
    it('should correct set deployer as owner in contract', async () => {
      expect(await feesVaultFactory.owner()).to.be.eq(signers.deployer.address);
    });
    it('fails if provide zero governor address', async () => {
      await expect(
        factory.connect(signers.deployer).deploy(ZERO_ADDRESS, await feesVaultImplementation.getAddress(), deployed.voter.target),
      ).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fails if provide zero voter address', async () => {
      await expect(
        factory.connect(signers.deployer).deploy(signers.blastGovernor.address, await feesVaultImplementation.getAddress(), ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fails if provide incorrect implementation', async () => {
      await expect(
        factory.connect(signers.deployer).deploy(signers.blastGovernor.address, ZERO_ADDRESS, deployed.voter.target),
      ).to.be.revertedWith('UpgradeableBeacon: implementation is not a contract');
      await expect(
        factory.connect(signers.deployer).deploy(signers.blastGovernor.address, signers.deployer.address, deployed.voter.target),
      ).to.be.revertedWith('UpgradeableBeacon: implementation is not a contract');
    });
  });

  describe('#feesVaultOwner', async () => {
    it('should return current contract owner', async () => {
      expect(await feesVaultFactory.feesVaultOwner()).to.be.eq(await feesVaultFactory.owner());
      await feesVaultFactory.transferOwnership(signers.otherUser1.address);
      expect(await feesVaultFactory.feesVaultOwner()).to.be.not.eq(signers.deployer.address);
      expect(await feesVaultFactory.feesVaultOwner()).to.be.eq(signers.otherUser1.address);
    });
  });
  describe('#setWhitelistedCreatorStatus', async () => {
    it('fails if caller not owner', async () => {
      await expect(
        feesVaultFactory.connect(signers.otherUser1).setWhitelistedCreatorStatus(signers.otherUser1.address, true),
      ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
    it('success set whitelisted status and emit event', async () => {
      expect(await feesVaultFactory.isWhitelistedCreator(signers.otherUser1.address)).to.be.false;

      await expect(feesVaultFactory.connect(signers.deployer).setWhitelistedCreatorStatus(signers.otherUser1.address, true))
        .to.be.emit(feesVaultFactory, 'SetWhitelistedCreatorStatus')
        .withArgs(signers.otherUser1.address, true);

      expect(await feesVaultFactory.isWhitelistedCreator(signers.otherUser1.address)).to.be.true;

      await expect(feesVaultFactory.connect(signers.deployer).setWhitelistedCreatorStatus(signers.otherUser1.address, false))
        .to.be.emit(feesVaultFactory, 'SetWhitelistedCreatorStatus')
        .withArgs(signers.otherUser1.address, false);
      expect(await feesVaultFactory.isWhitelistedCreator(signers.otherUser1.address)).to.be.false;
    });
  });
  describe('#setVoter', async () => {
    it('fails if caller not owner', async () => {
      await expect(feesVaultFactory.connect(signers.otherUser1).setVoter(signers.otherUser1.address)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
    it('fails if try set ZERO_ADDRESS', async () => {
      await expect(feesVaultFactory.setVoter(ZERO_ADDRESS)).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
    });
    it('success set new voter address and emit event', async () => {
      expect(await feesVaultFactory.voter()).to.be.eq(deployed.voter.target);

      await expect(feesVaultFactory.connect(signers.deployer).setVoter(signers.otherUser1.address))
        .to.be.emit(feesVaultFactory, 'SetVoter')
        .withArgs(deployed.voter.target, signers.otherUser1.address);

      expect(await feesVaultFactory.voter()).to.be.eq(signers.otherUser1.address);
    });
  });
  describe('#setDefaultBlastGovernor', async () => {
    it('fails if caller not owner', async () => {
      await expect(feesVaultFactory.connect(signers.otherUser1).setDefaultBlastGovernor(signers.otherUser1.address)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
    it('fails if try set ZERO_ADDRESS', async () => {
      await expect(feesVaultFactory.setDefaultBlastGovernor(ZERO_ADDRESS)).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
    });
    it('success set new default blast governor address and emit event', async () => {
      expect(await feesVaultFactory.defaultBlastGovernor()).to.be.eq(signers.blastGovernor.address);

      await expect(feesVaultFactory.connect(signers.deployer).setDefaultBlastGovernor(signers.otherUser1.address))
        .to.be.emit(feesVaultFactory, 'SetDefaultBlastGovernor')
        .withArgs(signers.blastGovernor.address, signers.otherUser1.address);

      expect(await feesVaultFactory.defaultBlastGovernor()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#createVaultForPool', async () => {
    it('fails if caller not whitelisted creators', async () => {
      await expect(
        feesVaultFactory.connect(signers.otherUser1).createVaultForPool(signers.otherUser1.address),
      ).to.be.revertedWithCustomError(feesVaultFactory, 'AccessDenied');
    });
    it('fails if feesVault already created for target pool', async () => {
      await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
      await expect(feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1)).to.be.revertedWithCustomError(
        feesVaultFactory,
        'AlreadyCreated',
      );
    });
    describe('sucess create vault for pool', async () => {
      it('create end emit event', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await expect(feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1))
          .to.be.emit(feesVaultFactory, 'FeesVaultCreated')
          .withArgs(mockPoolAddress1, newFeesVaultAddress);
      });
      it('correct initialize creation feesVault', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
        let feesVault = await ethers.getContractAt('FeesVaultUpgradeable', newFeesVaultAddress);

        expect(await feesVault.factory()).to.be.eq(feesVaultFactory.target);
        expect(await feesVault.pool()).to.be.eq(mockPoolAddress1);
      });
      it('correct set poolToVault', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);

        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress1)).to.be.eq(newFeesVaultAddress);
        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress2)).to.be.eq(ZERO_ADDRESS);

        let newFeesVaultAddress2 = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress2);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress2);
        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress1)).to.be.eq(newFeesVaultAddress);
        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress2)).to.be.eq(newFeesVaultAddress2);
      });
      it('deployed feesVault cant be initialzie second time', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
        let feesVault = await ethers.getContractAt('FeesVaultUpgradeable', newFeesVaultAddress);

        await expect(feesVault.initialize(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });
    });
  });
});

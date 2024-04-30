import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  BaseManagedNFTStrategyUpgradeableMock,
  BaseManagedNFTStrategyUpgradeableMock__factory,
  BaseManagedNFTStrategyUpgradeable__factory,
  ManagedNFTManagerUpgradeable,
  SingelTokenVirtualRewarderUpgradeable,
  SingelTokenVirtualRewarderUpgradeable__factory,
} from '../../typechain-types';
import { ERRORS, ONE, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployTransaperntUpgradeableProxy,
  deployVirtualRewarderWithoutInitialize,
  getSigners,
  mockBlast,
} from '../utils/coreFixture';
import { time, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('ManagedNFTManager Contract', function () {
  let signers: SignersList;

  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let deployed: CoreFixtureDeployed;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    managedNFTManager = deployed.managedNFTManager;

    signers = await getSigners();
  });

  describe('Deployment', async () => {
    it('fail if try initialize on implementatrion', async () => {
      await expect(strategyImpl.initialize(signers.blastGovernor.address, managedNFTManager.target, 'Name 1')).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });

    it('fail if try initialize second time', async () => {
      await expect(strategy.initialize(signers.blastGovernor.address, managedNFTManager.target, 'Name 1')).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });

    it('fail if `blastGovernor` is zero address', async () => {
      let newStrategy = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await strategyImpl.getAddress())).target,
      ) as any as BaseManagedNFTStrategyUpgradeableMock;

      await expect(newStrategy.initialize(ZERO_ADDRESS, managedNFTManager.target, 'name')).to.be.revertedWithCustomError(
        newStrategy,
        'AddressZero',
      );
    });

    it('fail if `managedNFTManager` is zero address', async () => {
      let newStrategy = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await strategyImpl.getAddress())).target,
      ) as any as BaseManagedNFTStrategyUpgradeableMock;

      await expect(newStrategy.initialize(signers.blastGovernor.address, ZERO_ADDRESS, 'name')).to.be.revertedWithCustomError(
        newStrategy,
        'AddressZero',
      );
    });

    it('correct initialize fields', async () => {
      expect(await managedNFTManager.votingEscrow()).to.be.not.eq(ZERO_ADDRESS);
      expect(await managedNFTManager.voter()).to.be.not.eq(ZERO_ADDRESS);
      expect(await strategy.voter()).to.be.eq(await managedNFTManager.voter());
      expect(await strategy.votingEscrow()).to.be.eq(await managedNFTManager.votingEscrow());
      expect(await strategy.name()).to.be.eq('Name 1');
      expect(await strategy.managedNFTManager()).to.be.eq(managedNFTManager.target);
    });
  });
  describe('#setName', async () => {
    it('fail if from not admin', async () => {
      expect(await strategy.name()).to.be.eq('Name 1');
      await expect(strategy.connect(signers.otherUser1).setName('Second Name')).to.be.revertedWithCustomError(strategy, 'AccessDenied');
    });

    it('change name and emit event', async () => {
      expect(await strategy.name()).to.be.eq('Name 1');
      await expect(strategy.setName('Second Name')).to.be.emit(strategy, 'SetName').withArgs('Second Name');
      expect(await strategy.name()).to.be.eq('Second Name');
      await expect(strategy.setName('Third Name')).to.be.emit(strategy, 'SetName').withArgs('Third Name');
      expect(await strategy.name()).to.be.eq('Third Name');
    });
  });
  describe('#attachManagedNFT', async () => {
    it('fail if from not admin wallet', async () => {
      await expect(strategy.connect(signers.otherUser1).attachManagedNFT(1)).to.be.revertedWithCustomError(strategy, 'AccessDenied');
    });

    it('fail if try attach not maanged nft', async () => {
      let newStrategy = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await strategyImpl.getAddress())).target,
      ) as any as BaseManagedNFTStrategyUpgradeableMock;
      await newStrategy.initialize(signers.blastGovernor.address, managedNFTManager.target, '1');
      await expect(newStrategy.attachManagedNFT(10)).to.be.revertedWithCustomError(newStrategy, 'IncorrectManagedTokenId');
    });

    it('fail if try attach nft from another wallet', async () => {
      let newStrategy = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await strategyImpl.getAddress())).target,
      ) as any as BaseManagedNFTStrategyUpgradeableMock;
      await newStrategy.initialize(signers.blastGovernor.address, managedNFTManager.target, '1');

      let nftId = await managedNFTManager.createManagedNFT.staticCall(newStrategy.target);
      await managedNFTManager.createManagedNFT(newStrategy.target);

      let newStrategy2 = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await strategyImpl.getAddress())).target,
      ) as any as BaseManagedNFTStrategyUpgradeableMock;
      await newStrategy2.initialize(signers.blastGovernor.address, managedNFTManager.target, '1');

      await expect(newStrategy2.attachManagedNFT(nftId)).to.be.revertedWithCustomError(newStrategy2, 'IncorrectManagedTokenId');
    });

    it('fail if already attached', async () => {
      await expect(strategy.attachManagedNFT(managedNFTId)).to.be.revertedWithCustomError(strategy, 'AlreadyAttached');
    });
    it('correct attach nft', async () => {
      let newStrategy = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await strategyImpl.getAddress())).target,
      ) as any as BaseManagedNFTStrategyUpgradeableMock;
      await newStrategy.initialize(signers.blastGovernor.address, managedNFTManager.target, '1');

      expect(await newStrategy.managedTokenId()).to.be.eq(0);
      let nftId = await managedNFTManager.createManagedNFT.staticCall(newStrategy.target);
      await managedNFTManager.createManagedNFT(newStrategy.target);
    });
  });

  describe('#vote', async () => {
    it('fail if from not authorized wallet', async () => {
      await expect(strategy.connect(signers.otherUser1).vote([], [])).to.be.revertedWithCustomError(strategy, 'AccessDenied');
    });
    it('cane be called only from authorized user', async () => {
      expect(await managedNFTManager.isAuthorized(managedNFTId, signers.otherUser1.address)).to.be.false;
      await expect(strategy.connect(signers.otherUser1).vote([], [])).to.be.revertedWithCustomError(strategy, 'AccessDenied');

      await managedNFTManager.setAuthorizedUser(managedNFTId, signers.otherUser1.address);
      expect(await managedNFTManager.isAuthorized(managedNFTId, signers.otherUser1.address)).to.be.true;
      await expect(strategy.connect(signers.otherUser1).vote([], [])).to.be.not.reverted;
    });
  });
  describe('#claimRewards', async () => {
    it('cane be called from any user', async () => {
      expect(await managedNFTManager.isAuthorized(managedNFTId, signers.otherUser1.address)).to.be.false;
      expect(await managedNFTManager.isAdmin(signers.otherUser1.address)).to.be.false;
      await expect(strategy.connect(signers.otherUser1).claimRewards([])).to.be.not.reverted;
    });
  });
  describe('#claimBribes', async () => {
    it('cane be called from any user', async () => {
      expect(await managedNFTManager.isAuthorized(managedNFTId, signers.otherUser1.address)).to.be.false;
      expect(await managedNFTManager.isAdmin(signers.otherUser1.address)).to.be.false;
      await expect(strategy.connect(signers.otherUser1).claimBribes([], [])).to.be.not.reverted;
    });
  });
});

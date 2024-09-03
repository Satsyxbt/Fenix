import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  ManagedNFTManagerUpgradeable,
  ManagedNFTManagerUpgradeable__factory,
  RouterV2,
  RouterV2PathProviderUpgradeable,
} from '../../typechain-types';
import { ERRORS, ONE, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS, getAccessControlError } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployManagedNFTManager,
  deployTransaperntUpgradeableProxy,
  getSigners,
} from '../utils/coreFixture';

describe('ManagedNFTManager Contract', function () {
  let signers: SignersList;

  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let factory: ManagedNFTManagerUpgradeable__factory;
  let deployed: CoreFixtureDeployed;

  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;

  async function newStrategy() {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await strategyFactory.createStrategy.staticCall('VeMax'),
    );
    await strategyFactory.createStrategy('VeMax');
    return strategy;
  }
  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = await getSigners();

    managedNFTManager = deployed.managedNFTManager;
    factory = await ethers.getContractFactory('ManagedNFTManagerUpgradeable');

    strategyFactory = (await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (
            await ethers.deployContract('CompoundVeFNXManagedNFTStrategyFactoryUpgradeable', [signers.blastGovernor.address])
          ).getAddress(),
        )
      ).target,
    )) as CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;

    routerV2PathProvider = (await ethers.getContractFactory('RouterV2PathProviderUpgradeable')).attach(
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (await ethers.deployContract('RouterV2PathProviderUpgradeable', [signers.blastGovernor.address])).getAddress(),
        )
      ).target,
    ) as RouterV2PathProviderUpgradeable;

    routerV2 = await ethers.deployContract('RouterV2', [
      signers.blastGovernor.address,
      deployed.v2PairFactory.target,
      WETH_PREDEPLOYED_ADDRESS,
    ]);

    await routerV2PathProvider.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target);

    await strategyFactory.initialize(
      signers.blastGovernor.address,
      (
        await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address])
      ).target,
      (
        await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address])
      ).target,
      managedNFTManager.target,
      routerV2PathProvider.target,
    );
  });

  describe('Deployment', async () => {
    it('fail if try initialize on implementatrion', async () => {
      let impl = await ethers.deployContract('ManagedNFTManagerUpgradeable', [signers.blastGovernor.address]);
      await expect(impl.initialize(signers.blastGovernor.address, deployed.votingEscrow.target, deployed.voter.target)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });

    it('fail if try initialize second time', async () => {
      await expect(
        managedNFTManager.initialize(signers.blastGovernor.address, deployed.votingEscrow.target, deployed.voter.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('fail if `blastGovernor` is zero address', async () => {
      let impl = await ethers.deployContract('ManagedNFTManagerUpgradeable', [signers.blastGovernor.address]);

      let newManager = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await impl.getAddress())).target,
      ) as any as ManagedNFTManagerUpgradeable;

      await expect(newManager.initialize(ZERO_ADDRESS, deployed.votingEscrow.target, deployed.voter.target)).to.be.revertedWithCustomError(
        newManager,
        'AddressZero',
      );
    });

    it('fail if `votingEscrow` is zero address', async () => {
      let impl = await ethers.deployContract('ManagedNFTManagerUpgradeable', [signers.blastGovernor.address]);

      let newManager = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await impl.getAddress())).target,
      ) as any as ManagedNFTManagerUpgradeable;

      await expect(newManager.initialize(signers.blastGovernor.address, ZERO_ADDRESS, deployed.voter.target)).to.be.revertedWithCustomError(
        newManager,
        'AddressZero',
      );
    });

    it('fail if `voter` is zero address', async () => {
      let impl = await ethers.deployContract('ManagedNFTManagerUpgradeable', [signers.blastGovernor.address]);

      let newManager = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await impl.getAddress())).target,
      ) as any as ManagedNFTManagerUpgradeable;

      await expect(
        newManager.initialize(signers.blastGovernor.address, deployed.votingEscrow.target, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(newManager, 'AddressZero');
    });

    it('correct initialize fields', async () => {
      expect(await managedNFTManager.votingEscrow()).to.be.eq(deployed.votingEscrow.target);
      expect(await managedNFTManager.voter()).to.be.eq(deployed.voter.target);
    });

    it('setup roles for deployer', async () => {
      expect(await managedNFTManager.hasRole(await managedNFTManager.DEFAULT_ADMIN_ROLE(), signers.deployer.address)).to.be.true;
      expect(await managedNFTManager.hasRole(await managedNFTManager.MANAGED_NFT_ADMIN(), signers.deployer.address)).to.be.true;
    });
  });
  describe('#toggleDisableManagedNFT', async () => {
    it('fail if call from not admin', async () => {
      await expect(managedNFTManager.connect(signers.otherUser1).toggleDisableManagedNFT(1)).to.be.revertedWith(
        getAccessControlError(await managedNFTManager.MANAGED_NFT_ADMIN(), signers.otherUser1.address),
      );
    });

    it('fail if call for not created managed NFt', async () => {
      await expect(managedNFTManager.toggleDisableManagedNFT(1)).to.be.revertedWithCustomError(managedNFTManager, 'NotManagedNFT');
    });

    it('success toggle disable nft', async () => {
      let strategy = await newStrategy();
      let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);

      expect(await managedNFTManager.isDisabledNFT(tokenId)).to.be.false;

      await expect(managedNFTManager.toggleDisableManagedNFT(tokenId))
        .to.be.emit(managedNFTManager, 'ToggleDisableManagedNFT')
        .withArgs(signers.deployer.address, tokenId, true);

      expect(await managedNFTManager.isDisabledNFT(tokenId)).to.be.true;

      await expect(managedNFTManager.toggleDisableManagedNFT(tokenId))
        .to.be.emit(managedNFTManager, 'ToggleDisableManagedNFT')
        .withArgs(signers.deployer.address, tokenId, false);

      expect(await managedNFTManager.isDisabledNFT(tokenId)).to.be.false;

      await expect(managedNFTManager.toggleDisableManagedNFT(tokenId))
        .to.be.emit(managedNFTManager, 'ToggleDisableManagedNFT')
        .withArgs(signers.deployer.address, tokenId, true);
      expect(await managedNFTManager.isDisabledNFT(tokenId)).to.be.true;
    });
  });
  describe('#createManagedNFT', async () => {
    it('fail if call from not admin', async () => {
      await expect(managedNFTManager.connect(signers.otherUser1).createManagedNFT(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await managedNFTManager.MANAGED_NFT_ADMIN(), signers.otherUser1.address),
      );
    });

    it('fail if call for not strategy contract', async () => {
      await expect(managedNFTManager.createManagedNFT(signers.otherUser1.address)).to.be.reverted;
    });

    it('fail if call for already attached managed nft strategy', async () => {
      let strategy = await newStrategy();

      await managedNFTManager.createManagedNFT(strategy.target);

      await expect(managedNFTManager.createManagedNFT(strategy.target)).to.be.revertedWithCustomError(strategy, 'AlreadyAttached');
    });
    it('correct create new managed nft and attached in strategy', async () => {
      let strategy = await ethers.getContractAt(
        'CompoundVeFNXManagedNFTStrategyUpgradeable',
        await strategyFactory.createStrategy.staticCall('VeMax'),
      );
      await strategyFactory.createStrategy('VeMax');

      let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
      expect(await strategy.managedTokenId()).to.be.eq(ZERO);

      await expect(managedNFTManager.createManagedNFT(strategy.target))
        .to.be.emit(managedNFTManager, 'CreateManagedNFT')
        .withArgs(signers.deployer.address, strategy.target, tokenId);
      await expect(managedNFTManager.createManagedNFT(strategy.target)).to.be.reverted;

      expect(await strategy.managedTokenId()).to.be.eq(tokenId);
      expect(await managedNFTManager.managedTokensInfo(tokenId)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
    });
  });
  describe('#setAuthorizedUser', async () => {
    it('fail if call from not admin', async () => {
      await expect(managedNFTManager.connect(signers.otherUser1).setAuthorizedUser(1, signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await managedNFTManager.MANAGED_NFT_ADMIN(), signers.otherUser1.address),
      );
    });

    it('fail if call for not created managed NFt', async () => {
      await expect(managedNFTManager.setAuthorizedUser(1, signers.otherUser1.address)).to.be.revertedWithCustomError(
        managedNFTManager,
        'NotManagedNFT',
      );
    });

    it('success setup new authorized user', async () => {
      let strategy = await newStrategy();
      let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);
      expect((await managedNFTManager.managedTokensInfo(tokenId)).authorizedUser).to.be.eq(ZERO_ADDRESS);
      await expect(managedNFTManager.setAuthorizedUser(tokenId, signers.otherUser1.address))
        .to.be.emit(managedNFTManager, 'SetAuthorizedUser')
        .withArgs(tokenId, signers.otherUser1.address);
      expect((await managedNFTManager.managedTokensInfo(tokenId)).authorizedUser).to.be.eq(signers.otherUser1.address);
    });

    it('setuped user have permisisons in attached to nft strategy', async () => {
      let strategy = await ethers.getContractAt(
        'CompoundVeFNXManagedNFTStrategyUpgradeable',
        await strategyFactory.createStrategy.staticCall('VeMax'),
      );
      await strategyFactory.createStrategy('VeMax');
      let managedNftId = await managedNFTManager.createManagedNFT.staticCall(strategy);
      await managedNFTManager.createManagedNFT(strategy.target);

      await expect(strategy.connect(signers.otherUser1).vote([], [])).to.be.revertedWithCustomError(strategy, 'AccessDenied');

      expect((await managedNFTManager.managedTokensInfo(managedNftId)).authorizedUser).to.be.eq(ZERO_ADDRESS);
      await managedNFTManager.setAuthorizedUser(managedNftId, signers.otherUser1.address);

      await expect(strategy.connect(signers.otherUser1).vote([], [])).to.be.not.reverted;
    });
  });
  describe('view functionality', async () => {
    it('#isDisabledNFT', async () => {
      let strategy = await newStrategy();
      let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
      await managedNFTManager.createManagedNFT(strategy.target);
      expect(await managedNFTManager.managedTokensInfo(tokenId)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
      expect(await managedNFTManager.isDisabledNFT(tokenId)).to.be.false;

      await managedNFTManager.toggleDisableManagedNFT(tokenId);

      expect(await managedNFTManager.managedTokensInfo(tokenId)).to.be.deep.eq([true, true, ZERO_ADDRESS]);
      expect(await managedNFTManager.isDisabledNFT(tokenId)).to.be.true;
    });
    it('#isManagedNFT', async () => {
      let strategy = await newStrategy();
      let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;

      expect(await managedNFTManager.managedTokensInfo(tokenId)).to.be.deep.eq([false, false, ZERO_ADDRESS]);

      expect(await managedNFTManager.isManagedNFT(tokenId)).to.be.false;
      await managedNFTManager.createManagedNFT(strategy.target);
      expect(await managedNFTManager.isManagedNFT(tokenId)).to.be.true;
      expect(await managedNFTManager.managedTokensInfo(tokenId)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
    });
    it('#isAuthorized', async () => {
      let strategy = await newStrategy();
      let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;

      expect(await managedNFTManager.isAuthorized(tokenId, signers.otherUser1.address)).to.be.false;

      await managedNFTManager.createManagedNFT(strategy.target);

      expect(await managedNFTManager.isAuthorized(tokenId, signers.otherUser1.address)).to.be.false;

      await managedNFTManager.setAuthorizedUser(tokenId, signers.otherUser1.address);

      expect(await managedNFTManager.isAuthorized(tokenId, signers.otherUser1.address)).to.be.true;
      expect(await managedNFTManager.managedTokensInfo(tokenId)).to.be.deep.eq([true, false, signers.otherUser1.address]);

      await managedNFTManager.setAuthorizedUser(tokenId, ZERO_ADDRESS);
      expect(await managedNFTManager.isAuthorized(tokenId, signers.otherUser1.address)).to.be.false;

      expect(await managedNFTManager.managedTokensInfo(tokenId)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
    });
  });

  describe('attach & dettach', async () => {
    describe('fail if', async () => {
      beforeEach(async () => {
        managedNFTManager = await deployManagedNFTManager(
          signers.deployer,
          signers.proxyAdmin.address,
          signers.blastGovernor.address,
          await deployed.votingEscrow.getAddress(),
          signers.fenixTeam.address,
        );
        await deployed.votingEscrow.updateAddress('managedNFTManager', managedNFTManager.target);
        await deployed.voter.updateAddress('managedNFTManager', managedNFTManager.target);
        strategyFactory = (await ethers.getContractAt(
          'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
          (
            await deployTransaperntUpgradeableProxy(
              signers.deployer,
              signers.proxyAdmin.address,
              await (
                await ethers.deployContract('CompoundVeFNXManagedNFTStrategyFactoryUpgradeable', [signers.blastGovernor.address])
              ).getAddress(),
            )
          ).target,
        )) as CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;

        await strategyFactory.initialize(
          signers.blastGovernor.address,
          (
            await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address])
          ).target,
          (
            await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address])
          ).target,
          managedNFTManager.target,
          routerV2PathProvider.target,
        );
      });

      describe('onAttachToManagedNFT', async () => {
        it('success attach user nft to managed nft id', async () => {
          let strategy = await newStrategy();
          let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
          await managedNFTManager.createManagedNFT(strategy.target);

          let userTokenId = tokenId + ONE;
          await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('1'));
          await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
          expect(await managedNFTManager.tokensInfo(userTokenId)).to.be.deep.eq([false, 0, 0]);
          await managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(userTokenId, tokenId);
          expect(await managedNFTManager.tokensInfo(userTokenId)).to.be.deep.eq([true, tokenId, ethers.parseEther('1')]);
        });
        it('fail if user nft already attached', async () => {
          let strategy = await newStrategy();
          let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
          await managedNFTManager.createManagedNFT(strategy.target);

          let userTokenId = tokenId + ONE;
          await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('1'));
          await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);

          await managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(userTokenId, tokenId);

          await expect(
            managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(userTokenId, tokenId),
          ).to.be.revertedWithCustomError(managedNFTManager, 'IncorrectUserNFT');
        });
        it('fail if call from not voter', async () => {
          await expect(managedNFTManager.connect(signers.otherUser1).onAttachToManagedNFT(1, 2)).to.be.revertedWithCustomError(
            managedNFTManager,
            'AccessDenied',
          );
        });
        it('fail if managed token id not created or not managed', async () => {
          await expect(managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(1, 2)).to.be.revertedWithCustomError(
            managedNFTManager,
            'NotManagedNFT',
          );
        });
        it('fail if managed token is disabled', async () => {
          let strategy = await newStrategy();
          let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
          await managedNFTManager.createManagedNFT(strategy.target);

          await managedNFTManager.toggleDisableManagedNFT(tokenId);

          await expect(managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(1, tokenId)).to.be.revertedWithCustomError(
            managedNFTManager,
            'ManagedNFTIsDisabled',
          );
        });
        it('fail if user token id is managed nft', async () => {
          let strategy = await newStrategy();
          let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
          await managedNFTManager.createManagedNFT(strategy.target);

          let secondStrategy = await newStrategy();
          let secondTokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
          await managedNFTManager.createManagedNFT(secondStrategy.target);

          await expect(
            managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(secondTokenId, tokenId),
          ).to.be.revertedWithCustomError(managedNFTManager, 'IncorrectUserNFT');
        });
      });
      describe('onDettachFromManagedNFT', async () => {
        it('fail if call from not voter', async () => {
          await expect(managedNFTManager.connect(signers.otherUser1).onDettachFromManagedNFT(1)).to.be.revertedWithCustomError(
            managedNFTManager,
            'AccessDenied',
          );
        });

        it('fail if user nft not attached', async () => {
          let strategy = await newStrategy();
          let tokenId = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
          await managedNFTManager.createManagedNFT(strategy.target);

          let userTokenId = tokenId + ONE;
          await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('1'));
          await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
          await expect(managedNFTManager.connect(signers.fenixTeam).onDettachFromManagedNFT(userTokenId)).to.be.revertedWithCustomError(
            managedNFTManager,
            'NotAttached',
          );
        });
      });
      it('short main flow', async () => {
        let strategy = await newStrategy();
        let managedTokenIdFirst = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
        await managedNFTManager.createManagedNFT(strategy.target);

        let secondStrategy = await newStrategy();
        let managedTokenIdSecond = (await deployed.votingEscrow.lastMintedTokenId()) + ONE;
        await managedNFTManager.createManagedNFT(secondStrategy.target);

        await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('100'));
        let userTokenIdFirst = await deployed.votingEscrow.create_lock_for.staticCall(
          ethers.parseEther('1'),
          182 * 86400,
          signers.otherUser1.address,
        );
        let userTokenIdSecond =
          (await deployed.votingEscrow.create_lock_for.staticCall(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address)) + ONE;

        await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
        await deployed.votingEscrow.create_lock_for(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address);

        expect(await managedNFTManager.tokensInfo(userTokenIdFirst)).to.be.deep.eq([false, 0, 0]);
        expect(await managedNFTManager.tokensInfo(userTokenIdSecond)).to.be.deep.eq([false, 0, 0]);
        expect(await managedNFTManager.managedTokensInfo(managedTokenIdFirst)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
        expect(await managedNFTManager.managedTokensInfo(managedTokenIdSecond)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenIdFirst)).to.be.eq(ZERO);
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenIdSecond)).to.be.eq(ZERO);
        expect(await managedNFTManager.isAttachedNFT(userTokenIdFirst)).to.be.false;
        expect(await managedNFTManager.isAttachedNFT(userTokenIdSecond)).to.be.false;
        expect(await managedNFTManager.isDisabledNFT(managedTokenIdFirst)).to.be.false;
        expect(await managedNFTManager.isDisabledNFT(managedTokenIdSecond)).to.be.false;
        expect(await managedNFTManager.isManagedNFT(managedTokenIdFirst)).to.be.true;
        expect(await managedNFTManager.isManagedNFT(managedTokenIdSecond)).to.be.true;

        await managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(userTokenIdFirst, managedTokenIdFirst);

        expect(await managedNFTManager.tokensInfo(userTokenIdFirst)).to.be.deep.eq([true, managedTokenIdFirst, ethers.parseEther('1')]);
        expect(await managedNFTManager.tokensInfo(userTokenIdSecond)).to.be.deep.eq([false, 0, 0]);
        expect(await managedNFTManager.managedTokensInfo(managedTokenIdFirst)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
        expect(await managedNFTManager.managedTokensInfo(managedTokenIdSecond)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenIdFirst)).to.be.eq(managedTokenIdFirst);
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenIdSecond)).to.be.eq(ZERO);
        expect(await managedNFTManager.isAttachedNFT(userTokenIdFirst)).to.be.true;
        expect(await managedNFTManager.isAttachedNFT(userTokenIdSecond)).to.be.false;
        expect(await managedNFTManager.isDisabledNFT(managedTokenIdFirst)).to.be.false;
        expect(await managedNFTManager.isDisabledNFT(managedTokenIdSecond)).to.be.false;
        expect(await managedNFTManager.isManagedNFT(managedTokenIdFirst)).to.be.true;
        expect(await managedNFTManager.isManagedNFT(managedTokenIdSecond)).to.be.true;

        await managedNFTManager.connect(signers.fenixTeam).onAttachToManagedNFT(userTokenIdSecond, managedTokenIdSecond);

        expect(await managedNFTManager.tokensInfo(userTokenIdFirst)).to.be.deep.eq([true, managedTokenIdFirst, ethers.parseEther('1')]);
        expect(await managedNFTManager.tokensInfo(userTokenIdSecond)).to.be.deep.eq([true, managedTokenIdSecond, ethers.parseEther('3')]);
        expect(await managedNFTManager.managedTokensInfo(managedTokenIdFirst)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
        expect(await managedNFTManager.managedTokensInfo(managedTokenIdSecond)).to.be.deep.eq([true, false, ZERO_ADDRESS]);
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenIdFirst)).to.be.eq(managedTokenIdFirst);
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenIdSecond)).to.be.eq(managedTokenIdSecond);
        expect(await managedNFTManager.isAttachedNFT(userTokenIdFirst)).to.be.true;
        expect(await managedNFTManager.isAttachedNFT(userTokenIdSecond)).to.be.true;
        expect(await managedNFTManager.isDisabledNFT(managedTokenIdFirst)).to.be.false;
        expect(await managedNFTManager.isDisabledNFT(managedTokenIdSecond)).to.be.false;
        expect(await managedNFTManager.isManagedNFT(managedTokenIdFirst)).to.be.true;
        expect(await managedNFTManager.isManagedNFT(managedTokenIdSecond)).to.be.true;
      });
    });
  });
});

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ZERO_ADDRESS, getAccessControlError } from '../utils/constants';

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable__factory,
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  ICompoundVeFNXManagedNFTStrategy,
  ISingelTokenVirtualRewarder,
  ManagedNFTManagerUpgradeable,
  RouterV2PathProviderUpgradeable,
  SingelTokenVirtualRewarderUpgradeable,
} from '../../typechain-types';
import completeFixture, { CoreFixtureDeployed, SignersList, deployTransaperntUpgradeableProxy } from '../utils/coreFixture';

describe('CompoundVeFNXManagedStrategyFactory Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;

  let factory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable__factory;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let strategyImplementation: CompoundVeFNXManagedNFTStrategyUpgradeable;
  let virtualRewarderImplementation: SingelTokenVirtualRewarderUpgradeable;
  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;

  async function deployStrategy(
    deployer: HardhatEthersSigner,
    proxyAdmin: string,
  ): Promise<CompoundVeFNXManagedNFTStrategyFactoryUpgradeable> {
    const factory = await ethers.getContractFactory('CompoundVeFNXManagedNFTStrategyFactoryUpgradeable');
    const implementation = await factory.connect(deployer).deploy(deployer.address);
    const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
    const attached = factory.attach(proxy.target) as CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
    return attached;
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    managedNFTManager = deployed.managedNFTManager;

    let routerV2Impl = await ethers.deployContract('RouterV2PathProviderUpgradeable', [signers.blastGovernor.address]);
    const proxy = await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await routerV2Impl.getAddress());
    routerV2PathProvider = (await ethers.getContractFactory('RouterV2PathProviderUpgradeable')).attach(
      proxy.target,
    ) as RouterV2PathProviderUpgradeable;

    factory = (await ethers.getContractFactory(
      'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
    )) as any as CompoundVeFNXManagedNFTStrategyFactoryUpgradeable__factory;
    strategyFactory = await deployStrategy(signers.deployer, signers.proxyAdmin.address);

    strategyImplementation = await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address]);
    virtualRewarderImplementation = await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address]);

    await strategyFactory.initialize(
      signers.blastGovernor.address,
      strategyImplementation.target,
      virtualRewarderImplementation.target,
      managedNFTManager.target,
      routerV2PathProvider.target,
    );
  });

  describe('Deployment', async function () {
    it('Should fail if try call initialize on implementation', async function () {
      let impl = await factory.deploy(signers.blastGovernor.address);
      await expect(
        impl.initialize(
          signers.blastGovernor.address,
          strategyImplementation.target,
          virtualRewarderImplementation.target,
          managedNFTManager.target,
          routerV2PathProvider.target,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('Should fail if try second time to initialize', async function () {
      await expect(
        strategyFactory.initialize(
          signers.blastGovernor.address,
          strategyImplementation.target,
          virtualRewarderImplementation.target,
          managedNFTManager.target,
          routerV2PathProvider.target,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('present STRATEGY_CREATOR_ROLE', async function () {
      expect(await strategyFactory.STRATEGY_CREATOR_ROLE()).to.be.eq('0x974f532b885822aa67c496025edc0d21d1b01330ef4544fd7568b84d33659f25');
    });

    it('Should correct set initial settings', async function () {
      expect(await strategyFactory.defaultBlastGovernor()).to.be.equal(signers.blastGovernor.address);
      expect(await strategyFactory.virtualRewarderImplementation()).to.be.equal(virtualRewarderImplementation.target);
      expect(await strategyFactory.strategyImplementation()).to.be.equal(strategyImplementation.target);
      expect(await strategyFactory.managedNFTManager()).to.be.equal(managedNFTManager.target);
    });

    it('Should fail if one of main address is zero', async function () {
      let proxy = await deployStrategy(signers.deployer, signers.proxyAdmin.address);

      await expect(
        proxy.initialize(
          ZERO_ADDRESS,
          strategyImplementation.target,
          virtualRewarderImplementation.target,
          managedNFTManager.target,
          routerV2PathProvider.target,
        ),
      ).to.be.revertedWithCustomError(proxy, 'AddressZero');

      await expect(
        proxy.initialize(
          signers.blastGovernor.address,
          ZERO_ADDRESS,
          virtualRewarderImplementation.target,
          managedNFTManager.target,
          routerV2PathProvider.target,
        ),
      ).to.be.revertedWithCustomError(proxy, 'AddressZero');
      await expect(
        proxy.initialize(
          signers.blastGovernor.address,
          strategyImplementation.target,
          ZERO_ADDRESS,
          managedNFTManager.target,
          routerV2PathProvider.target,
        ),
      ).to.be.revertedWithCustomError(proxy, 'AddressZero');
      await expect(
        proxy.initialize(
          signers.blastGovernor.address,
          strategyImplementation.target,
          virtualRewarderImplementation.target,
          ZERO_ADDRESS,
          routerV2PathProvider.target,
        ),
      ).to.be.revertedWithCustomError(proxy, 'AddressZero');
      await expect(
        proxy.initialize(
          signers.blastGovernor.address,
          strategyImplementation.target,
          virtualRewarderImplementation.target,
          managedNFTManager.target,
          ZERO_ADDRESS,
        ),
      ).to.be.revertedWithCustomError(proxy, 'AddressZero');
    });
  });
  describe('Create strategy', async function () {
    it('fail if call frmo not creator role', async () => {
      await expect(strategyFactory.connect(signers.otherUser1).createStrategy('1')).to.be.revertedWith(
        getAccessControlError(await strategyFactory.STRATEGY_CREATOR_ROLE(), signers.otherUser1.address),
      );
    });
    describe('Should corectly create new strategy', async function () {
      let deployedTx: any;
      let deployStrategyAddress: string;
      let expectedStrategyAddress: string;
      let expectedVirtualRewarder: string;

      beforeEach(async function () {
        deployStrategyAddress = await strategyFactory.createStrategy.staticCall('First Strategy');
        expectedStrategyAddress = ethers.getCreateAddress({
          from: await strategyFactory.getAddress(),
          nonce: 1,
        });
        expectedVirtualRewarder = ethers.getCreateAddress({
          from: await strategyFactory.getAddress(),
          nonce: 2,
        });
        deployedTx = await strategyFactory.createStrategy('First Strategy');
      });

      it('correct emit event', async () => {
        await expect(deployedTx)
          .to.be.emit(strategyFactory, 'CreateStrategy')
          .withArgs(expectedStrategyAddress, expectedVirtualRewarder, 'First Strategy');
      });

      it('deployed addresses is expected', async () => {
        let strategy = (await ethers.getContractAt(
          'ICompoundVeFNXManagedNFTStrategy',
          expectedStrategyAddress,
        )) as ICompoundVeFNXManagedNFTStrategy;
        expect(deployStrategyAddress).to.be.eq(expectedStrategyAddress);
        expect(await strategy.virtualRewarder()).to.be.eq(expectedVirtualRewarder);
      });

      it('Fail if try initialize second time deployed contracts', async function () {
        let strategy = (await ethers.getContractAt(
          'ICompoundVeFNXManagedNFTStrategy',
          expectedStrategyAddress,
        )) as ICompoundVeFNXManagedNFTStrategy;
        await expect(strategy.initialize(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, '123')).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
        let virtualRewarder = (await ethers.getContractAt(
          'ISingelTokenVirtualRewarder',
          expectedVirtualRewarder,
        )) as ISingelTokenVirtualRewarder;
        await expect(virtualRewarder.initialize(ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });

      it('Should corect initialize deployed strategy', async function () {
        let strategy = (await ethers.getContractAt(
          'ICompoundVeFNXManagedNFTStrategy',
          expectedStrategyAddress,
        )) as ICompoundVeFNXManagedNFTStrategy;

        expect(await strategy.voter()).to.be.equal(await managedNFTManager.voter());
        expect(await strategy.votingEscrow()).to.be.equal(await managedNFTManager.votingEscrow());
        expect(await strategy.virtualRewarder()).to.be.equal(expectedVirtualRewarder);
        expect(await strategy.name()).to.be.equal('First Strategy');
      });

      it('Should corect initialize deployed virtualRewarder', async function () {
        let virtualRewarder = (await ethers.getContractAt(
          'ISingelTokenVirtualRewarder',
          expectedVirtualRewarder,
        )) as ISingelTokenVirtualRewarder;
        expect(await virtualRewarder.strategy()).to.be.equal(expectedStrategyAddress);
      });

      it('Deployed virtualRewarde should get implementation from factory implementation slot', async function () {
        expect(
          '0x' +
            (
              await ethers.provider.getStorage(
                expectedVirtualRewarder,
                '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
              )
            ).substring(26),
        ).to.be.equal((await strategyFactory.virtualRewarderImplementation()).toLowerCase());
      });
      it('Deployed strategy should get implementation from factory implementation slot', async function () {
        expect(
          '0x' +
            (
              await ethers.provider.getStorage(
                expectedStrategyAddress,
                '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
              )
            ).substring(26),
        ).to.be.equal((await strategyFactory.strategyImplementation()).toLowerCase());
      });
    });
  });
  describe('#setDefaultBlastGovernor', async () => {
    it('fails if caller not DEFAULT_ADMIN_ROLE', async () => {
      await expect(strategyFactory.connect(signers.otherUser1).setDefaultBlastGovernor(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
      );
    });
    it('fails if try set ZERO_ADDRESS', async () => {
      await strategyFactory.grantRole(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.deployer.address);
      await expect(strategyFactory.setDefaultBlastGovernor(ZERO_ADDRESS)).to.be.revertedWithCustomError(strategyFactory, 'AddressZero');
    });
    it('success set new default blast governor address and emit event', async () => {
      await strategyFactory.grantRole(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.deployer.address);

      expect(await strategyFactory.defaultBlastGovernor()).to.be.eq(signers.blastGovernor.address);

      await expect(strategyFactory.connect(signers.deployer).setDefaultBlastGovernor(signers.otherUser1.address))
        .to.be.emit(strategyFactory, 'SetDefaultBlastGovernor')
        .withArgs(signers.blastGovernor.address, signers.otherUser1.address);

      expect(await strategyFactory.defaultBlastGovernor()).to.be.eq(signers.otherUser1.address);
    });
  });
  describe('#setRouterV2PathProvider', async () => {
    it('fails if caller not DEFAULT_ADMIN_ROLE', async () => {
      await expect(strategyFactory.connect(signers.otherUser1).setRouterV2PathProvider(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
      );
    });
    it('fails if try set ZERO_ADDRESS', async () => {
      await strategyFactory.grantRole(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.deployer.address);
      await expect(strategyFactory.setRouterV2PathProvider(ZERO_ADDRESS)).to.be.revertedWithCustomError(strategyFactory, 'AddressZero');
    });
    it('success set new default blast governor address and emit event', async () => {
      await strategyFactory.grantRole(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.deployer.address);

      expect(await strategyFactory.routerV2PathProvider()).to.be.eq(routerV2PathProvider.target);

      await expect(strategyFactory.connect(signers.deployer).setRouterV2PathProvider(signers.otherUser1.address))
        .to.be.emit(strategyFactory, 'SetRouterV2PathProvider')
        .withArgs(routerV2PathProvider.target, signers.otherUser1.address);

      expect(await strategyFactory.routerV2PathProvider()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('change implementations', async () => {
    it('fails if caller not DEFAULT_ADMIN_ROLE', async () => {
      await expect(
        strategyFactory.connect(signers.otherUser1).changeVirtualRewarderImplementation(signers.otherUser1.address),
      ).to.be.revertedWith(getAccessControlError(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address));
      await expect(strategyFactory.connect(signers.otherUser1).changeStrategyImplementation(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await strategyFactory.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
      );
    });
    it('fails if try upgrade to zero adrerss', async () => {
      await expect(strategyFactory.changeVirtualRewarderImplementation(ZERO_ADDRESS)).to.be.revertedWithCustomError(
        strategyFactory,
        'AddressZero',
      );
      await expect(strategyFactory.changeStrategyImplementation(ZERO_ADDRESS)).to.be.revertedWithCustomError(
        strategyFactory,
        'AddressZero',
      );
    });
    it('correct change virtual rewarder implementation', async () => {
      expect(await strategyFactory.virtualRewarderImplementation()).to.be.eq(virtualRewarderImplementation.target);
      await expect(strategyFactory.changeVirtualRewarderImplementation(signers.otherUser1.address))
        .to.be.emit(strategyFactory, 'ChangeVirtualRewarderImplementation')
        .withArgs(virtualRewarderImplementation.target, signers.otherUser1.address);
      expect(await strategyFactory.virtualRewarderImplementation()).to.be.eq(signers.otherUser1.address);
    });
    it('correct change strategy implementation', async () => {
      expect(await strategyFactory.strategyImplementation()).to.be.eq(strategyImplementation.target);
      await expect(strategyFactory.changeStrategyImplementation(signers.otherUser1.address))
        .to.be.emit(strategyFactory, 'ChangeStrategyImplementation')
        .withArgs(strategyImplementation.target, signers.otherUser1.address);
      expect(await strategyFactory.strategyImplementation()).to.be.eq(signers.otherUser1.address);
    });
  });
});

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable__factory,
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  SingelTokenVirtualRewarderUpgradeable,
} from '../../typechain-types';
import { ERRORS, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../utils/coreFixture';

describe('CompoundVeFNXManagedStrategy Contract', function () {
  const _WEEK = 86400 * 7;

  async function currentEpoch() {
    return Math.floor(Math.floor((await time.latest()) / _WEEK) * _WEEK);
  }

  async function nextEpoch() {
    return Math.floor((await currentEpoch()) + _WEEK);
  }

  async function previuesEpoch() {
    return Math.floor((await currentEpoch()) - _WEEK);
  }

  let signers: SignersList;
  let deployed: CoreFixtureDeployed;

  let factory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable__factory;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let strategyImplementation: CompoundVeFNXManagedNFTStrategyUpgradeable;
  let virtualRewarderImplementation: SingelTokenVirtualRewarderUpgradeable;
  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;

  let firstStrategy: CompoundVeFNXManagedNFTStrategyUpgradeable;
  let virtualRewarder: SingelTokenVirtualRewarderUpgradeable;

  let managedNftId: bigint;
  let userNftId: bigint;
  let routerV2: RouterV2;

  async function deployStrategyFactory(
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
    strategyFactory = await deployStrategyFactory(signers.deployer, signers.proxyAdmin.address);

    strategyImplementation = await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address]);
    virtualRewarderImplementation = await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address]);
    routerV2 = await ethers.deployContract('RouterV2', [
      signers.blastGovernor.address,
      deployed.v2PairFactory.target,
      WETH_PREDEPLOYED_ADDRESS,
    ]);

    await routerV2PathProvider.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target);
    await strategyFactory.initialize(
      signers.blastGovernor.address,
      strategyImplementation.target,
      virtualRewarderImplementation.target,
      managedNFTManager.target,
      routerV2PathProvider.target,
    );

    await strategyFactory.grantRole(await strategyFactory.STRATEGY_CREATOR_ROLE(), signers.deployer.address);

    let strategyAddress = await strategyFactory.createStrategy.staticCall('VeMax');
    await strategyFactory.createStrategy('VeMax');

    firstStrategy = await ethers.getContractAt('CompoundVeFNXManagedNFTStrategyUpgradeable', strategyAddress);

    virtualRewarder = await ethers.getContractAt('SingelTokenVirtualRewarderUpgradeable', await firstStrategy.virtualRewarder());

    managedNftId = await managedNFTManager.createManagedNFT.staticCall(firstStrategy.target);

    await managedNFTManager.createManagedNFT(firstStrategy.target);

    await deployed.fenix.approve(deployed.votingEscrow.target, ethers.parseEther('10000'));

    userNftId = await deployed.votingEscrow.create_lock_for.staticCall(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
    await deployed.votingEscrow.create_lock_for(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address);
  });

  describe('Deployment', async function () {
    it('Should fail if try second time to initialize', async function () {
      await expect(
        firstStrategy.initialize(
          signers.blastGovernor.address,
          managedNFTManager.target,
          ZERO_ADDRESS,
          routerV2PathProvider.target,
          'VeMax',
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('Should correct set initial settings', async function () {
      expect(await firstStrategy.fenix()).to.be.equal(deployed.fenix.target);
      expect(await firstStrategy.routerV2PathProvider()).to.be.equal(routerV2PathProvider.target);
      expect(await firstStrategy.managedNFTManager()).to.be.equal(managedNFTManager.target);
      expect(await firstStrategy.virtualRewarder()).to.be.not.equal(ZERO_ADDRESS);
    });
  });

  describe('#setRouterV2PathProvider', async () => {
    it('fails if caller not DEFAULT_ADMIN_ROLE', async () => {
      await expect(
        firstStrategy.connect(signers.otherUser1).setRouterV2PathProvider(signers.otherUser1.address),
      ).to.be.revertedWithCustomError(firstStrategy, 'AccessDenied');
    });
    it('fails if try set ZERO_ADDRESS', async () => {
      await managedNFTManager.grantRole(await managedNFTManager.DEFAULT_ADMIN_ROLE(), signers.deployer.address);
      await expect(firstStrategy.setRouterV2PathProvider(ZERO_ADDRESS)).to.be.revertedWithCustomError(firstStrategy, 'AddressZero');
    });
    it('success set new default blast governor address and emit event', async () => {
      await managedNFTManager.grantRole(await managedNFTManager.DEFAULT_ADMIN_ROLE(), signers.deployer.address);

      expect(await firstStrategy.routerV2PathProvider()).to.be.eq(routerV2PathProvider.target);

      await expect(firstStrategy.connect(signers.deployer).setRouterV2PathProvider(signers.otherUser1.address))
        .to.be.emit(firstStrategy, 'SetRouterV2PathProvider')
        .withArgs(routerV2PathProvider.target, signers.otherUser1.address);

      expect(await firstStrategy.routerV2PathProvider()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#onAttach', async () => {
    it('fails if caller not managed nft manager', async () => {
      await expect(firstStrategy.connect(signers.otherUser1).onAttach(1, 1)).to.be.revertedWithCustomError(firstStrategy, 'AccessDenied');
    });
    it('success store user attached nft balance like deposit in virtual rewarder', async () => {
      expect(await deployed.votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ZERO);
      expect(await virtualRewarder.totalSupply()).to.be.eq(ZERO);
      expect(await firstStrategy.totalSupply()).to.be.eq(ZERO);

      let tx = await deployed.voter.connect(signers.otherUser1).attachToManagedNFT(userNftId, managedNftId);
      await expect(tx).to.be.emit(firstStrategy, 'OnAttach').withArgs(userNftId, ethers.parseEther('1'));
      await expect(tx)
        .to.be.emit(virtualRewarder, 'Deposit')
        .withArgs(userNftId, ethers.parseEther('1'), await currentEpoch());

      expect(await virtualRewarder.totalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await virtualRewarder.balanceOf(userNftId)).to.be.eq(ethers.parseEther('1'));
      expect(await firstStrategy.totalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await firstStrategy.balanceOf(userNftId)).to.be.eq(ethers.parseEther('1'));
    });
  });

  describe('#onDettach', async () => {
    it('fails if caller not managed nft manager', async () => {
      await expect(firstStrategy.connect(signers.otherUser1).onDettach(1, 1)).to.be.revertedWithCustomError(firstStrategy, 'AccessDenied');
    });
    it('success remove user balance from virtual rewarder without rewards', async () => {
      await deployed.voter.connect(signers.otherUser1).attachToManagedNFT(userNftId, managedNftId);

      expect(await virtualRewarder.totalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await virtualRewarder.balanceOf(userNftId)).to.be.eq(ethers.parseEther('1'));
      expect(await firstStrategy.totalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await firstStrategy.balanceOf(userNftId)).to.be.eq(ethers.parseEther('1'));

      let tx = await deployed.voter.connect(signers.otherUser1).dettachFromManagedNFT(userNftId);
      await expect(tx).to.be.emit(firstStrategy, 'OnDettach').withArgs(userNftId, ethers.parseEther('1'), ZERO);
      await expect(tx)
        .to.be.emit(virtualRewarder, 'Withdraw')
        .withArgs(userNftId, ethers.parseEther('1'), await currentEpoch());

      expect(await virtualRewarder.totalSupply()).to.be.eq(ZERO);
      expect(await virtualRewarder.balanceOf(userNftId)).to.be.eq(ZERO);
      expect(await firstStrategy.totalSupply()).to.be.eq(ZERO);
      expect(await firstStrategy.balanceOf(userNftId)).to.be.eq(ZERO);
    });

    it('success remove user balance from virtual rewarder with rewards', async () => {
      await deployed.voter.connect(signers.otherUser1).attachToManagedNFT(userNftId, managedNftId);

      expect(await virtualRewarder.totalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await virtualRewarder.balanceOf(userNftId)).to.be.eq(ethers.parseEther('1'));

      expect(await virtualRewarder.calculateAvailableRewardsAmount(userNftId)).to.be.eq(ZERO);
      expect(await firstStrategy.getLockedRewardsBalance(userNftId)).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());

      await deployed.fenix.transfer(firstStrategy.target, ethers.parseEther('22'));

      await firstStrategy.compound();

      expect(await virtualRewarder.calculateAvailableRewardsAmount(userNftId)).to.be.eq(ethers.parseEther('22'));
      expect(await firstStrategy.getLockedRewardsBalance(userNftId)).to.be.eq(ethers.parseEther('22'));

      await time.increase(3600);

      let tx = await deployed.voter.connect(signers.otherUser1).dettachFromManagedNFT(userNftId);
      await time.increase(3600);
      await expect(tx).to.be.emit(firstStrategy, 'OnDettach').withArgs(userNftId, ethers.parseEther('1'), ethers.parseEther('22'));
      await expect(tx)
        .to.be.emit(virtualRewarder, 'Withdraw')
        .withArgs(userNftId, ethers.parseEther('1'), await currentEpoch());
      await expect(tx)
        .to.be.emit(virtualRewarder, 'Harvest')
        .withArgs(userNftId, ethers.parseEther('22'), await currentEpoch());
      expect(await virtualRewarder.totalSupply()).to.be.eq(ZERO);
      expect(await virtualRewarder.balanceOf(userNftId)).to.be.eq(ZERO);
    });
  });

  describe('#compound', async () => {
    it('can be called by anyone and to revert if zero fenix balance', async () => {
      await firstStrategy.connect(signers.otherUser1).compound();
    });

    it('should add all fenix balance to balance ManagedVeNft and notify reward in virtual rewarder', async () => {
      await deployed.fenix.transfer(firstStrategy.target, ethers.parseEther('55'));

      expect(await virtualRewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(ZERO);

      expect(await deployed.fenix.balanceOf(firstStrategy.target)).to.be.eq(ethers.parseEther('55'));
      expect(await deployed.votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ZERO);
      let tx = await firstStrategy.connect(signers.otherUser1).compound();
      await expect(tx)
        .to.be.emit(virtualRewarder, 'NotifyReward')
        .withArgs(ethers.parseEther('55'), await currentEpoch());
      await expect(tx).to.be.emit(firstStrategy, 'Compound').withArgs(signers.otherUser1.address, ethers.parseEther('55'));
      expect(await virtualRewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(ethers.parseEther('55'));

      expect(await deployed.fenix.balanceOf(firstStrategy.target)).to.be.eq(ZERO);
      expect(await deployed.votingEscrow.balanceOfNFT(managedNftId)).to.be.eq(ethers.parseEther('55'));
      expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('56')); // 55 for managed + 1 from user nft id
    });
  });

  describe('#erc20Recover', async () => {
    it('fails if caller not admin', async () => {
      await expect(
        firstStrategy.connect(signers.otherUser1).erc20Recover(deployed.fenix.target, signers.otherUser1.address),
      ).to.be.revertedWithCustomError(firstStrategy, 'AccessDenied');
    });
    it('fails if try recover fenix', async () => {
      await expect(firstStrategy.erc20Recover(deployed.fenix.target, signers.otherUser1.address)).to.be.revertedWithCustomError(
        firstStrategy,
        'IncorrectRecoverToken',
      );
    });
    it('fails if try recover router allowed tokens', async () => {
      let token = await deployERC20MockToken(signers.deployer, 't', 't', 6);

      expect(await routerV2PathProvider.isAllowedTokenInInputRoutes(token.target)).to.be.false;

      await expect(firstStrategy.erc20Recover(token.target, signers.otherUser1.address)).to.be.not.reverted;

      await routerV2PathProvider.setAllowedTokenInInputRouters(token.target, true);
      expect(await routerV2PathProvider.isAllowedTokenInInputRoutes(token.target)).to.be.true;

      await expect(firstStrategy.erc20Recover(token.target, signers.otherUser1.address)).to.be.revertedWithCustomError(
        firstStrategy,
        'IncorrectRecoverToken',
      );
    });
    it('success recover erc20 token', async () => {
      let token = await deployERC20MockToken(signers.deployer, 't', 't', 6);
      await token.mint(firstStrategy.target, 1e6);

      expect(await token.balanceOf(signers.otherUser2.address)).to.be.eq(ZERO);
      expect(await token.balanceOf(firstStrategy.target)).to.be.eq(1e6);

      await expect(firstStrategy.erc20Recover(token.target, signers.otherUser2.address))
        .to.be.emit(firstStrategy, 'Erc20Recover')
        .withArgs(signers.deployer.address, signers.otherUser2.address, token.target, 1e6);

      expect(await token.balanceOf(signers.otherUser2.address)).to.be.eq(1e6);
      expect(await token.balanceOf(firstStrategy)).to.be.eq(ZERO);
    });
  });

  describe('Buyback functionality', async () => {
    it('buyback target token should return fenix ', async () => {
      expect(await firstStrategy.getBuybackTargetToken()).to.be.eq(deployed.fenix.target);
    });
    describe('#buybackByV2', async () => {
      it('fails if caller not admin or authorized user', async () => {
        await expect(
          firstStrategy.connect(signers.otherUser1).buybackTokenByV2(signers.otherUser1.address, [], 1, 1),
        ).to.be.revertedWithCustomError(firstStrategy, 'AccessDenied');

        await managedNFTManager.setAuthorizedUser(managedNftId, signers.otherUser1.address);

        await expect(
          firstStrategy.connect(signers.otherUser1).buybackTokenByV2(signers.otherUser1.address, [], 1, 1),
        ).to.be.not.revertedWithCustomError(firstStrategy, 'AccessDenied');
      });
    });
  });
});

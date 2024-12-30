import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  Fenix,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VeFnxDistributorUpgradeable,
  VeFnxDistributorUpgradeable__factory,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import { ERRORS, getAccessControlError, ONE, ONE_ETHER, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployTransaperntUpgradeableProxy } from '../utils/coreFixture';

describe('VeFnxDistributorUpgradeable', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;

  let factory: VeFnxDistributorUpgradeable__factory;
  let fenix: Fenix;
  let veFnxDistributor: VeFnxDistributorUpgradeable;
  let votingEscrow: VotingEscrowUpgradeableV2;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;
  let managedNFTManager: ManagedNFTManagerUpgradeable;
  let DEFAULT_DISTRIBUTON_REASON = 'Rise';
  let MAX_LOCK_DURATION = 86400 * 182;

  async function newStrategy() {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await strategyFactory.createStrategy.staticCall('VeMax'),
    );
    await strategyFactory.createStrategy('VeMax');
    return strategy;
  }

  async function deployStrategyFactory() {
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
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = deployed.fenix;

    factory = await ethers.getContractFactory('VeFnxDistributorUpgradeable');
    veFnxDistributor = deployed.veFnxDistributor;
    votingEscrow = deployed.votingEscrow;

    managedNFTManager = deployed.managedNFTManager;

    await deployStrategyFactory();

    await veFnxDistributor.grantRole(ethers.id('WITHDRAWER_ROLE'), signers.deployer);
    await veFnxDistributor.grantRole(ethers.id('DISTRIBUTOR_ROLE'), signers.deployer);
    await veFnxDistributor.setWhitelistReasons([DEFAULT_DISTRIBUTON_REASON], [true]);
  });

  describe('Deployment', async () => {
    it('Should fail if try initialize on implementation', async function () {
      let implementation = await factory.deploy(signers.deployer.address);
      await expect(implementation.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try second time initialize', async function () {
      await expect(veFnxDistributor.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try set zero address', async function () {
      let implementation = await factory.deploy(signers.deployer.address);

      const distributor = factory.attach(
        await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress()),
      ) as VeFnxDistributorUpgradeable;
      await expect(distributor.initialize(ZERO_ADDRESS, fenix.target, votingEscrow.target)).to.be.revertedWithCustomError(
        distributor,
        'AddressZero',
      );
      await expect(distributor.initialize(signers.blastGovernor.address, ZERO_ADDRESS, votingEscrow.target)).to.be.revertedWithCustomError(
        distributor,
        'AddressZero',
      );
      await expect(distributor.initialize(signers.blastGovernor.address, fenix.target, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        distributor,
        'AddressZero',
      );
    });

    it('Should correct setup parameters and grant admin role for deployer', async function () {
      expect(await veFnxDistributor.fenix()).to.be.eq(fenix.target);
      expect(await veFnxDistributor.votingEscrow()).to.be.eq(votingEscrow.target);
      expect(await veFnxDistributor.hasRole(await veFnxDistributor.DEFAULT_ADMIN_ROLE(), signers.deployer)).to.be.true;
    });
  });

  describe('whitelist reasons', async () => {
    it('isWhitelistedReason should return false if reason not whitelist', async () => {
      expect(await veFnxDistributor.isWhitelistedReason('1')).to.be.false;
      expect(await veFnxDistributor.isWhitelistedReason('123456')).to.be.false;
    });
    it('isWhitelistReason should return true, if success whitelist', async () => {
      expect(await veFnxDistributor.isWhitelistedReason('Rise')).to.be.true;
    });
    it('Char case is important, should return false, if some char in diff case ', async () => {
      expect(await veFnxDistributor.isWhitelistedReason('rise')).to.be.false;
      expect(await veFnxDistributor.isWhitelistedReason('rIse')).to.be.false;
    });

    describe('setWhitelistReasons', async () => {
      it('should fail if try call from not default admin role', async () => {
        await expect(veFnxDistributor.connect(signers.otherUser1).setWhitelistReasons([], [])).to.be.revertedWith(
          getAccessControlError(await veFnxDistributor.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
        );
      });
      it('should fail if provide arraies with diff length', async () => {
        await expect(veFnxDistributor.setWhitelistReasons(['Rise'], [])).to.be.revertedWithCustomError(
          veFnxDistributor,
          'ArrayLengthMismatch',
        );
        await expect(veFnxDistributor.setWhitelistReasons(['Rise', 'Rise2'], [true])).to.be.revertedWithCustomError(
          veFnxDistributor,
          'ArrayLengthMismatch',
        );
        await expect(veFnxDistributor.setWhitelistReasons(['Rise'], [true, false])).to.be.revertedWithCustomError(
          veFnxDistributor,
          'ArrayLengthMismatch',
        );
      });

      it('success whitelist distribution reason', async () => {
        expect(await veFnxDistributor.isWhitelistedReason('1')).to.be.false;
        expect(await veFnxDistributor.isWhitelistedReason('2')).to.be.false;
        expect(await veFnxDistributor.isWhitelistedReason('3')).to.be.false;
        expect(await veFnxDistributor.isWhitelistedReason('Rise')).to.be.true;

        let tx = await veFnxDistributor.setWhitelistReasons(['1', '2', '3', 'Rise'], [true, false, true, false]);

        await expect(tx).to.be.emit(veFnxDistributor, 'SetWhitelistReasons').withArgs(['1', '2', '3', 'Rise'], [true, false, true, false]);

        expect(await veFnxDistributor.isWhitelistedReason('1')).to.be.true;
        expect(await veFnxDistributor.isWhitelistedReason('2')).to.be.false;
        expect(await veFnxDistributor.isWhitelistedReason('3')).to.be.true;
        expect(await veFnxDistributor.isWhitelistedReason('Rise')).to.be.false;
      });
    });
  });

  describe('#recoverTokens', async () => {
    it('should fail if try call from not WITHDRAWER_ROLE', async () => {
      await expect(veFnxDistributor.connect(signers.otherUser1).recoverTokens(fenix.target, 1)).to.be.revertedWith(
        getAccessControlError(ethers.id('WITHDRAWER_ROLE'), signers.otherUser1.address),
      );
    });
    it('should fail if try recover more tokens than balance', async () => {
      await expect(veFnxDistributor.recoverTokens(fenix.target, ONE)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
    it('should correct call and recover erc20 tokens from contract', async () => {
      await fenix.transfer(veFnxDistributor.target, 1);

      expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ONE);

      await expect(veFnxDistributor.recoverTokens(fenix.target, 1))
        .to.be.emit(veFnxDistributor, 'RecoverToken')
        .withArgs(fenix.target, ONE);

      expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ZERO);
    });
  });

  describe('#distributeVeFnx', async () => {
    it('Should fail if try call from not DISTRIBUTOR_ROLE', async function () {
      await expect(
        veFnxDistributor.connect(signers.otherUser1).distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            amount: ONE,
            withPermanentLock: false,
            lockDuration: MAX_LOCK_DURATION,
            managedTokenIdForAttach: 0,
          },
        ]),
      ).to.be.revertedWith(getAccessControlError(ethers.id('DISTRIBUTOR_ROLE'), signers.otherUser1.address));
    });

    it('Should fail if not enought balance on contract for distribute', async function () {
      expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ZERO);

      await expect(
        veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            amount: ONE,
            lockDuration: MAX_LOCK_DURATION,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ]),
      ).to.be.revertedWithCustomError(veFnxDistributor, 'InsufficientBalance');

      await fenix.transfer(veFnxDistributor.target, 1);

      await expect(
        veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ]),
      ).to.be.not.revertedWithCustomError(veFnxDistributor, 'InsufficientBalance');

      expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ZERO);

      await fenix.transfer(veFnxDistributor.target, ONE_ETHER);

      await expect(
        veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER - ONE,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser2.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser3.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ]),
      ).to.be.revertedWithCustomError(veFnxDistributor, 'InsufficientBalance');

      await expect([
        { recipient: signers.otherUser1.address, amount: ONE_ETHER - ONE, withPermanentLock: false, managedTokenIdForAttach: 0 },
        { recipient: signers.otherUser2.address, amount: ONE, withPermanentLock: false, managedTokenIdForAttach: 0 },
      ]).to.be.not.revertedWithCustomError(veFnxDistributor, 'InsufficientBalance');
    });

    it('Should revert if reason not whitelisted', async () => {
      await expect(veFnxDistributor.distributeVeFnx('Whitelisted', [])).to.be.revertedWithCustomError(
        veFnxDistributor,
        'NotWhitelistedReason',
      );
    });

    describe('Correct distribute veFnx to recipients with permanent lock and attach to managed token id', async () => {
      let startTokenId: bigint;
      let managedTokenId: bigint;
      beforeEach(async () => {
        await fenix.transfer(veFnxDistributor.target, ethers.parseEther('1000'));
        expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ethers.parseEther('1000'));
        let strategy = await newStrategy();
        await managedNFTManager.createManagedNFT(strategy);
        managedTokenId = await votingEscrow.lastMintedTokenId();

        startTokenId = await votingEscrow.lastMintedTokenId();
      });

      it('should corect create VeFNX with diff amounts & withPermanentLock & attach to managed token id', async () => {
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOf(signers.otherUser4.address)).to.be.eq(ZERO);
        DEFAULT_DISTRIBUTON_REASON;
        let tx = await veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ethers.parseEther('1'),
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser2.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ethers.parseEther('2'),
            withPermanentLock: true,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser3.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ethers.parseEther('3'),
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser4.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ethers.parseEther('4'),
            withPermanentLock: true,
            managedTokenIdForAttach: managedTokenId,
          },
        ]);

        expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ethers.parseEther('990'));
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser4.address)).to.be.eq(1);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('10'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('6'));

        expect(await votingEscrow.ownerOf(startTokenId + 1n)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(startTokenId + 2n)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(startTokenId + 3n)).to.be.eq(signers.otherUser3.address);
        expect(await votingEscrow.ownerOf(startTokenId + 4n)).to.be.eq(signers.otherUser4.address);

        let calcEpoch = Math.floor(Number(BigInt(await time.latest()) + BigInt(182 * 86400)) / (86400 * 7)) * (86400 * 7);

        let nftState = await votingEscrow.nftStates(startTokenId + 1n);
        expect(nftState.locked.end).to.be.eq(calcEpoch);
        expect(nftState.locked.amount).to.be.eq(ONE_ETHER);
        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.false;

        nftState = await votingEscrow.nftStates(startTokenId + 2n);
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('2'));
        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.true;

        nftState = await votingEscrow.nftStates(startTokenId + 3n);
        expect(nftState.locked.end).to.be.eq(calcEpoch);
        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('3'));
        expect(nftState.isAttached).to.be.false;
        expect(nftState.locked.isPermanentLocked).to.be.false;

        nftState = await votingEscrow.nftStates(startTokenId + 4n);
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(0);
        expect(nftState.isAttached).to.be.true;
        expect(nftState.locked.isPermanentLocked).to.be.false;

        expect(await managedNFTManager.getAttachedManagedTokenId(startTokenId + 4n)).to.be.eq(managedTokenId);

        nftState = await votingEscrow.nftStates(startTokenId + 4n);
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(0);
        expect(nftState.isAttached).to.be.true;
        expect(nftState.locked.isPermanentLocked).to.be.false;

        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + ONE, ONE_ETHER, calcEpoch, 1, anyValue);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + 2n, ethers.parseEther('2'), calcEpoch, 1, anyValue);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + 3n, ethers.parseEther('3'), calcEpoch, 1, anyValue);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + 4n, ethers.parseEther('4'), calcEpoch, 1, anyValue);

        await expect(tx)
          .to.be.emit(votingEscrow, 'LockPermanent')
          .withArgs(veFnxDistributor.target, startTokenId + 2n);
        await expect(tx)
          .to.be.emit(votingEscrow, 'LockPermanent')
          .withArgs(veFnxDistributor.target, startTokenId + 4n);

        await expect(tx)
          .to.be.emit(deployed.voter, 'AttachToManagedNFT')
          .withArgs(startTokenId + 4n, managedTokenId);
      });
    });
    describe('Correct distribute veFnx to recipients', async () => {
      let startTokenId: bigint;
      beforeEach(async () => {
        await fenix.transfer(veFnxDistributor.target, ethers.parseEther('1000'));
        expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ethers.parseEther('1000'));
        startTokenId = await votingEscrow.lastMintedTokenId();
      });

      it('should corect emit events', async () => {
        let tx = await veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser2.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER / BigInt(2),
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ]);
        await expect(tx)
          .to.be.emit(veFnxDistributor, 'AirdropVeFnx')
          .withArgs(signers.otherUser1.address, DEFAULT_DISTRIBUTON_REASON, 1, ONE_ETHER);
        await expect(tx)
          .to.be.emit(veFnxDistributor, 'AirdropVeFnx')
          .withArgs(signers.otherUser2.address, DEFAULT_DISTRIBUTON_REASON, 2, ONE_ETHER / BigInt(2));
        await expect(tx)
          .to.be.emit(veFnxDistributor, 'AidropVeFnxTotal')
          .withArgs(signers.deployer, DEFAULT_DISTRIBUTON_REASON, ONE_ETHER + ONE_ETHER / BigInt(2));
      });

      it('should corect change balacnes', async () => {
        let startVotingEscrowBalance = await fenix.balanceOf(votingEscrow.target);

        await veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser2.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER / BigInt(2),
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ]);

        expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ethers.parseEther('998.5'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(startVotingEscrowBalance + ethers.parseEther('1.5'));
      });
      it('should clear approve after distribution', async () => {
        expect(await fenix.allowance(veFnxDistributor.target, votingEscrow.target)).to.be.eq(ZERO);
        await veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser2.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER / BigInt(2),
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ]);
        expect(await fenix.allowance(veFnxDistributor.target, votingEscrow.target)).to.be.eq(ZERO);
      });
      it('should corect create VeFNX and transfer to recipients', async () => {
        await fenix.transfer(veFnxDistributor.target, ethers.parseEther('1000'));

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(ZERO);

        let tx = await veFnxDistributor.distributeVeFnx(DEFAULT_DISTRIBUTON_REASON, [
          {
            recipient: signers.otherUser1.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
          {
            recipient: signers.otherUser2.address,
            lockDuration: MAX_LOCK_DURATION,
            amount: ONE_ETHER / BigInt(2),
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ]);

        let calcEpoch = BigInt(await time.latest()) + BigInt(182 * 86400);
        calcEpoch = (calcEpoch / BigInt(7 * 86400)) * BigInt(7 * 86400);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + ONE, ONE_ETHER, calcEpoch, 1, anyValue);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + ONE + ONE, ONE_ETHER / BigInt(2), calcEpoch, 1, anyValue);

        expect(await votingEscrow.ownerOf(startTokenId + ONE)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(startTokenId + ONE + ONE)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('1.5'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('1.5'), ethers.parseEther('0.1'));

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        let locked1 = (await votingEscrow.nftStates(startTokenId + ONE)).locked;
        expect(locked1.end).to.be.eq(calcEpoch);
        expect(locked1.amount).to.be.eq(ONE_ETHER);

        let locked2 = (await votingEscrow.nftStates(startTokenId + ONE + ONE)).locked;
        expect(locked2.end).to.be.eq(calcEpoch);
        expect(locked2.amount).to.be.eq(ethers.parseEther('0.5'));
      });
    });

    it('Correct distribute and emits event with diff distribute reason', async () => {
      await fenix.transfer(veFnxDistributor.target, ethers.parseEther('1000'));
      expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ethers.parseEther('1000'));

      await veFnxDistributor.setWhitelistReasons(['Rise: Bribes', 'Rise: Incentives'], [true, true]);

      let tx = await veFnxDistributor.distributeVeFnx('Rise: Bribes', [
        {
          recipient: signers.otherUser1.address,
          lockDuration: MAX_LOCK_DURATION,
          amount: ONE_ETHER,
          withPermanentLock: false,
          managedTokenIdForAttach: 0,
        },
        {
          recipient: signers.otherUser2.address,
          lockDuration: MAX_LOCK_DURATION,
          amount: ONE_ETHER / BigInt(2),
          withPermanentLock: false,
          managedTokenIdForAttach: 0,
        },
      ]);
      await expect(tx).to.be.emit(veFnxDistributor, 'AirdropVeFnx').withArgs(signers.otherUser1.address, 'Rise: Bribes', 1, ONE_ETHER);
      await expect(tx)
        .to.be.emit(veFnxDistributor, 'AirdropVeFnx')
        .withArgs(signers.otherUser2.address, 'Rise: Bribes', 2, ONE_ETHER / BigInt(2));
      await expect(tx)
        .to.be.emit(veFnxDistributor, 'AidropVeFnxTotal')
        .withArgs(signers.deployer, 'Rise: Bribes', ONE_ETHER + ONE_ETHER / BigInt(2));

      tx = await veFnxDistributor.distributeVeFnx('Rise: Incentives', [
        {
          recipient: signers.otherUser1.address,
          lockDuration: MAX_LOCK_DURATION,
          amount: ONE_ETHER,
          withPermanentLock: false,
          managedTokenIdForAttach: 0,
        },
        {
          recipient: signers.otherUser2.address,
          lockDuration: MAX_LOCK_DURATION,
          amount: ONE_ETHER / BigInt(2),
          withPermanentLock: false,
          managedTokenIdForAttach: 0,
        },
      ]);
      await expect(tx).to.be.emit(veFnxDistributor, 'AirdropVeFnx').withArgs(signers.otherUser1.address, 'Rise: Incentives', 3, ONE_ETHER);
      await expect(tx)
        .to.be.emit(veFnxDistributor, 'AirdropVeFnx')
        .withArgs(signers.otherUser2.address, 'Rise: Incentives', 4, ONE_ETHER / BigInt(2));
      await expect(tx)
        .to.be.emit(veFnxDistributor, 'AidropVeFnxTotal')
        .withArgs(signers.deployer, 'Rise: Incentives', ONE_ETHER + ONE_ETHER / BigInt(2));
    });
  });
});

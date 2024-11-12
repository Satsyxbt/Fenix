import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import * as typechainTypes from '../../../typechain-types';
import { ERRORS, ONE_ETHER, WEEK, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployAlgebraCore,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../../utils/coreFixture';
import { VotingEscrowUpgradeableV2 } from '../../../typechain-types';
import { ContractTransactionResponse } from 'ethers';

describe('VotingEscrow-depositToAttachedNFT', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: typechainTypes.VoterUpgradeableV2;

  let votingEscrow: VotingEscrowUpgradeableV2;
  let veBoost: typechainTypes.VeBoostUpgradeable;
  let managedNFTManager: typechainTypes.ManagedNFTManagerUpgradeable;

  let fenix: typechainTypes.Fenix;
  let tokenTR6: typechainTypes.ERC20Mock;
  let priceProvider: typechainTypes.AlgebraFNXPriceProviderUpgradeable;
  let strategyFactory: typechainTypes.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: typechainTypes.RouterV2;
  let routerV2PathProvider: typechainTypes.RouterV2PathProviderUpgradeable;

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
    )) as typechainTypes.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;

    routerV2PathProvider = (await ethers.getContractFactory('RouterV2PathProviderUpgradeable')).attach(
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (await ethers.deployContract('RouterV2PathProviderUpgradeable', [signers.blastGovernor.address])).getAddress(),
        )
      ).target,
    ) as typechainTypes.RouterV2PathProviderUpgradeable;

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

  async function deployPriceProviderWith(
    usdToken: typechainTypes.ERC20Mock,
    usdReserve: bigint,
    fnxReserve: bigint,
  ): Promise<typechainTypes.AlgebraFNXPriceProviderUpgradeable> {
    let factoryPriceProvider = await ethers.getContractFactory('AlgebraFNXPriceProviderUpgradeable');
    let implementationPriceProvider = await factoryPriceProvider.deploy(signers.blastGovernor.address);
    priceProvider = factoryPriceProvider.attach(
      await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementationPriceProvider.getAddress()),
    ) as typechainTypes.AlgebraFNXPriceProviderUpgradeable;

    let algebraCore = await deployAlgebraCore(await deployed.blastPoints.getAddress());

    let algebraFactory = algebraCore.factory;
    await algebraFactory.grantRole(await algebraFactory.POOLS_CREATOR_ROLE(), signers.deployer.address);

    let deployedPoolAddr = await algebraCore.factory.createPool.staticCall(fenix.target, usdToken.target);

    await algebraCore.factory.createPool(fenix.target, usdToken.target);
    let pool = await ethers.getContractAt(POOL_ABI, deployedPoolAddr);

    let price = encodePriceSqrt(usdReserve, fnxReserve);
    if ((await pool.token0()) == usdToken.target) {
      price = encodePriceSqrt(fnxReserve, usdReserve);
    }
    await pool.initialize(price);

    await priceProvider.initialize(signers.blastGovernor.address, pool.target, fenix.target, usdToken.target);
    return priceProvider;
  }

  async function newStrategy() {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await strategyFactory.createStrategy.staticCall('VeMax'),
    );
    await strategyFactory.createStrategy('VeMax');
    return strategy;
  }

  async function checkNftState(
    tokenId: bigint,
    expectState: {
      amount?: bigint;
      end?: number;
      isPermanentLocked?: boolean;
      isAttached?: boolean;
      isVoted?: boolean;
      lastTranferBlock?: number;
      pointEpoch?: number;
    },
  ) {
    let nftState = await votingEscrow.nftStates(tokenId);
    if (expectState.amount) {
      expect(nftState.locked.amount).to.be.eq(expectState.amount);
    }
    if (expectState.end) {
      expect(nftState.locked.end).to.be.eq(expectState.end);
    }
    if (expectState.isAttached) {
      expect(nftState.isAttached).to.be.eq(expectState.isAttached);
    }
    if (expectState.isPermanentLocked) {
      expect(nftState.locked.isPermanentLocked).to.be.eq(expectState.isPermanentLocked);
    }
    if (expectState.isVoted) {
      expect(nftState.isVoted).to.be.eq(expectState.isVoted);
    }
    if (expectState.isAttached) {
      expect(nftState.isAttached).to.be.eq(expectState.isAttached);
    }
    if (expectState.lastTranferBlock) {
      expect(nftState.lastTranferBlock).to.be.eq(expectState.lastTranferBlock);
    }
    if (expectState.pointEpoch) {
      expect(nftState.pointEpoch).to.be.eq(expectState.pointEpoch);
    }
  }

  let mVeNftId: bigint;
  let strategy: typechainTypes.CompoundVeFNXManagedNFTStrategyUpgradeable;
  let virtualRewarder: typechainTypes.SingelTokenVirtualRewarderUpgradeable;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = deployed.fenix;
    veBoost = deployed.veBoost;
    voter = deployed.voter;
    votingEscrow = deployed.votingEscrow;
    managedNFTManager = deployed.managedNFTManager;
    tokenTR6 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);

    await deployStrategyFactory();

    await veBoost.initialize(
      signers.blastGovernor.address,
      fenix.target,
      votingEscrow.target,
      (
        await deployPriceProviderWith(tokenTR6, BigInt(1e6), ONE_ETHER)
      ).target,
    );
    await veBoost.setMinUSDAmount(1);
    await votingEscrow.updateAddress('veBoost', veBoost.target);
    mVeNftId = 1n;

    strategy = await newStrategy();
    virtualRewarder = await ethers.getContractAt('SingelTokenVirtualRewarderUpgradeable', await strategy.virtualRewarder());

    await managedNFTManager.createManagedNFT(strategy);
    await fenix.connect(signers.otherUser1).approve(votingEscrow.target, ethers.MaxUint256);
    await fenix.transfer(signers.otherUser1.address, ethers.parseEther('1000'));
    await fenix.transfer(veBoost.target, ethers.parseEther('1000'));
    await fenix.transfer(signers.otherUser3.address, ethers.parseEther('1000'));
    await fenix.connect(signers.otherUser3).approve(votingEscrow.target, ethers.MaxUint256);

    expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1000'));
    expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1000'));
    expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);

    expect(await votingEscrow.veBoost()).to.be.eq(veBoost.target);
    expect(await votingEscrow.supply()).to.be.eq(ZERO);
    expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);

    expect(await votingEscrow.totalSupply()).to.be.eq(1);
  });

  describe('should fail if', async () => {
    it('call with not exists token id', async () => {
      await expect(votingEscrow.depositToAttachedNFT(1, 1)).to.be.revertedWithCustomError(votingEscrow, 'TokenNotExist');
    });
    it('exist but not attached nft', async () => {
      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      let userTokenId_1 = await votingEscrow.lastMintedTokenId();
      await expect(votingEscrow.depositToAttachedNFT(userTokenId_1, 1)).to.be.revertedWithCustomError(votingEscrow, 'TokenNotAttached');
    });
    it('not approve tokens for deposit call', async () => {
      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      let userTokenId_1 = await votingEscrow.lastMintedTokenId();

      await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId_1, mVeNftId);

      await expect(votingEscrow.connect(signers.otherUser5).depositToAttachedNFT(userTokenId_1, ethers.parseEther('1'))).to.be.revertedWith(
        ERRORS.ERC20.InsufficientAllowance,
      );
    });

    it('insufficient user balance for deposit', async () => {
      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      let userTokenId_1 = await votingEscrow.lastMintedTokenId();
      await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId_1, mVeNftId);

      await fenix.connect(signers.otherUser5).approve(votingEscrow.target, ethers.parseEther('1'));
      await expect(votingEscrow.connect(signers.otherUser5).depositToAttachedNFT(userTokenId_1, ethers.parseEther('1'))).to.be.revertedWith(
        ERRORS.ERC20.InsufficientBalance,
      );
    });

    describe('SIDE - Voter', async () => {
      it('fail if call during distribution window', async () => {
        await votingEscrow
          .connect(signers.otherUser1)
          .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let userTokenId_1 = await votingEscrow.lastMintedTokenId();
        await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId_1, mVeNftId);

        await time.increaseTo(Math.floor((await time.latest()) / WEEK) * WEEK + WEEK - 1800);
        await voter.setDistributionWindowDuration(3600);
        await expect(votingEscrow.connect(signers.otherUser1).depositToAttachedNFT(userTokenId_1, 1)).to.be.revertedWithCustomError(
          voter,
          'DistributionWindow',
        );
      });
    });

    describe('SIDE - ManagedNftManager', async () => {
      it('fail if call for disabled mVeNFT', async () => {
        await votingEscrow
          .connect(signers.otherUser1)
          .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let userTokenId_1 = await votingEscrow.lastMintedTokenId();
        await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId_1, mVeNftId);

        await managedNFTManager.toggleDisableManagedNFT(mVeNftId);

        await expect(votingEscrow.connect(signers.otherUser1).depositToAttachedNFT(userTokenId_1, 1)).to.be.revertedWithCustomError(
          managedNFTManager,
          'ManagedNFTIsDisabled',
        );
      });
    });
  });

  describe('dettach', async () => {
    it('success dettach from veNFT with multi deposti to attached state', async () => {
      let userTokenId_1 = 1n;
      let userTokenId_2 = 1n;

      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      userTokenId_1 = await votingEscrow.lastMintedTokenId();

      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser2.address, false, false, 0);
      userTokenId_2 = await votingEscrow.lastMintedTokenId();

      await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId_1, mVeNftId);
      await votingEscrow.connect(signers.otherUser1).depositToAttachedNFT(userTokenId_1, ethers.parseEther('1'));
      await votingEscrow.connect(signers.otherUser1).depositToAttachedNFT(userTokenId_1, ethers.parseEther('2'));
      await votingEscrow.connect(signers.otherUser1).depositToAttachedNFT(userTokenId_1, ethers.parseEther('0.1'));

      expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_1)).to.be.eq(mVeNftId);
      expect((await managedNFTManager.tokensInfo(userTokenId_1)).amount).to.be.eq(ethers.parseEther('4.1'));
      expect(await virtualRewarder.balanceOf(userTokenId_1)).to.be.eq(ethers.parseEther('4.1'));
      expect(await strategy.balanceOf(userTokenId_1)).to.be.eq(ethers.parseEther('4.1'));

      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('5.1'));
      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('5.1'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('4.1'));
      expect(await votingEscrow.totalSupply()).to.be.eq(3);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser2.address);

      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(3n);
      await checkNftState(mVeNftId, { amount: ethers.parseEther('4.1'), isPermanentLocked: true, isAttached: false, end: 0 });
      await checkNftState(userTokenId_1, { amount: ethers.parseEther('0'), isPermanentLocked: false, isAttached: true, end: 0 });
      await checkNftState(userTokenId_2, { amount: ethers.parseEther('1'), isPermanentLocked: false, isAttached: false });

      await voter.connect(signers.otherUser1).dettachFromManagedNFT(userTokenId_1);

      expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_1)).to.be.eq(0);
      expect((await managedNFTManager.tokensInfo(userTokenId_1)).amount).to.be.eq(0);
      expect(await virtualRewarder.balanceOf(userTokenId_1)).to.be.eq(0);
      expect(await strategy.balanceOf(userTokenId_1)).to.be.eq(0);

      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('5.1'));
      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('5.1'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('0'));
      expect(await votingEscrow.totalSupply()).to.be.eq(3);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser2.address);

      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(3n);
      await checkNftState(mVeNftId, { amount: ethers.parseEther('0'), isPermanentLocked: true, isAttached: false, end: 0 });
      await checkNftState(userTokenId_1, { amount: ethers.parseEther('4.1'), isPermanentLocked: false, isAttached: false });
      await checkNftState(userTokenId_2, { amount: ethers.parseEther('1'), isPermanentLocked: false, isAttached: false });
    });
  });

  describe('success deposit for', async () => {
    let userTokenId_1 = 1n;
    let userTokenId_2 = 1n;
    let userTokenId_3 = 1n;

    beforeEach(async () => {
      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      userTokenId_1 = await votingEscrow.lastMintedTokenId();

      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser2.address, false, true, 0);
      userTokenId_2 = await votingEscrow.lastMintedTokenId();

      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser3.address, false, false, mVeNftId);
      userTokenId_3 = await votingEscrow.lastMintedTokenId();
    });

    it('state before deposit', async () => {
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('3'));
      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('2'));
      expect(await votingEscrow.totalSupply()).to.be.eq(4);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);

      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser2.address);
      expect(await votingEscrow.ownerOf(userTokenId_3)).to.be.eq(signers.otherUser3.address);

      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4n);

      await checkNftState(mVeNftId, { amount: ethers.parseEther('1'), isPermanentLocked: true, isAttached: false, end: 0 });
      await checkNftState(userTokenId_1, { amount: ethers.parseEther('1'), isPermanentLocked: false, isAttached: false });
      await checkNftState(userTokenId_2, { amount: ethers.parseEther('1'), isPermanentLocked: true, isAttached: false, end: 0 });
      await checkNftState(userTokenId_3, { amount: ethers.parseEther('0'), isPermanentLocked: false, isAttached: true, end: 0 });
    });

    it('state in managedNFtManager, strategy & virtualRewarder', async () => {
      expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_3)).to.be.eq(mVeNftId);
      expect((await managedNFTManager.tokensInfo(userTokenId_3)).amount).to.be.eq(ethers.parseEther('1'));
      expect(await virtualRewarder.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1'));
      expect(await virtualRewarder.totalSupply()).to.be.eq(ethers.parseEther('1'));
      expect(await strategy.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1'));
    });

    describe('user success deposit to own attache veNFT', async () => {
      let tx: ContractTransactionResponse;
      beforeEach(async () => {
        tx = await votingEscrow.connect(signers.otherUser3).depositToAttachedNFT(userTokenId_3, ethers.parseEther('0.1'));
      });

      it('state in managedNftManager/VirtualRewarder after deposit', async () => {
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_3)).to.be.eq(mVeNftId);
        expect((await managedNFTManager.tokensInfo(userTokenId_3)).amount).to.be.eq(ethers.parseEther('1.1'));
        expect(await virtualRewarder.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1.1'));
        expect(await virtualRewarder.totalSupply()).to.be.eq(ethers.parseEther('1.1'));
        expect(await strategy.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1.1'));

        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_2)).to.be.eq(0);
        expect((await managedNFTManager.tokensInfo(userTokenId_2)).amount).to.be.eq(0);
        expect(await virtualRewarder.balanceOf(userTokenId_2)).to.be.eq(0);
        expect(await strategy.balanceOf(userTokenId_2)).to.be.eq(0);
      });

      it('state after deposit', async () => {
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('3.1'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3.1'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('2.1'));
        expect(await votingEscrow.totalSupply()).to.be.eq(4);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);

        expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(userTokenId_3)).to.be.eq(signers.otherUser3.address);

        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4n);
        await checkNftState(mVeNftId, { amount: ethers.parseEther('1.1'), isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(userTokenId_1, { amount: ethers.parseEther('1'), isPermanentLocked: false, isAttached: false });
        await checkNftState(userTokenId_2, { amount: ethers.parseEther('1'), isPermanentLocked: true, isAttached: false, end: 0 });
        await checkNftState(userTokenId_3, { amount: ethers.parseEther('0'), isPermanentLocked: false, isAttached: true, end: 0 });
      });

      it('success emit event', async () => {
        await expect(tx)
          .to.be.emit(votingEscrow, 'DepositToAttachedNFT')
          .withArgs(signers.otherUser3.address, userTokenId_3, mVeNftId, ethers.parseEther('0.1'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(signers.otherUser3.address, votingEscrow.target, ethers.parseEther('0.1'));
        await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3'), ethers.parseEther('3.1'));
        await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(userTokenId_3, ethers.parseEther('0.1'));
      });

      describe('second user attach to managed nft and deposit to attached', async () => {
        beforeEach(async () => {
          await fenix.connect(signers.otherUser2).approve(votingEscrow.target, ethers.parseEther('10'));
          await fenix.transfer(signers.otherUser2.address, ethers.parseEther('10'));

          await voter.connect(signers.otherUser1).attachToManagedNFT(userTokenId_1, mVeNftId);
          tx = await votingEscrow.connect(signers.otherUser2).depositToAttachedNFT(userTokenId_1, ethers.parseEther('0.2'));
        });

        it('state in managedNftManager/VirtualRewarder after deposit', async () => {
          expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_3)).to.be.eq(mVeNftId);
          expect((await managedNFTManager.tokensInfo(userTokenId_3)).amount).to.be.eq(ethers.parseEther('1.1'));
          expect(await virtualRewarder.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1.1'));
          expect(await virtualRewarder.totalSupply()).to.be.eq(ethers.parseEther('2.3'));
          expect(await strategy.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1.1'));
          expect(await strategy.totalSupply()).to.be.eq(ethers.parseEther('2.3'));

          expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_1)).to.be.eq(mVeNftId);
          expect((await managedNFTManager.tokensInfo(userTokenId_1)).amount).to.be.eq(ethers.parseEther('1.2'));
          expect(await virtualRewarder.balanceOf(userTokenId_1)).to.be.eq(ethers.parseEther('1.2'));
          expect(await strategy.balanceOf(userTokenId_1)).to.be.eq(ethers.parseEther('1.2'));
        });

        it('state after deposit', async () => {
          expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('3.3'));
          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3.3'));
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3.3'));
          expect(await votingEscrow.totalSupply()).to.be.eq(4);
          expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
          expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
          expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);

          expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
          expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser2.address);
          expect(await votingEscrow.ownerOf(userTokenId_3)).to.be.eq(signers.otherUser3.address);

          expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4n);
          await checkNftState(mVeNftId, { amount: ethers.parseEther('2.3'), isPermanentLocked: true, isAttached: false, end: 0 });
          await checkNftState(userTokenId_1, { amount: ethers.parseEther('0'), isPermanentLocked: false, isAttached: true, end: 0 });
          await checkNftState(userTokenId_2, { amount: ethers.parseEther('1'), isPermanentLocked: true, isAttached: false, end: 0 });
          await checkNftState(userTokenId_3, { amount: ethers.parseEther('0'), isPermanentLocked: false, isAttached: true, end: 0 });
        });

        it('success emit event', async () => {
          await expect(tx)
            .to.be.emit(votingEscrow, 'DepositToAttachedNFT')
            .withArgs(signers.otherUser2.address, userTokenId_1, mVeNftId, ethers.parseEther('0.2'));
          await expect(tx)
            .to.be.emit(fenix, 'Transfer')
            .withArgs(signers.otherUser2.address, votingEscrow.target, ethers.parseEther('0.2'));
          await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3.1'), ethers.parseEther('3.3'));
          await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(userTokenId_1, ethers.parseEther('0.2'));
        });

        it('second deposit for user nft', async () => {
          tx = await votingEscrow.connect(signers.otherUser2).depositToAttachedNFT(userTokenId_1, ethers.parseEther('0.2'));

          expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_3)).to.be.eq(mVeNftId);
          expect((await managedNFTManager.tokensInfo(userTokenId_3)).amount).to.be.eq(ethers.parseEther('1.1'));
          expect(await virtualRewarder.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1.1'));
          expect(await virtualRewarder.totalSupply()).to.be.eq(ethers.parseEther('2.5'));
          expect(await strategy.balanceOf(userTokenId_3)).to.be.eq(ethers.parseEther('1.1'));
          expect(await strategy.totalSupply()).to.be.eq(ethers.parseEther('2.5'));

          expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_1)).to.be.eq(mVeNftId);
          expect((await managedNFTManager.tokensInfo(userTokenId_1)).amount).to.be.eq(ethers.parseEther('1.4'));
          expect(await virtualRewarder.balanceOf(userTokenId_1)).to.be.eq(ethers.parseEther('1.4'));
          expect(await strategy.balanceOf(userTokenId_1)).to.be.eq(ethers.parseEther('1.4'));

          expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('3.5'));
          expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('3.5'));
          expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('3.5'));
          expect(await votingEscrow.totalSupply()).to.be.eq(4);
          expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
          expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
          expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);

          expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
          expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser2.address);
          expect(await votingEscrow.ownerOf(userTokenId_3)).to.be.eq(signers.otherUser3.address);

          expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4n);
          await checkNftState(mVeNftId, { amount: ethers.parseEther('2.5'), isPermanentLocked: true, isAttached: false, end: 0 });
          await checkNftState(userTokenId_1, { amount: ethers.parseEther('0'), isPermanentLocked: false, isAttached: true, end: 0 });
          await checkNftState(userTokenId_2, { amount: ethers.parseEther('1'), isPermanentLocked: true, isAttached: false, end: 0 });
          await checkNftState(userTokenId_3, { amount: ethers.parseEther('0'), isPermanentLocked: false, isAttached: true, end: 0 });

          await expect(tx)
            .to.be.emit(votingEscrow, 'DepositToAttachedNFT')
            .withArgs(signers.otherUser2.address, userTokenId_1, mVeNftId, ethers.parseEther('0.2'));
          await expect(tx)
            .to.be.emit(fenix, 'Transfer')
            .withArgs(signers.otherUser2.address, votingEscrow.target, ethers.parseEther('0.2'));
          await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3.3'), ethers.parseEther('3.5'));
          await expect(tx).to.be.emit(strategy, 'OnAttach').withArgs(userTokenId_1, ethers.parseEther('0.2'));
        });
      });
    });
  });
});

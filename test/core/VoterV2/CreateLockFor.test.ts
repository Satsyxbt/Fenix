import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { loadFixture, mine } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import * as typechainTypes from '../../../typechain-types';
import { ERRORS, ONE_ETHER, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployAlgebraCore,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../../utils/coreFixture';
import { VotingEscrowUpgradeableV2 } from '../../../typechain-types';

describe('VotingEscrow-createLockFor', function () {
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
    expect(await votingEscrow.totalSupply()).to.be.eq(ZERO);
  });

  it('should use max unlock time during create lock if withPermanentLock is true', async () => {
    let userTokenId_1 = 1n;
    let tx = await votingEscrow
      .connect(signers.otherUser1)
      .createLockFor(ethers.parseEther('1'), 0, signers.otherUser1.address, true, true, 0);
    await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(0, ethers.parseEther('1.1'));
    await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, userTokenId_1);
    await expect(tx).to.be.emit(votingEscrow, 'Boost').withArgs(userTokenId_1, ethers.parseEther('0.1'));
    await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, userTokenId_1);

    await mine();

    expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('1.1'));
    expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1.1'));
    expect(await votingEscrow.totalSupply()).to.be.eq(1);
    expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
    expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
    expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);

    expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('999'));
    expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('999.9'));
    expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('1.1'));

    expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('1.1'));

    expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.eq(ethers.parseEther('1.1'));

    expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.eq(ethers.parseEther('1.1'));

    await checkNftState(userTokenId_1, { amount: ethers.parseEther('1.1'), isPermanentLocked: true, isAttached: false, end: 0 });
  });
  describe('success create new locks with different states', async () => {
    it('just create new locks without boost, permanent lock and attach to managed veNFT', async () => {
      let tx = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(0, ethers.parseEther('1'));
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, 1);

      let tx2 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      await expect(tx2).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), ethers.parseEther('3'));
      await expect(tx2).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, 2);

      let tx3 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address, false, false, 0);
      await expect(tx3).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3'), ethers.parseEther('6'));
      await expect(tx3).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser2.address, 3);

      await mine();

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);
      expect(await votingEscrow.totalSupply()).to.be.eq(3);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(3);
      expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser2.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('994'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1000'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6'), (ethers.parseEther('6') * 7n) / 182n);

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(
        ethers.parseEther('1'),
        (ethers.parseEther('1') * 7n) / 182n,
      );
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(
        ethers.parseEther('2'),
        (ethers.parseEther('2') * 7n) / 182n,
      );
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.closeTo(
        ethers.parseEther('3'),
        (ethers.parseEther('3') * 7n) / 182n,
      );

      expect(await votingEscrow.balanceOfNFT(1)).to.be.closeTo(ethers.parseEther('1'), (ethers.parseEther('1') * 7n) / 182n);
      expect(await votingEscrow.balanceOfNFT(2)).to.be.closeTo(ethers.parseEther('2'), (ethers.parseEther('2') * 7n) / 182n);
      expect(await votingEscrow.balanceOfNFT(3)).to.be.closeTo(ethers.parseEther('3'), (ethers.parseEther('3') * 7n) / 182n);

      await checkNftState(1n, { amount: ethers.parseEther('1'), isPermanentLocked: false, isAttached: false });
      await checkNftState(2n, { amount: ethers.parseEther('2'), isPermanentLocked: false, isAttached: false });
      await checkNftState(3n, { amount: ethers.parseEther('3'), isPermanentLocked: false, isAttached: false });
    });

    it('with using veBoost for nfts', async () => {
      let tx = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, false, 0);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(0, ethers.parseEther('1.1'));
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, 1);
      await expect(tx).to.be.emit(votingEscrow, 'Boost').withArgs(1, ethers.parseEther('0.1'));

      let tx2 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, true, false, 0);
      await expect(tx2).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1.1'), ethers.parseEther('3.3'));
      await expect(tx2).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, 2);
      await expect(tx2).to.be.emit(votingEscrow, 'Boost').withArgs(2, ethers.parseEther('0.2'));

      let tx3 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address, true, false, 0);
      await expect(tx3).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3.3'), ethers.parseEther('6.6'));
      await expect(tx3).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser2.address, 3);
      await expect(tx3).to.be.emit(votingEscrow, 'Boost').withArgs(3, ethers.parseEther('0.3'));

      await mine();

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6.6'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ZERO);
      expect(await votingEscrow.totalSupply()).to.be.eq(3);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(3);
      expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser2.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('994'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('999.4'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6.6'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('6.6'), (ethers.parseEther('6.6') * 7n) / 182n);

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.closeTo(
        ethers.parseEther('1.1'),
        (ethers.parseEther('1.1') * 7n) / 182n,
      );
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.closeTo(
        ethers.parseEther('2.2'),
        (ethers.parseEther('2.2') * 7n) / 182n,
      );
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.closeTo(
        ethers.parseEther('3.3'),
        (ethers.parseEther('3.3') * 7n) / 182n,
      );

      expect(await votingEscrow.balanceOfNFT(1)).to.be.closeTo(ethers.parseEther('1.1'), (ethers.parseEther('1.1') * 7n) / 182n);
      expect(await votingEscrow.balanceOfNFT(2)).to.be.closeTo(ethers.parseEther('2.2'), (ethers.parseEther('2.2') * 7n) / 182n);
      expect(await votingEscrow.balanceOfNFT(3)).to.be.closeTo(ethers.parseEther('3.3'), (ethers.parseEther('3.3') * 7n) / 182n);

      await checkNftState(1n, { amount: ethers.parseEther('1.1'), isPermanentLocked: false, isAttached: false });
      await checkNftState(2n, { amount: ethers.parseEther('2.2'), isPermanentLocked: false, isAttached: false });
      await checkNftState(3n, { amount: ethers.parseEther('3.3'), isPermanentLocked: false, isAttached: false });
    });

    it('with permanentLock for nfts', async () => {
      let tx = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, true, 0);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(0, ethers.parseEther('1'));
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, 1);
      await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, 1);

      let tx2 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, true, 0);
      await expect(tx2).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), ethers.parseEther('3'));
      await expect(tx2).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, 2);
      await expect(tx2).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, 2);

      let tx3 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address, false, true, 0);
      await expect(tx3).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3'), ethers.parseEther('6'));
      await expect(tx3).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser2.address, 3);
      await expect(tx3).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, 3);

      await mine();

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('6'));
      expect(await votingEscrow.totalSupply()).to.be.eq(3);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(3);
      expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser2.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('994'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1000'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('6'));

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(1)).to.be.eq(ethers.parseEther('1'));
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(2)).to.be.eq(ethers.parseEther('2'));
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(3)).to.be.eq(ethers.parseEther('3'));

      expect(await votingEscrow.balanceOfNFT(1)).to.be.eq(ethers.parseEther('1'));
      expect(await votingEscrow.balanceOfNFT(2)).to.be.eq(ethers.parseEther('2'));
      expect(await votingEscrow.balanceOfNFT(3)).to.be.eq(ethers.parseEther('3'));

      await checkNftState(1n, { amount: ethers.parseEther('1'), isPermanentLocked: true, isAttached: false, end: 0 });
      await checkNftState(2n, { amount: ethers.parseEther('2'), isPermanentLocked: true, isAttached: false, end: 0 });
      await checkNftState(3n, { amount: ethers.parseEther('3'), isPermanentLocked: true, isAttached: false, end: 0 });
    });

    it('with attach to managed nfts for nfts during create call', async () => {
      let mVeNftId = 1n;
      let userTokenId_1 = 2n;
      let userTokenId_2 = 3n;
      let userTokenId_3 = 4n;

      let strategy = await newStrategy();
      await managedNFTManager.createManagedNFT(strategy);

      let tx = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, mVeNftId);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(0, ethers.parseEther('1'));
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, userTokenId_1);
      await expect(tx).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_1, mVeNftId);
      let tx2 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, false, false, mVeNftId);
      await expect(tx2).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), ethers.parseEther('3'));
      await expect(tx2).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, userTokenId_2);
      await expect(tx2).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_2, mVeNftId);

      let tx3 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address, false, false, mVeNftId);
      await expect(tx3).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3'), ethers.parseEther('6'));
      await expect(tx3).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser2.address, userTokenId_3);
      await expect(tx3).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_3, mVeNftId);

      await mine();

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('6'));
      expect(await votingEscrow.totalSupply()).to.be.eq(4);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_3)).to.be.eq(signers.otherUser2.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('994'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1000'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('6'));
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(mVeNftId)).to.be.eq(ethers.parseEther('6'));

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_2)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_3)).to.be.eq(ZERO);

      expect(await votingEscrow.balanceOfNFT(mVeNftId)).to.be.eq(ethers.parseEther('6'));
      expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNFT(userTokenId_2)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNFT(userTokenId_3)).to.be.eq(ZERO);

      await checkNftState(mVeNftId, { amount: ethers.parseEther('6'), isPermanentLocked: true, isAttached: false, end: 0 });

      await checkNftState(userTokenId_1, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
      await checkNftState(userTokenId_2, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
      await checkNftState(userTokenId_3, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
    });

    it('with veBoost & permanent lock, attach to managed nfts', async () => {
      let mVeNftId = 1n;
      let userTokenId_1 = 2n;
      let userTokenId_2 = 3n;
      let userTokenId_3 = 4n;

      let strategy = await newStrategy();
      await managedNFTManager.createManagedNFT(strategy);

      let tx = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, true, true, mVeNftId);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(0, ethers.parseEther('1.1'));
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, userTokenId_1);
      await expect(tx).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_1, mVeNftId);
      await expect(tx).to.be.emit(votingEscrow, 'Boost').withArgs(userTokenId_1, ethers.parseEther('0.1'));
      await expect(tx).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, userTokenId_1);

      let tx2 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, true, true, mVeNftId);
      await expect(tx2).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1.1'), ethers.parseEther('3.3'));
      await expect(tx2).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, userTokenId_2);
      await expect(tx2).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_2, mVeNftId);
      await expect(tx2).to.be.emit(votingEscrow, 'Boost').withArgs(userTokenId_2, ethers.parseEther('0.2'));
      await expect(tx2).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, userTokenId_2);

      let tx3 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address, true, true, mVeNftId);
      await expect(tx3).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3.3'), ethers.parseEther('6.6'));
      await expect(tx3).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser2.address, userTokenId_3);
      await expect(tx3).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_3, mVeNftId);
      await expect(tx3).to.be.emit(votingEscrow, 'Boost').withArgs(userTokenId_3, ethers.parseEther('0.3'));
      await expect(tx3).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, userTokenId_3);

      await mine();

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('6.6'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('6.6'));
      expect(await votingEscrow.totalSupply()).to.be.eq(4);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_3)).to.be.eq(signers.otherUser2.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('994'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('999.4'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('6.6'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(ethers.parseEther('6.6'));
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(mVeNftId)).to.be.eq(ethers.parseEther('6.6'));

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_2)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_3)).to.be.eq(ZERO);

      expect(await votingEscrow.balanceOfNFT(mVeNftId)).to.be.eq(ethers.parseEther('6.6'));
      expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNFT(userTokenId_2)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNFT(userTokenId_3)).to.be.eq(ZERO);

      await checkNftState(mVeNftId, { amount: ethers.parseEther('6.6'), isPermanentLocked: true, isAttached: false, end: 0 });

      await checkNftState(userTokenId_1, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
      await checkNftState(userTokenId_2, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
      await checkNftState(userTokenId_3, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
    });

    it('mishmash', async () => {
      let mVeNftId = 1n;
      let userTokenId_1 = 2n;
      let userTokenId_2 = 3n;
      let userTokenId_3 = 4n;
      let userTokenId_4 = 5n;

      let strategy = await newStrategy();
      await managedNFTManager.createManagedNFT(strategy);

      let tx = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(0, ethers.parseEther('1'));
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, userTokenId_1);

      let tx2 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('2'), 182 * 86400, signers.otherUser1.address, true, false, mVeNftId);
      await expect(tx2).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), ethers.parseEther('3.2'));
      await expect(tx2).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser1.address, userTokenId_2);
      await expect(tx2).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_2, mVeNftId);
      await expect(tx2).to.be.emit(votingEscrow, 'Boost').withArgs(userTokenId_2, ethers.parseEther('0.2'));

      let tx3 = await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('3'), 182 * 86400, signers.otherUser2.address, false, true, mVeNftId);
      await expect(tx3).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('3.2'), ethers.parseEther('6.2'));
      await expect(tx3).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser2.address, userTokenId_3);
      await expect(tx3).to.be.emit(voter, 'AttachToManagedNFT').withArgs(userTokenId_3, mVeNftId);
      await expect(tx3).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser1.address, userTokenId_3);

      let tx4 = await votingEscrow
        .connect(signers.otherUser3)
        .createLockFor(ethers.parseEther('4'), 91 * 86400, signers.otherUser3.address, true, true, 0);
      await expect(tx4).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('6.2'), ethers.parseEther('10.6'));
      await expect(tx4).to.be.emit(votingEscrow, 'Transfer').withArgs(ZERO_ADDRESS, signers.otherUser3.address, userTokenId_4);
      await expect(tx4).to.be.emit(votingEscrow, 'LockPermanent').withArgs(signers.otherUser3.address, userTokenId_4);

      await mine();

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('10.6'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('9.6'));
      expect(await votingEscrow.totalSupply()).to.be.eq(5);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
      expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(5);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.otherUser1.address);
      expect(await votingEscrow.ownerOf(userTokenId_3)).to.be.eq(signers.otherUser2.address);
      expect(await votingEscrow.ownerOf(userTokenId_4)).to.be.eq(signers.otherUser3.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('994'));
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('996'));

      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('999.4'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('10.6'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('10.6'), (ethers.parseEther('1') * 7n) / 182n);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(mVeNftId)).to.be.eq(ethers.parseEther('5.2'));

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.closeTo(
        ethers.parseEther('1'),
        (ethers.parseEther('1') * 7n) / 182n,
      );
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_2)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_3)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_4)).to.be.eq(ethers.parseEther('4.4'));

      expect(await votingEscrow.balanceOfNFT(mVeNftId)).to.be.eq(ethers.parseEther('5.2'));
      expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.closeTo(ethers.parseEther('1'), (ethers.parseEther('1') * 7n) / 182n);
      expect(await votingEscrow.balanceOfNFT(userTokenId_2)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNFT(userTokenId_3)).to.be.eq(ZERO);
      expect(await votingEscrow.balanceOfNFT(userTokenId_4)).to.be.eq(ethers.parseEther('4.4'));

      await checkNftState(mVeNftId, { amount: ethers.parseEther('5.2'), isPermanentLocked: true, isAttached: false, end: 0 });

      await checkNftState(userTokenId_1, { amount: ethers.parseEther('1'), isPermanentLocked: false, isAttached: false });
      await checkNftState(userTokenId_2, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
      await checkNftState(userTokenId_3, { amount: ZERO, isPermanentLocked: false, isAttached: true, end: 0 });
      await checkNftState(userTokenId_4, { amount: ethers.parseEther('4.4'), isPermanentLocked: true, isAttached: false, end: 0 });
    });
  });
});

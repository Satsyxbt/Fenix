import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
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

describe('VotingEscrow-depositFor', function () {
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

  describe('should fail if', async () => {
    it('other user try deposit with increase lock for not own nft', async () => {
      let userTokenId_1 = 1n;
      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);

      await expect(
        votingEscrow.connect(signers.otherUser2).depositWithIncreaseUnlockTime(userTokenId_1, ONE_ETHER, 1),
      ).to.be.revertedWithCustomError(votingEscrow, 'AccessDenied');
    });
  });
  describe('success deposit & increase unlock time', async () => {
    let userTokenId_1 = 1n;

    const WEEK = 86400 * 7;

    async function roundToWeek(time: bigint) {
      return (time / BigInt(WEEK)) * BigInt(WEEK);
    }

    beforeEach(async () => {
      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 91 * 86400, signers.otherUser1.address, false, false, 0);
    });

    it('with boosted, because increase unlock time to max', async () => {
      let tx = await votingEscrow.connect(signers.otherUser1).depositWithIncreaseUnlockTime(userTokenId_1, ONE_ETHER, 182 * 86400);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ONE_ETHER, ethers.parseEther('2.1'));
      await expect(tx).to.be.emit(votingEscrow, 'Boost').withArgs(userTokenId_1, ethers.parseEther('0.1'));

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('2.1'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await votingEscrow.totalSupply()).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('998'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('999.9'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('2.1'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('2.1'), ethers.parseEther('2.1') / 26n);

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.closeTo(
        ethers.parseEther('2.1'),
        ethers.parseEther('2.1') / 26n,
      );
      expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.closeTo(ethers.parseEther('2.1'), ethers.parseEther('2.1') / 26n);

      await checkNftState(userTokenId_1, { amount: ethers.parseEther('2.1'), isPermanentLocked: false, isAttached: false });
    });

    it('without boosted, because increase unlock time not to max', async () => {
      let tx = await votingEscrow.connect(signers.otherUser1).depositWithIncreaseUnlockTime(userTokenId_1, ONE_ETHER, 140 * 86400);
      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ONE_ETHER, ethers.parseEther('2'));

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await votingEscrow.totalSupply()).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('998'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1000'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('2'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(
        (ethers.parseEther('2') * 140n) / 182n,
        ethers.parseEther('2') / 26n,
      );

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.closeTo(
        (ethers.parseEther('2') * 140n) / 182n,
        ethers.parseEther('2') / 26n,
      );
      expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.closeTo(
        (ethers.parseEther('2') * 140n) / 182n,
        ethers.parseEther('2') / 26n,
      );

      await checkNftState(userTokenId_1, { amount: ethers.parseEther('2'), isPermanentLocked: false, isAttached: false });
    });

    it('with check increase unlock time, two time for the same nft', async () => {
      let tx = await votingEscrow.connect(signers.otherUser1).depositWithIncreaseUnlockTime(userTokenId_1, ONE_ETHER, 140 * 86400);
      let txTimestamp = (await ethers.provider.getBlock(tx.blockNumber!))?.timestamp!;

      let newUnlockTimestamp = await roundToWeek(BigInt(txTimestamp) + BigInt(140 * 86400));

      let newState = await votingEscrow.nftStates(userTokenId_1);
      expect(newState.locked.amount).to.be.eq(ethers.parseEther('2'));
      expect(newState.locked.isPermanentLocked).to.be.false;
      expect(newState.isVoted).to.be.false;
      expect(newState.locked.end).to.be.eq(newUnlockTimestamp);

      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ONE_ETHER, ethers.parseEther('2'));

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await votingEscrow.totalSupply()).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('998'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1000'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('2'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(
        (ethers.parseEther('2') * 140n) / 182n,
        ethers.parseEther('2') / 26n,
      );

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.closeTo(
        (ethers.parseEther('2') * 140n) / 182n,
        ethers.parseEther('2') / 26n,
      );
      expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.closeTo(
        (ethers.parseEther('2') * 140n) / 182n,
        ethers.parseEther('2') / 26n,
      );

      await checkNftState(userTokenId_1, { amount: ethers.parseEther('2'), isPermanentLocked: false, isAttached: false });

      tx = await votingEscrow
        .connect(signers.otherUser1)
        .depositWithIncreaseUnlockTime(userTokenId_1, ethers.parseEther('0.5'), 175 * 86400);
      txTimestamp = (await ethers.provider.getBlock(tx.blockNumber!))?.timestamp!;

      newUnlockTimestamp = await roundToWeek(BigInt(txTimestamp) + BigInt(175 * 86400));

      newState = await votingEscrow.nftStates(userTokenId_1);
      expect(newState.locked.amount).to.be.eq(ethers.parseEther('2.5'));
      expect(newState.locked.isPermanentLocked).to.be.false;
      expect(newState.isVoted).to.be.false;
      expect(newState.locked.end).to.be.eq(newUnlockTimestamp);

      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('2'), ethers.parseEther('2.5'));

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('2.5'));
      expect(await votingEscrow.permanentTotalSupply()).to.be.eq(0);
      expect(await votingEscrow.totalSupply()).to.be.eq(1);
      expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('997.5'));
      expect(await fenix.balanceOf(veBoost.target)).to.be.eq(ethers.parseEther('1000'));
      expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('2.5'));

      expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(
        (ethers.parseEther('2.5') * 175n) / 182n,
        ethers.parseEther('2.5') / 26n,
      );

      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.closeTo(
        (ethers.parseEther('2.5') * 175n) / 182n,
        ethers.parseEther('2.5') / 26n,
      );
      expect(await votingEscrow.balanceOfNFT(userTokenId_1)).to.be.closeTo(
        (ethers.parseEther('2.5') * 175n) / 182n,
        ethers.parseEther('2.5') / 26n,
      );

      await checkNftState(userTokenId_1, { amount: ethers.parseEther('2.5'), isPermanentLocked: false, isAttached: false });
    });
  });
});

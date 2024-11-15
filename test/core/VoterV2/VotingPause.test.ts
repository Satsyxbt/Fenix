import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  CompoundVeFNXManagedNFTStrategyUpgradeable,
  Fenix,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../../typechain-types';
import { WETH_PREDEPLOYED_ADDRESS, getAccessControlError } from '../../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../../utils/coreFixture';

describe('Voting pause functionality', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let Voter: VoterUpgradeableV2;
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let ManagedNFTManager: ManagedNFTManagerUpgradeable;
  let Fenix: Fenix;
  let StrategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;

  async function deployStrategyFactory() {
    StrategyFactory = (await ethers.getContractAt(
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

    await StrategyFactory.initialize(
      signers.blastGovernor.address,
      (
        await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address])
      ).target,
      (
        await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address])
      ).target,
      ManagedNFTManager.target,
      routerV2PathProvider.target,
    );
  }

  async function newStrategy(name: string) {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await StrategyFactory.createStrategy.staticCall(name),
    );
    await StrategyFactory.createStrategy(name);
    return strategy;
  }

  async function newPool(token0: string, token1: string) {
    let t0 = await deployERC20MockToken(signers.deployer, token0, token0, 18);
    let t1 = await deployERC20MockToken(signers.deployer, token1, token1, 18);
    await deployed.v2PairFactory.createPair(t0.target, t1.target, false);
    return deployed.v2PairFactory.getPair(t0.target, t1.target, false);
  }

  let strategies: CompoundVeFNXManagedNFTStrategyUpgradeable[] = [];
  let pools: string[] = [];
  let mVeNfts: bigint[] = [];
  let otherUser1VeNftTokenId: bigint;
  let otherUser2VeNftTokenId: bigint;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    Fenix = deployed.fenix;
    Voter = deployed.voter;
    VotingEscrow = deployed.votingEscrow;
    ManagedNFTManager = deployed.managedNFTManager;

    await deployStrategyFactory();

    for (let index = 0; index < 3; index++) {
      let strategi = await newStrategy('Strategi' + index);
      strategies.push(strategi);
      await ManagedNFTManager.createManagedNFT(strategi.target);
      let mVeNft = await VotingEscrow.lastMintedTokenId();
      mVeNfts.push(mVeNft);

      await ManagedNFTManager.setWhitelistedNFT(mVeNft, true);
      await ManagedNFTManager.setAuthorizedUser(mVeNft, signers.deployer.address);

      let pool = await newPool('token0' + index, 'token1' + index);
      await Voter.createV2Gauge(pool);
      pools.push(pool);
    }

    await Fenix.approve(VotingEscrow.target, ethers.MaxUint256);

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser1.address, false, true, 0);
    otherUser1VeNftTokenId = await VotingEscrow.lastMintedTokenId();

    await VotingEscrow.createLockFor(ethers.parseEther('100'), 0, signers.otherUser2.address, false, true, 0);
    otherUser2VeNftTokenId = await VotingEscrow.lastMintedTokenId();
  });

  it('should fail if call from not default admin', async () => {
    await expect(Voter.connect(signers.otherUser1).setVotingPause(true)).to.be.revertedWith(
      getAccessControlError(await Voter.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
    );
  });

  it('success setup pause and emit event', async () => {
    expect(await Voter.votingPaused()).to.be.false;
    await expect(Voter.setVotingPause(true)).to.be.emit(Voter, 'VotingPaused').withArgs(true);
    expect(await Voter.votingPaused()).to.be.true;
    await expect(Voter.setVotingPause(false)).to.be.emit(Voter, 'VotingPaused').withArgs(false);
    expect(await Voter.votingPaused()).to.be.false;
    await expect(Voter.setVotingPause(true)).to.be.emit(Voter, 'VotingPaused').withArgs(true);
    expect(await Voter.votingPaused()).to.be.true;
  });

  describe('should fail call to proccess vote, if paused', async () => {
    beforeEach(async () => {
      await Voter.setVotingPause(true);
      expect(await Voter.votingPaused()).to.be.true;
    });

    it('#vote', async () => {
      await expect(Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[0]], [100])).to.be.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
      await Voter.setVotingPause(false);
      await expect(Voter.connect(signers.otherUser1).vote(otherUser1VeNftTokenId, [pools[0]], [100])).to.be.not.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
    });

    it('#reset', async () => {
      await expect(Voter.connect(signers.otherUser1).reset(otherUser1VeNftTokenId)).to.be.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
      await Voter.setVotingPause(false);
      await expect(Voter.connect(signers.otherUser1).reset(otherUser1VeNftTokenId)).to.be.not.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
    });

    it('#poke', async () => {
      await expect(Voter.connect(signers.otherUser1).poke(otherUser1VeNftTokenId)).to.be.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
      await Voter.setVotingPause(false);
      await expect(Voter.connect(signers.otherUser1).poke(otherUser1VeNftTokenId)).to.be.not.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
    });

    it('#attachToManagedNFT', async () => {
      await expect(Voter.connect(signers.otherUser1).attachToManagedNFT(otherUser1VeNftTokenId, mVeNfts[0])).to.be.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
      await Voter.setVotingPause(false);
      await expect(
        Voter.connect(signers.otherUser1).attachToManagedNFT(otherUser1VeNftTokenId, mVeNfts[0]),
      ).to.be.not.revertedWithCustomError(Voter, 'DisableDuringVotingPaused');
    });

    it('#dettachFromManagedNFT', async () => {
      await expect(Voter.connect(signers.otherUser1).dettachFromManagedNFT(otherUser1VeNftTokenId)).to.be.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
      await Voter.setVotingPause(false);
      await expect(Voter.connect(signers.otherUser1).dettachFromManagedNFT(otherUser1VeNftTokenId)).to.be.not.revertedWithCustomError(
        Voter,
        'DisableDuringVotingPaused',
      );
    });

    it('#onDepositToManagedNFT', async () => {
      await expect(
        Voter.connect(signers.otherUser1).onDepositToManagedNFT(otherUser1VeNftTokenId, mVeNfts[0]),
      ).to.be.revertedWithCustomError(Voter, 'DisableDuringVotingPaused');
      await Voter.setVotingPause(false);
      await expect(
        Voter.connect(signers.otherUser1).onDepositToManagedNFT(otherUser1VeNftTokenId, mVeNfts[0]),
      ).to.be.not.revertedWithCustomError(Voter, 'DisableDuringVotingPaused');
    });
  });
});

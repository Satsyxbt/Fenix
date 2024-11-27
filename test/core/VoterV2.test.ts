import { loadFixture, SnapshotRestorer, takeSnapshot } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VeFnxSplitMerklAidropUpgradeable,
  VoterUpgradeableV2,
} from '../../typechain-types';
import completeFixture, { CoreFixtureDeployed, deployTransaperntUpgradeableProxy, SignersList } from '../utils/coreFixture';
import { ERRORS, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { ethers } from 'hardhat';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

describe('Voter change governance/admin functionality', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: VoterUpgradeableV2;
  let VeFnxSplitMerklAidropUpgradeable: VeFnxSplitMerklAidropUpgradeable;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;
  let managedNFTManager: ManagedNFTManagerUpgradeable;

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

  before(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    voter = deployed.voter;

    const implementation = await ethers.deployContract('VeFnxSplitMerklAidropUpgradeable', [signers.blastGovernor.address]);
    VeFnxSplitMerklAidropUpgradeable = await ethers.getContractAt(
      'VeFnxSplitMerklAidropUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
      ).target,
    );

    await VeFnxSplitMerklAidropUpgradeable.initialize(
      signers.blastGovernor.address,
      deployed.fenix.target,
      deployed.votingEscrow.target,
      ethers.parseEther('0.4'),
    );

    await VeFnxSplitMerklAidropUpgradeable.setIsAllowedClaimOperator(voter.target, true);

    managedNFTManager = deployed.managedNFTManager;

    await deployStrategyFactory();
  });

  describe('#aggregateClaim', async () => {
    it('not fail if all params is empty', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          { inPureTokens: false, amount: 0, proofs: [], withPermanentLock: false, managedTokenIdForAttach: 0 },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ),
      ).to.be.not.reverted;
    });

    it('fail if percentageToLock more then 100% (1e18)', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          { inPureTokens: false, amount: 0, proofs: [], withPermanentLock: false, managedTokenIdForAttach: 0 },
          {
            percentageToLock: ethers.parseEther('1') + 1n,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ),
      ).to.be.revertedWithCustomError(voter, 'InvalidPercentageToLock');
    });
    it('fail if in AggregateClaimBribesByTokenIdParams set not exist token id', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [ZERO_ADDRESS], tokens: [], tokenId: 5 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          { inPureTokens: false, amount: 0, proofs: [], withPermanentLock: false, managedTokenIdForAttach: 0 },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ),
      ).to.be.revertedWith('ERC721: invalid token ID');
    });
    it('fail if in AggregateClaimMerklDataParams users containes not only caller address', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [signers.otherUser1.address], proofs: [], tokens: [], amounts: [] },
          { inPureTokens: false, amount: 0, proofs: [], withPermanentLock: false, managedTokenIdForAttach: 0 },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ),
      ).to.be.revertedWith('users containes no only caller');
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [signers.deployer.address, signers.otherUser1.address], proofs: [], tokens: [], amounts: [] },
          { inPureTokens: false, amount: 0, proofs: [], withPermanentLock: false, managedTokenIdForAttach: 0 },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        ),
      ).to.be.revertedWith('users containes no only caller');
    });

    describe('success claim', async () => {
      let snap: SnapshotRestorer;
      before(async () => {
        snap = await takeSnapshot();
      });
      afterEach(async () => {
        await snap.restore();
      });
      it('success claim merkl aidrop in veNft form', async () => {
        await voter.updateAddress('veFnxMerklAidrop', VeFnxSplitMerklAidropUpgradeable.target);

        const tree = StandardMerkleTree.of(
          [
            [signers.otherUser1.address, ethers.parseEther('1')],
            [signers.otherUser2.address, ethers.parseEther('0.5')],
          ],
          ['address', 'uint256'],
        );
        await VeFnxSplitMerklAidropUpgradeable.setMerklRoot(tree.root);
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        await deployed.fenix.transfer(VeFnxSplitMerklAidropUpgradeable.target, ethers.parseEther('200'));
        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('200'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(0);
        expect(await deployed.votingEscrow.supply()).to.be.eq(0);
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);

        let tx = await voter.connect(signers.otherUser1).aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          {
            inPureTokens: false,
            amount: ethers.parseEther('1'),
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
            proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('1')]),
          },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        );
        await VeFnxSplitMerklAidropUpgradeable.pause();
        await VeFnxSplitMerklAidropUpgradeable.setPureTokensRate(ethers.parseEther('0.25'));
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        await expect(tx)
          .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), 0, ethers.parseEther('1'), 1);
        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(VeFnxSplitMerklAidropUpgradeable.target, deployed.votingEscrow.target, ethers.parseEther('1'));

        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('199'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.supply()).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await deployed.votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      });

      it('success claim merkl aidrop in pure tokens', async () => {
        await voter.updateAddress('veFnxMerklAidrop', VeFnxSplitMerklAidropUpgradeable.target);

        const tree = StandardMerkleTree.of(
          [
            [signers.otherUser1.address, ethers.parseEther('1')],
            [signers.otherUser2.address, ethers.parseEther('0.5')],
          ],
          ['address', 'uint256'],
        );
        await VeFnxSplitMerklAidropUpgradeable.setMerklRoot(tree.root);
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        await deployed.fenix.transfer(VeFnxSplitMerklAidropUpgradeable.target, ethers.parseEther('200'));
        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('200'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(0);
        expect(await deployed.votingEscrow.supply()).to.be.eq(0);
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);
        await VeFnxSplitMerklAidropUpgradeable.pause();
        await VeFnxSplitMerklAidropUpgradeable.setPureTokensRate(ethers.parseEther('0.2'));
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        let tx = await voter.connect(signers.otherUser1).aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          {
            inPureTokens: true,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
            amount: ethers.parseEther('1'),
            proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('1')]),
          },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        );

        await expect(tx)
          .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('0.2'), 0, 0);
        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(VeFnxSplitMerklAidropUpgradeable.target, signers.otherUser1.address, ethers.parseEther('0.2'));

        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('0.2'));
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('199.8'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(0);
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);
      });

      describe('success claim and convert FNX in lock', async () => {
        let tree: StandardMerkleTree<(string | bigint)[]>;

        beforeEach(async () => {
          await voter.updateAddress('veFnxMerklAidrop', VeFnxSplitMerklAidropUpgradeable.target);

          tree = StandardMerkleTree.of(
            [
              [signers.otherUser1.address, ethers.parseEther('100')],
              [signers.otherUser2.address, ethers.parseEther('0.5')],
            ],
            ['address', 'uint256'],
          );
          await VeFnxSplitMerklAidropUpgradeable.setMerklRoot(tree.root);
          await VeFnxSplitMerklAidropUpgradeable.unpause();
          await deployed.fenix.transfer(VeFnxSplitMerklAidropUpgradeable.target, ethers.parseEther('200'));
          expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('200'));
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(0);
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(0);
          expect(await deployed.votingEscrow.supply()).to.be.eq(0);
          expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);
          await VeFnxSplitMerklAidropUpgradeable.pause();
          await VeFnxSplitMerklAidropUpgradeable.setPureTokensRate(ethers.parseEther('1'));
          await VeFnxSplitMerklAidropUpgradeable.unpause();
        });
        it('should fail if user not approve tokens before claim with aggregate to lock', async () => {
          await expect(
            voter.connect(signers.otherUser1).aggregateClaim(
              [],
              { bribes: [], tokens: [] },
              { bribes: [], tokens: [], tokenId: 0 },
              { users: [], proofs: [], tokens: [], amounts: [] },
              {
                inPureTokens: true,
                withPermanentLock: false,
                managedTokenIdForAttach: 0,
                amount: ethers.parseEther('100'),
                proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('100')]),
              },
              {
                percentageToLock: ethers.parseEther('1'),
                lockDuration: 0,
                to: signers.otherUser1.address,
                shouldBoosted: false,
                withPermanentLock: true,
                managedTokenIdForAttach: 0,
              },
            ),
          ).to.be.revertedWith(ERRORS.ERC20.InsufficientAllowance);
        });

        it('100% FNX in permanent lock', async () => {
          await deployed.fenix.connect(signers.otherUser1).approve(voter.target, ethers.parseEther('100'));

          expect(await deployed.fenix.allowance(signers.otherUser1.address, voter.target)).to.be.eq(ethers.parseEther('100'));
          expect(await deployed.fenix.allowance(voter.target, deployed.votingEscrow.target)).to.be.eq(ZERO);
          expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);

          let tx = await voter.connect(signers.otherUser1).aggregateClaim(
            [],
            { bribes: [], tokens: [] },
            { bribes: [], tokens: [], tokenId: 0 },
            { users: [], proofs: [], tokens: [], amounts: [] },
            {
              inPureTokens: true,
              withPermanentLock: false,
              managedTokenIdForAttach: 0,
              amount: ethers.parseEther('100'),
              proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('100')]),
            },
            {
              percentageToLock: ethers.parseEther('1'),
              lockDuration: 0,
              to: signers.otherUser1.address,
              shouldBoosted: false,
              withPermanentLock: true,
              managedTokenIdForAttach: 0,
            },
          );
          await expect(tx)
            .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
            .withArgs(signers.otherUser1.address, ethers.parseEther('100'), ethers.parseEther('100'), 0, 0);
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(VeFnxSplitMerklAidropUpgradeable.target, signers.otherUser1.address, ethers.parseEther('100'));
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(signers.otherUser1.address, voter.target, ethers.parseEther('100'));
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(voter.target, deployed.votingEscrow.target, ethers.parseEther('100'));

          expect(await deployed.fenix.allowance(signers.otherUser1.address, voter.target)).to.be.eq(ZERO);
          expect(await deployed.fenix.allowance(voter.target, deployed.votingEscrow.target)).to.be.eq(ZERO);

          expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('100'));
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
          expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(1);
          expect(await deployed.votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
          expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

          let nftState = await deployed.votingEscrow.getNftState(1);
          expect(nftState.locked.isPermanentLocked).to.be.true;
          expect(nftState.locked.amount).to.be.eq(ethers.parseEther('100'));
        });
        it('60% FNX in lock with 91 days unlock duration, and for other recipient', async () => {
          await deployed.fenix.connect(signers.otherUser1).approve(voter.target, ethers.parseEther('60'));
          expect(await deployed.fenix.allowance(signers.otherUser1.address, voter.target)).to.be.eq(ethers.parseEther('60'));
          expect(await deployed.fenix.allowance(voter.target, deployed.votingEscrow.target)).to.be.eq(ZERO);
          expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);

          let tx = await voter.connect(signers.otherUser1).aggregateClaim(
            [],
            { bribes: [], tokens: [] },
            { bribes: [], tokens: [], tokenId: 0 },
            { users: [], proofs: [], tokens: [], amounts: [] },
            {
              inPureTokens: true,
              withPermanentLock: false,
              managedTokenIdForAttach: 0,
              amount: ethers.parseEther('100'),
              proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('100')]),
            },
            {
              percentageToLock: ethers.parseEther('0.6'),
              lockDuration: 91 * 86400,
              to: signers.otherUser2.address,
              shouldBoosted: false,
              withPermanentLock: false,
              managedTokenIdForAttach: 0,
            },
          );
          await expect(tx)
            .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
            .withArgs(signers.otherUser1.address, ethers.parseEther('100'), ethers.parseEther('100'), 0, 0);
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(VeFnxSplitMerklAidropUpgradeable.target, signers.otherUser1.address, ethers.parseEther('100'));
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(signers.otherUser1.address, voter.target, ethers.parseEther('60'));
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(voter.target, deployed.votingEscrow.target, ethers.parseEther('60'));

          expect(await deployed.fenix.allowance(signers.otherUser1.address, voter.target)).to.be.eq(ZERO);
          expect(await deployed.fenix.allowance(voter.target, deployed.votingEscrow.target)).to.be.eq(ZERO);

          expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('40'));
          expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('100'));
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('60'));
          expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(1);
          expect(await deployed.votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser2.address);
          expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(0);
          expect(await deployed.votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

          let nftState = await deployed.votingEscrow.getNftState(1);
          expect(nftState.locked.isPermanentLocked).to.be.false;
          expect(nftState.locked.amount).to.be.eq(ethers.parseEther('60'));

          let blockTimestamp = (await tx.getBlock())?.timestamp!;
          expect(nftState.locked.end).to.be.eq(Math.floor((blockTimestamp + 92 * 86400) / (86400 * 7)) * (86400 * 7));
        });

        it('10% FNX with attach to managed nft', async () => {
          let mVeNftId = 1n;
          let userTokenId_1 = 2n;

          let strategy = await newStrategy();
          await managedNFTManager.createManagedNFT(strategy);

          await deployed.fenix.connect(signers.otherUser1).approve(voter.target, ethers.parseEther('10'));
          expect(await deployed.fenix.allowance(signers.otherUser1.address, voter.target)).to.be.eq(ethers.parseEther('10'));
          expect(await deployed.fenix.allowance(voter.target, deployed.votingEscrow.target)).to.be.eq(ZERO);
          expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(mVeNftId);

          let tx = await voter.connect(signers.otherUser1).aggregateClaim(
            [],
            { bribes: [], tokens: [] },
            { bribes: [], tokens: [], tokenId: 0 },
            { users: [], proofs: [], tokens: [], amounts: [] },
            {
              inPureTokens: true,
              withPermanentLock: false,
              managedTokenIdForAttach: 0,
              amount: ethers.parseEther('100'),
              proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('100')]),
            },
            {
              percentageToLock: ethers.parseEther('0.1'),
              lockDuration: 0,
              to: signers.otherUser1.address,
              shouldBoosted: false,
              withPermanentLock: true,
              managedTokenIdForAttach: mVeNftId,
            },
          );
          await expect(tx)
            .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
            .withArgs(signers.otherUser1.address, ethers.parseEther('100'), ethers.parseEther('100'), 0, 0);
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(VeFnxSplitMerklAidropUpgradeable.target, signers.otherUser1.address, ethers.parseEther('100'));
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(signers.otherUser1.address, voter.target, ethers.parseEther('10'));
          await expect(tx)
            .to.be.emit(deployed.fenix, 'Transfer')
            .withArgs(voter.target, deployed.votingEscrow.target, ethers.parseEther('10'));

          expect(await deployed.fenix.allowance(signers.otherUser1.address, voter.target)).to.be.eq(ZERO);
          expect(await deployed.fenix.allowance(voter.target, deployed.votingEscrow.target)).to.be.eq(ZERO);

          expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('90'));
          expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('100'));
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
          expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
          expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('10'));
          expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
          expect(await deployed.votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
          expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
          expect(await deployed.votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);

          expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_1)).to.be.eq(mVeNftId);

          let nftState = await deployed.votingEscrow.nftStates(userTokenId_1);
          expect(nftState.locked.isPermanentLocked).to.be.false;
          expect(nftState.locked.end).to.be.eq(0);
          expect(nftState.locked.amount).to.be.eq(0);
          expect(nftState.isAttached).to.be.true;
          expect(nftState.isVoted).to.be.false;

          let mVeNftState = await deployed.votingEscrow.nftStates(mVeNftId);
          expect(mVeNftState.locked.isPermanentLocked).to.be.true;
          expect(mVeNftState.locked.end).to.be.eq(0);
          expect(mVeNftState.locked.amount).to.be.eq(ethers.parseEther('10'));
          expect(mVeNftState.isAttached).to.be.false;
          expect(mVeNftState.isVoted).to.be.false;
        });
      });

      it('success claim merkl aidrop in veNft form with permanent  lock = true', async () => {
        let snap = await takeSnapshot();
        await voter.updateAddress('veFnxMerklAidrop', VeFnxSplitMerklAidropUpgradeable.target);

        const tree = StandardMerkleTree.of(
          [
            [signers.otherUser1.address, ethers.parseEther('1')],
            [signers.otherUser2.address, ethers.parseEther('0.5')],
          ],
          ['address', 'uint256'],
        );
        await VeFnxSplitMerklAidropUpgradeable.setMerklRoot(tree.root);
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        await deployed.fenix.transfer(VeFnxSplitMerklAidropUpgradeable.target, ethers.parseEther('200'));
        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('200'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(0);
        expect(await deployed.votingEscrow.supply()).to.be.eq(0);
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);

        let tx = await voter.connect(signers.otherUser1).aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          {
            inPureTokens: false,
            amount: ethers.parseEther('1'),
            withPermanentLock: true,
            managedTokenIdForAttach: 0,
            proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('1')]),
          },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        );
        await VeFnxSplitMerklAidropUpgradeable.pause();
        await VeFnxSplitMerklAidropUpgradeable.setPureTokensRate(ethers.parseEther('0.25'));
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        await expect(tx)
          .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), 0, ethers.parseEther('1'), 1);
        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(VeFnxSplitMerklAidropUpgradeable.target, deployed.votingEscrow.target, ethers.parseEther('1'));
        await expect(tx).to.be.emit(deployed.votingEscrow, 'LockPermanent').withArgs(VeFnxSplitMerklAidropUpgradeable.target, 1);

        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('199'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.supply()).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await deployed.votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        let nftState = await deployed.votingEscrow.nftStates(1);
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('1'));
        expect(nftState.isAttached).to.be.false;
        expect(nftState.isVoted).to.be.false;
        await snap.restore();
      });

      it('success claim merkl aidrop in veNft form with attach to managed nft', async () => {
        let mVeNftId = 1n;
        let userTokenId_1 = 2n;

        let strategy = await newStrategy();
        await managedNFTManager.createManagedNFT(strategy);

        let snap = await takeSnapshot();
        await voter.updateAddress('veFnxMerklAidrop', VeFnxSplitMerklAidropUpgradeable.target);

        const tree = StandardMerkleTree.of(
          [
            [signers.otherUser1.address, ethers.parseEther('1')],
            [signers.otherUser2.address, ethers.parseEther('0.5')],
          ],
          ['address', 'uint256'],
        );
        await VeFnxSplitMerklAidropUpgradeable.setMerklRoot(tree.root);
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        await deployed.fenix.transfer(VeFnxSplitMerklAidropUpgradeable.target, ethers.parseEther('200'));
        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('200'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(0);
        expect(await deployed.votingEscrow.supply()).to.be.eq(0);
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(mVeNftId);

        let tx = await voter.connect(signers.otherUser1).aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          {
            inPureTokens: false,
            amount: ethers.parseEther('1'),
            withPermanentLock: true,
            managedTokenIdForAttach: mVeNftId,
            proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('1')]),
          },
          {
            percentageToLock: 0,
            lockDuration: 0,
            to: ethers.ZeroAddress,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0,
          },
        );
        await VeFnxSplitMerklAidropUpgradeable.pause();
        await VeFnxSplitMerklAidropUpgradeable.setPureTokensRate(ethers.parseEther('0.25'));
        await VeFnxSplitMerklAidropUpgradeable.unpause();
        await expect(tx)
          .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), 0, ethers.parseEther('1'), userTokenId_1);
        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(VeFnxSplitMerklAidropUpgradeable.target, deployed.votingEscrow.target, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(deployed.votingEscrow, 'LockPermanent')
          .withArgs(VeFnxSplitMerklAidropUpgradeable.target, userTokenId_1);
        await expect(tx).to.be.emit(deployed.voter, 'AttachToManagedNFT').withArgs(userTokenId_1, mVeNftId);
        expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('199'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.supply()).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
        expect(await deployed.votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.otherUser1.address);
        expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await managedNFTManager.getAttachedManagedTokenId(userTokenId_1)).to.be.eq(mVeNftId);

        let nftState = await deployed.votingEscrow.nftStates(userTokenId_1);
        expect(nftState.locked.isPermanentLocked).to.be.false;
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(0);
        expect(nftState.isAttached).to.be.true;
        expect(nftState.isVoted).to.be.false;

        let mVeNftState = await deployed.votingEscrow.nftStates(mVeNftId);
        expect(mVeNftState.locked.isPermanentLocked).to.be.true;
        expect(mVeNftState.locked.end).to.be.eq(0);
        expect(mVeNftState.locked.amount).to.be.eq(ethers.parseEther('1'));
        expect(mVeNftState.isAttached).to.be.false;
        expect(mVeNftState.isVoted).to.be.false;
      });
    });
  });
});

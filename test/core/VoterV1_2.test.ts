import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { VeFnxSplitMerklAidropUpgradeable, VoterUpgradeable, VoterUpgradeableV1_2 } from '../../typechain-types';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';
import { ZERO_ADDRESS } from '../utils/constants';
import { ethers } from 'hardhat';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

describe('Voter change governance/admin functionality', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: VoterUpgradeableV1_2;
  let VeFnxSplitMerklAidropUpgradeable: VeFnxSplitMerklAidropUpgradeable;

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
  });

  describe('#setMerklDistributor', async () => {
    it('correct merklDistributor before change', async () => {
      expect(await voter.merklDistributor()).to.be.eq(ZERO_ADDRESS);
    });
    it('fail if try call from not VoterAdmin', async () => {
      await expect(voter.connect(signers.otherUser1).setMerklDistributor(signers.otherUser1.address)).to.be.revertedWith('VOTER_ADMIN');
    });
    it('correct change merklDistributor address and emit event ', async () => {
      expect(await voter.merklDistributor()).to.be.eq(ZERO_ADDRESS);

      await expect(voter.connect(signers.deployer).setMerklDistributor(signers.otherUser1.address))
        .to.be.emit(voter, 'SetMerklDistributor')
        .withArgs(signers.otherUser1.address);

      expect(await voter.merklDistributor()).to.be.not.eq(signers.deployer.address);
      expect(await voter.merklDistributor()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#setVeFnxMerklAidrop', async () => {
    it('correct veFnxMerklAidrop before change', async () => {
      expect(await voter.veFnxMerklAidrop()).to.be.eq(ZERO_ADDRESS);
    });
    it('fail if try call from not VoterAdmin', async () => {
      await expect(voter.connect(signers.otherUser1).setVeFnxMerklAidrop(signers.otherUser1.address)).to.be.revertedWith('VOTER_ADMIN');
    });
    it('correct change veFnxMerklAidrop address and emit event ', async () => {
      expect(await voter.veFnxMerklAidrop()).to.be.eq(ZERO_ADDRESS);

      await expect(voter.connect(signers.deployer).setVeFnxMerklAidrop(signers.otherUser1.address))
        .to.be.emit(voter, 'SetVeFnxMerklAidrop')
        .withArgs(signers.otherUser1.address);

      expect(await voter.veFnxMerklAidrop()).to.be.not.eq(signers.deployer.address);
      expect(await voter.veFnxMerklAidrop()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#aggregateClaim', async () => {
    it('not fail if all params is empty', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          { amount: 0, proofs: [] },
        ),
      ).to.be.not.reverted;
    });
    it('fail if in AggregateClaimBribesByTokenIdParams set not user token id', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [ZERO_ADDRESS], tokens: [], tokenId: 5 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          { amount: 0, proofs: [] },
        ),
      ).to.be.revertedWith('!approved/Owner');
    });
    it('fail if in AggregateClaimMerklDataParams users containes not only caller address', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [signers.otherUser1.address], proofs: [], tokens: [], amounts: [] },
          { amount: 0, proofs: [] },
        ),
      ).to.be.revertedWith('users containes no only caller');
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [signers.deployer.address, signers.otherUser1.address], proofs: [], tokens: [], amounts: [] },
          { amount: 0, proofs: [] },
        ),
      ).to.be.revertedWith('users containes no only caller');
    });
    it('success claim merkl aidrop', async () => {
      await voter.setVeFnxMerklAidrop(VeFnxSplitMerklAidropUpgradeable.target);

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
      expect(await deployed.votingEscrow.tokenId()).to.be.eq(0);

      let tx = await voter
        .connect(signers.otherUser1)
        .aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
          { amount: ethers.parseEther('1'), proofs: tree.getProof([signers.otherUser1.address, ethers.parseEther('1')]) },
        );

      await expect(tx)
        .to.be.emit(VeFnxSplitMerklAidropUpgradeable, 'Claim')
        .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('0.6'), ethers.parseEther('0.4'), 1);
      await expect(tx)
        .to.be.emit(deployed.fenix, 'Transfer')
        .withArgs(VeFnxSplitMerklAidropUpgradeable.target, signers.otherUser1.address, ethers.parseEther('0.6'));
      await expect(tx)
        .to.be.emit(deployed.fenix, 'Transfer')
        .withArgs(VeFnxSplitMerklAidropUpgradeable.target, deployed.votingEscrow.target, ethers.parseEther('0.4'));

      expect(await deployed.fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('0.6'));
      expect(await deployed.fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await deployed.fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
      expect(await deployed.fenix.balanceOf(VeFnxSplitMerklAidropUpgradeable.target)).to.be.eq(ethers.parseEther('199'));
      expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
      expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser2.address)).to.be.eq(0);
      expect(await VeFnxSplitMerklAidropUpgradeable.userClaimed(signers.otherUser3.address)).to.be.eq(0);
      expect(await deployed.fenix.balanceOf(deployed.votingEscrow.target)).to.be.eq(ethers.parseEther('0.4'));
      expect(await deployed.votingEscrow.supply()).to.be.eq(ethers.parseEther('0.4'));
      expect(await deployed.votingEscrow.tokenId()).to.be.eq(1);
      expect(await deployed.votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
      expect(await deployed.votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
    });
  });
});

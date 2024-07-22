import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { VoterUpgradeable, VoterUpgradeableV1_2 } from '../../typechain-types';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';
import { ZERO_ADDRESS } from '../utils/constants';

describe('Voter change governance/admin functionality', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: VoterUpgradeableV1_2;

  before(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    voter = deployed.voter;
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

  describe('#aggregateClaim', async () => {
    it('not fail if all params is empty', async () => {
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [], proofs: [], tokens: [], amounts: [] },
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
        ),
      ).to.be.revertedWith('users containes no only caller');
      await expect(
        voter.aggregateClaim(
          [],
          { bribes: [], tokens: [] },
          { bribes: [], tokens: [], tokenId: 0 },
          { users: [signers.deployer.address, signers.otherUser1.address], proofs: [], tokens: [], amounts: [] },
        ),
      ).to.be.revertedWith('users containes no only caller');
    });
  });
});

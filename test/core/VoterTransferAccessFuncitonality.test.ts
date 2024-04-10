import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { VoterUpgradeable } from '../../typechain-types';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';
import { ZERO_ADDRESS } from '../utils/constants';

describe('Voter change governance/admin functionality', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: VoterUpgradeable;

  before(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    voter = deployed.voter;
  });

  describe('#setGovernance', async () => {
    it('correct governance before change', async () => {
      expect(await voter.governance()).to.be.eq(signers.deployer.address);
    });
    it('fail if try set zero address', async () => {
      await expect(voter.connect(signers.deployer).setGovernance(ZERO_ADDRESS)).to.be.revertedWith('addr0');
    });
    it('fail if try change governance from not actual governacne address', async () => {
      await expect(voter.connect(signers.otherUser1).setGovernance(signers.otherUser1.address)).to.be.revertedWith('GOVERNANCE');
    });
    it('correct call from actual governance and fail from future ', async () => {
      await expect(voter.connect(signers.deployer).whitelist([])).to.be.not.reverted;
      await expect(voter.connect(signers.otherUser1).whitelist([])).to.be.revertedWith('GOVERNANCE');
    });
    it('correct change governance address and emit event ', async () => {
      expect(await voter.governance()).to.be.eq(signers.deployer.address);

      await expect(voter.connect(signers.deployer).setGovernance(signers.otherUser1.address))
        .to.be.emit(voter, 'SetGovernance')
        .withArgs(signers.deployer.address, signers.otherUser1.address);

      expect(await voter.governance()).to.be.not.eq(signers.deployer.address);
      expect(await voter.governance()).to.be.eq(signers.otherUser1.address);
    });
    it('correct call from actual governance and fail from past ', async () => {
      await expect(voter.connect(signers.deployer).whitelist([])).to.be.revertedWith('GOVERNANCE');
      await expect(voter.connect(signers.otherUser1).whitelist([])).to.be.not.reverted;
    });
  });

  describe('#setVoterAdmin', async () => {
    it('correct admin before change', async () => {
      expect(await voter.admin()).to.be.eq(signers.deployer.address);
    });
    it('fail if try set zero address', async () => {
      await expect(voter.connect(signers.deployer).setVoterAdmin(ZERO_ADDRESS)).to.be.revertedWith('addr0');
    });
    it('fail if try change admin from not actual admin address', async () => {
      await expect(voter.connect(signers.otherUser2).setVoterAdmin(signers.otherUser2.address)).to.be.revertedWith('VOTER_ADMIN');
    });
    it('correct call from actual admin and fail from future ', async () => {
      await expect(voter.connect(signers.deployer).setVoteDelay(1)).to.be.not.reverted;
      await expect(voter.connect(signers.otherUser2).setVoteDelay(2)).to.be.revertedWith('VOTER_ADMIN');
    });
    it('correct change admin address and emit event ', async () => {
      expect(await voter.admin()).to.be.eq(signers.deployer.address);

      await expect(voter.connect(signers.deployer).setVoterAdmin(signers.otherUser2.address))
        .to.be.emit(voter, 'SetVoterAdmin')
        .withArgs(signers.deployer.address, signers.otherUser2.address);

      expect(await voter.admin()).to.be.not.eq(signers.deployer.address);
      expect(await voter.admin()).to.be.eq(signers.otherUser2.address);
    });
    it('correct call from actual admin and fail from past ', async () => {
      await expect(voter.connect(signers.deployer).setVoteDelay(1)).to.be.revertedWith('VOTER_ADMIN');
      await expect(voter.connect(signers.otherUser2).setVoteDelay(0)).to.be.not.reverted;
    });
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ZeroAddress } from 'ethers';
import { ethers } from 'hardhat';
import * as typechainTypes from '../../../typechain-types';
import { VotingEscrowUpgradeableV2 } from '../../../typechain-types';
import { ZERO } from '../../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../../utils/coreFixture';

describe('VotingEscrow-BurnToBribes', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: typechainTypes.VoterUpgradeableV2;

  let votingEscrow: VotingEscrowUpgradeableV2;
  let veBoost: typechainTypes.VeBoostUpgradeable;
  let managedNFTManager: typechainTypes.ManagedNFTManagerUpgradeable;

  let fenix: typechainTypes.Fenix;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = deployed.fenix;
    veBoost = deployed.veBoost;
    voter = deployed.voter;
    votingEscrow = deployed.votingEscrow;
    managedNFTManager = deployed.managedNFTManager;

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

    expect(await votingEscrow.totalSupply()).to.be.eq(0);
  });

  describe('updateAddress', async () => {
    it('success update customBribeRewardRouter address', async () => {
      expect(await votingEscrow.customBribeRewardRouter()).to.be.eq(ZeroAddress);

      await expect(votingEscrow.updateAddress('customBribeRewardRouter', signers.fenixTeam))
        .to.be.emit(votingEscrow, 'UpdateAddress')
        .withArgs('customBribeRewardRouter', signers.fenixTeam);

      expect(await votingEscrow.customBribeRewardRouter()).to.be.eq(signers.fenixTeam);
    });
  });

  describe('burnToBribes', async () => {
    describe('should fail if', async () => {
      it('call with not exists token id', async () => {
        await expect(votingEscrow.burnToBribes(10)).to.be.revertedWith('ERC721: invalid token ID');
      });

      it('call for other nft', async () => {
        await votingEscrow
          .connect(signers.otherUser1)
          .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let userTokenId_1 = await votingEscrow.lastMintedTokenId();

        await expect(votingEscrow.burnToBribes(userTokenId_1)).to.be.revertedWithCustomError(votingEscrow, 'AccessDenied');
      });

      it('call for own nft, but not from customBribeRewardRouter', async () => {
        await fenix.connect(signers.fenixTeam).approve(votingEscrow, ethers.parseEther('200'));
        await fenix.transfer(signers.fenixTeam, ethers.parseEther('10'));

        await votingEscrow.updateAddress('customBribeRewardRouter', signers.deployer);
        await votingEscrow
          .connect(signers.fenixTeam)
          .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
        let userTokenId_1 = await votingEscrow.lastMintedTokenId();

        await expect(votingEscrow.connect(signers.fenixTeam).burnToBribes(userTokenId_1)).to.be.revertedWithCustomError(
          votingEscrow,
          'AccessDenied',
        );
      });

      it('call for own nft, but customBribeRewardRouter not setup', async () => {
        await fenix.connect(signers.fenixTeam).approve(votingEscrow, ethers.parseEther('200'));
        await fenix.transfer(signers.fenixTeam, ethers.parseEther('10'));
        await votingEscrow
          .connect(signers.fenixTeam)
          .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.fenixTeam.address, false, false, 0);
        let userTokenId_1 = await votingEscrow.lastMintedTokenId();

        await expect(votingEscrow.connect(signers.fenixTeam).burnToBribes(userTokenId_1)).to.be.revertedWithCustomError(
          votingEscrow,
          'AccessDenied',
        );
      });
    });

    it('Success burn own nft with permanent lock', async () => {
      await fenix.connect(signers.otherUser1).approve(votingEscrow, ethers.parseEther('200'));
      await fenix.connect(signers.otherUser2).approve(votingEscrow, ethers.parseEther('200'));

      await fenix.transfer(signers.otherUser1, ethers.parseEther('1'));
      await fenix.transfer(signers.otherUser2, ethers.parseEther('1'));

      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, true, 0);
      let userTokenId_1 = await votingEscrow.lastMintedTokenId();

      expect((await votingEscrow.getNftState(userTokenId_1)).locked.isPermanentLocked).to.be.true;

      await votingEscrow.connect(signers.otherUser1).transferFrom(signers.otherUser1, signers.fenixTeam, userTokenId_1);

      await votingEscrow.updateAddress('customBribeRewardRouter', signers.fenixTeam);

      expect(await votingEscrow.totalSupply()).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.fenixTeam);

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('1'));
      expect(await fenix.balanceOf(votingEscrow)).to.be.eq(ethers.parseEther('1'));
      expect(await fenix.balanceOf(signers.fenixTeam)).to.be.eq(0);

      let tx = await votingEscrow.connect(signers.fenixTeam).burnToBribes(userTokenId_1);

      expect(await votingEscrow.totalSupply()).to.be.eq(0);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_1);
      await expect(votingEscrow.ownerOf(userTokenId_1)).to.be.revertedWith('ERC721: invalid token ID');

      expect(await votingEscrow.supply()).to.be.eq(0);
      expect(await fenix.balanceOf(votingEscrow)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.fenixTeam)).to.be.eq(ethers.parseEther('1'));

      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), 0);
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(signers.fenixTeam, ethers.ZeroAddress, userTokenId_1);
      await expect(tx).to.be.emit(votingEscrow, 'BurnToBribes').withArgs(signers.fenixTeam, userTokenId_1, ethers.parseEther('1'));
      await expect(tx)
        .to.be.emit(votingEscrow, 'Withdraw')
        .withArgs(signers.fenixTeam, userTokenId_1, ethers.parseEther('1'), (t: any) => {
          return true;
        });
    });

    it('Success burn from customBribeRewardRouter', async () => {
      await fenix.connect(signers.otherUser1).approve(votingEscrow, ethers.parseEther('200'));
      await fenix.connect(signers.otherUser2).approve(votingEscrow, ethers.parseEther('200'));

      await fenix.transfer(signers.otherUser1, ethers.parseEther('1'));
      await fenix.transfer(signers.otherUser2, ethers.parseEther('1'));

      await votingEscrow
        .connect(signers.otherUser1)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser1.address, false, false, 0);
      let userTokenId_1 = await votingEscrow.lastMintedTokenId();
      await votingEscrow.connect(signers.otherUser1).transferFrom(signers.otherUser1, signers.fenixTeam, userTokenId_1);

      await votingEscrow
        .connect(signers.otherUser2)
        .createLockFor(ethers.parseEther('1'), 182 * 86400, signers.otherUser2.address, false, false, 0);
      let userTokenId_2 = await votingEscrow.lastMintedTokenId();
      await votingEscrow.connect(signers.otherUser2).transferFrom(signers.otherUser2, signers.fenixTeam, userTokenId_2);

      await votingEscrow.updateAddress('customBribeRewardRouter', signers.fenixTeam);

      expect(await votingEscrow.totalSupply()).to.be.eq(2);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_2);
      expect(await votingEscrow.ownerOf(userTokenId_1)).to.be.eq(signers.fenixTeam);
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.fenixTeam);

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('2'));
      expect(await fenix.balanceOf(votingEscrow)).to.be.eq(ethers.parseEther('2'));
      expect(await fenix.balanceOf(signers.fenixTeam)).to.be.eq(0);

      let tx = await votingEscrow.connect(signers.fenixTeam).burnToBribes(userTokenId_1);

      expect(await votingEscrow.totalSupply()).to.be.eq(1);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_2);
      await expect(votingEscrow.ownerOf(userTokenId_1)).to.be.revertedWith('ERC721: invalid token ID');
      expect(await votingEscrow.ownerOf(userTokenId_2)).to.be.eq(signers.fenixTeam);

      expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('1'));
      expect(await fenix.balanceOf(votingEscrow)).to.be.eq(ethers.parseEther('1'));
      expect(await fenix.balanceOf(signers.fenixTeam)).to.be.eq(ethers.parseEther('1'));

      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('2'), ethers.parseEther('1'));
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(signers.fenixTeam, ethers.ZeroAddress, userTokenId_1);
      await expect(tx).to.be.emit(votingEscrow, 'BurnToBribes').withArgs(signers.fenixTeam, userTokenId_1, ethers.parseEther('1'));
      await expect(tx)
        .to.be.emit(votingEscrow, 'Withdraw')
        .withArgs(signers.fenixTeam, userTokenId_1, ethers.parseEther('1'), (t: any) => {
          return true;
        });

      tx = await votingEscrow.connect(signers.fenixTeam).burnToBribes(userTokenId_2);

      expect(await votingEscrow.totalSupply()).to.be.eq(0);
      expect(await votingEscrow.lastMintedTokenId()).to.be.eq(userTokenId_2);
      await expect(votingEscrow.ownerOf(userTokenId_1)).to.be.revertedWith('ERC721: invalid token ID');
      await expect(votingEscrow.ownerOf(userTokenId_2)).to.be.revertedWith('ERC721: invalid token ID');

      expect(await votingEscrow.supply()).to.be.eq(0);
      expect(await fenix.balanceOf(votingEscrow)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.fenixTeam)).to.be.eq(ethers.parseEther('2'));

      await expect(tx).to.be.emit(votingEscrow, 'Supply').withArgs(ethers.parseEther('1'), 0);
      await expect(tx).to.be.emit(votingEscrow, 'Transfer').withArgs(signers.fenixTeam, ethers.ZeroAddress, userTokenId_2);
      await expect(tx).to.be.emit(votingEscrow, 'BurnToBribes').withArgs(signers.fenixTeam, userTokenId_2, ethers.parseEther('1'));
      await expect(tx)
        .to.be.emit(votingEscrow, 'Withdraw')
        .withArgs(signers.fenixTeam, userTokenId_2, ethers.parseEther('1'), (t: any) => {
          return true;
        });

      let nftState = await votingEscrow.getNftState(userTokenId_1);
      expect(nftState.locked.end).to.be.eq(0);
      expect(nftState.locked.isPermanentLocked).to.be.false;
      expect(nftState.locked.amount).to.be.eq(0);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.eq(0);
      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(0);

      nftState = await votingEscrow.getNftState(userTokenId_2);
      expect(nftState.locked.end).to.be.eq(0);
      expect(nftState.locked.isPermanentLocked).to.be.false;
      expect(nftState.locked.amount).to.be.eq(0);
      expect(await votingEscrow.balanceOfNftIgnoreOwnershipChange(userTokenId_1)).to.be.eq(0);
      expect(await votingEscrow.votingPowerTotalSupply()).to.be.eq(0);
    });
  });
});

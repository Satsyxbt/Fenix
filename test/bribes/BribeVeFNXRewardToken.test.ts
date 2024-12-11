import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, getAccessControlError, WEEK, ZERO_ADDRESS } from '../utils/constants';

import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable,
  BribeVeFNXRewardToken,
  ERC20Mock,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  deployVoter,
} from '../utils/coreFixture';
import { ContractTransactionResponse, EtherSymbol } from 'ethers';

describe('BribeVeFNXRewardToken Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;

  let BribeVeFNXRewardToken: BribeVeFNXRewardToken;
  let BribeVeFNXRewardToken_Implementation: BribeVeFNXRewardToken;
  let VotingEscrow: VotingEscrowUpgradeableV2;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;

    BribeVeFNXRewardToken_Implementation = await ethers.deployContract('BribeVeFNXRewardToken', [signers.blastGovernor]);

    let Proxy = await ethers.deployContract('TransparentUpgradeableProxy', [
      BribeVeFNXRewardToken_Implementation,
      signers.proxyAdmin,
      '0x',
    ]);

    BribeVeFNXRewardToken = await ethers.getContractAt('BribeVeFNXRewardToken', Proxy.target);
    await BribeVeFNXRewardToken.initialize(signers.blastGovernor, deployed.votingEscrow);
    VotingEscrow = deployed.votingEscrow;
  });

  describe('Deployment', async () => {
    describe('Should fail if', async () => {
      it('initialzie second time', async () => {
        await expect(BribeVeFNXRewardToken.initialize(signers.blastGovernor, deployed.votingEscrow)).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
      it('initialzie on implementation', async () => {
        await expect(BribeVeFNXRewardToken_Implementation.initialize(signers.blastGovernor, deployed.votingEscrow)).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
    });

    describe('Success initialize', async () => {
      it('containes roles', async () => {
        expect(await BribeVeFNXRewardToken.DEFAULT_ADMIN_ROLE()).to.be.eq(ethers.ZeroHash);
        expect(await BribeVeFNXRewardToken.MINTER_ROLE()).to.be.eq(ethers.id('MINTER_ROLE'));
        expect(await BribeVeFNXRewardToken.WHITELIST_ROLE()).to.be.eq(ethers.id('WHITELIST_ROLE'));
      });

      it('default createLockParams', async () => {
        let createLockParams = await BribeVeFNXRewardToken.createLockParams();

        expect(createLockParams.shouldBoosted).to.be.false;
        expect(createLockParams.withPermanentLock).to.be.false;
        expect(createLockParams.managedTokenIdForAttach).to.be.eq(0);
        expect(createLockParams.lockDuration).to.be.eq(182 * 24 * 60 * 60);
      });

      it('grant roles', async () => {
        expect(await BribeVeFNXRewardToken.hasRole(await BribeVeFNXRewardToken.DEFAULT_ADMIN_ROLE(), signers.deployer)).to.be.true;
      });

      it('ERC20 name & symbols', async () => {
        expect(await BribeVeFNXRewardToken.name()).to.be.eq('Bribe VeFNX Reward Token');
        expect(await BribeVeFNXRewardToken.symbol()).to.be.eq('brVeFNX');
        expect(await BribeVeFNXRewardToken.decimals()).to.be.eq(18);
      });

      it('votingEscrow', async () => {
        expect(await BribeVeFNXRewardToken.votingEscrow()).to.be.eq(deployed.votingEscrow);
      });

      it('underlyingToken', async () => {
        expect(await BribeVeFNXRewardToken.underlyingToken()).to.be.eq(deployed.fenix);
      });
    });
  });

  describe('#mint', async () => {
    it('should fail if call from not authorized user (MINTER_ROLE)', async () => {
      await expect(BribeVeFNXRewardToken.connect(signers.otherUser1).mint(signers.otherUser1, 1)).to.be.revertedWith(
        getAccessControlError(await BribeVeFNXRewardToken.MINTER_ROLE(), signers.otherUser1.address),
      );
    });

    describe('success mint', async () => {
      let tx: ContractTransactionResponse;

      beforeEach(async () => {
        await deployed.fenix.transfer(signers.otherUser1, ethers.parseEther('10'));
        await BribeVeFNXRewardToken.grantRole(await BribeVeFNXRewardToken.MINTER_ROLE(), signers.otherUser1);
        await deployed.fenix.connect(signers.otherUser1).approve(BribeVeFNXRewardToken.target, ethers.MaxUint256);

        tx = await BribeVeFNXRewardToken.connect(signers.otherUser1).mint(signers.otherUser1.address, ethers.parseEther('1'));
      });

      it('success change states', async () => {
        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));
      });

      it('success emit events', async () => {
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.otherUser1, BribeVeFNXRewardToken, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(ethers.ZeroAddress, signers.otherUser1, ethers.parseEther('1'));
      });

      it('success change balances', async () => {
        expect(await deployed.fenix.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('9'));
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('1'));
      });

      it('second mint to other recipient', async () => {
        tx = await BribeVeFNXRewardToken.connect(signers.otherUser1).mint(signers.otherUser2.address, ethers.parseEther('5'));
        await expect(tx).to.be.emit(deployed.fenix, 'Transfer').withArgs(signers.otherUser1, BribeVeFNXRewardToken, ethers.parseEther('5'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(ethers.ZeroAddress, signers.otherUser2, ethers.parseEther('5'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser2)).to.be.eq(ethers.parseEther('5'));
        expect(await deployed.fenix.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('4'));
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('6'));
        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('6'));
      });
    });
  });

  describe('#updateCreateLockParams', async () => {
    it('should fail if call from not authorized user (DEFAULT_ADMIN_ROLE)', async () => {
      await expect(
        BribeVeFNXRewardToken.connect(signers.otherUser1).updateCreateLockParams({
          lockDuration: 0n,
          withPermanentLock: false,
          managedTokenIdForAttach: 0n,
          shouldBoosted: false,
        }),
      ).to.be.revertedWith(getAccessControlError(await BribeVeFNXRewardToken.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address));
    });

    it('success update defualt create lock params', async () => {
      expect(await BribeVeFNXRewardToken.createLockParams()).to.be.deep.eq([182 * 24 * 60 * 60, false, false, 0]);

      await expect(
        BribeVeFNXRewardToken.updateCreateLockParams({
          lockDuration: 182 * 24 * 60 * 60,
          withPermanentLock: false,
          managedTokenIdForAttach: 0n,
          shouldBoosted: true,
        }),
      )
        .to.be.emit(BribeVeFNXRewardToken, 'UpdateCreateLockParams')
        .withArgs([182 * 24 * 60 * 60, true, false, 0]);

      expect(await BribeVeFNXRewardToken.createLockParams()).to.be.deep.eq([182 * 24 * 60 * 60, true, false, 0]);

      await expect(
        BribeVeFNXRewardToken.updateCreateLockParams({
          lockDuration: 0,
          withPermanentLock: true,
          managedTokenIdForAttach: 1,
          shouldBoosted: true,
        }),
      )
        .to.be.emit(BribeVeFNXRewardToken, 'UpdateCreateLockParams')
        .withArgs([0, true, true, 1]);

      expect(await BribeVeFNXRewardToken.createLockParams()).to.be.deep.eq([0, true, true, 1]);
    });
  });

  describe('Convertation amount during transfer to lock', async () => {
    beforeEach(async () => {
      await BribeVeFNXRewardToken.grantRole(await BribeVeFNXRewardToken.MINTER_ROLE(), signers.deployer);
      await deployed.fenix.approve(BribeVeFNXRewardToken.target, ethers.MaxUint256);
      await BribeVeFNXRewardToken.updateCreateLockParams({
        lockDuration: 0,
        withPermanentLock: true,
        managedTokenIdForAttach: 0,
        shouldBoosted: false,
      });

      expect(await deployed.votingEscrow.lastMintedTokenId()).to.be.eq(0);
    });

    describe('not convertation if', async () => {
      it('mint proccess', async () => {
        await BribeVeFNXRewardToken.mint(signers.otherUser1.address, ethers.parseEther('1'));
      });

      it('transfer from minter', async () => {
        await BribeVeFNXRewardToken.mint(signers.deployer, ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));

        await BribeVeFNXRewardToken.transfer(signers.otherUser2, ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));
      });

      it('transfer to whitelist address', async () => {
        await BribeVeFNXRewardToken.mint(signers.otherUser2.address, ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));

        await BribeVeFNXRewardToken.grantRole(await BribeVeFNXRewardToken.WHITELIST_ROLE(), signers.otherUser1);

        expect(await BribeVeFNXRewardToken.hasRole(await BribeVeFNXRewardToken.WHITELIST_ROLE(), signers.otherUser1)).to.be.true;

        await BribeVeFNXRewardToken.connect(signers.otherUser2).transfer(signers.otherUser1, ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));
      });
    });

    describe('successe convertation and create lock', async () => {
      it('transfer from whitelist role to just user', async () => {
        await BribeVeFNXRewardToken.grantRole(await BribeVeFNXRewardToken.WHITELIST_ROLE(), signers.otherUser1);

        await BribeVeFNXRewardToken.mint(signers.otherUser1, ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser2)).to.be.eq(ethers.parseEther('0'));
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('1'));

        let tx = await BribeVeFNXRewardToken.connect(signers.otherUser1).transfer(signers.otherUser2, ethers.parseEther('0.6'));
        let mintedId = await deployed.votingEscrow.lastMintedTokenId();

        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser1, signers.otherUser2, ethers.parseEther('0.6'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser2, ethers.ZeroAddress, ethers.parseEther('0.6'));

        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(BribeVeFNXRewardToken, deployed.votingEscrow, ethers.parseEther('0.6'));

        await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser2, mintedId);
        await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedId);
        await expect(tx)
          .to.be.emit(VotingEscrow, 'Deposit')
          .withArgs(
            BribeVeFNXRewardToken,
            mintedId,
            ethers.parseEther('0.6'),
            (t: any) => {
              return true;
            },
            1,

            (
              await tx.getBlock()
            )?.timestamp,
          );
        await expect(tx).to.be.emit(VotingEscrow, 'Supply').withArgs(0, ethers.parseEther('0.6'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('0.4'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('0.4'));
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('0.4'));

        expect(await VotingEscrow.balanceOf(signers.otherUser2)).to.be.eq(1);

        expect(await VotingEscrow.ownerOf(mintedId)).to.be.eq(signers.otherUser2);

        let nftState = await VotingEscrow.getNftState(mintedId);

        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('0.6'));
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.end).to.be.eq(0);

        tx = await BribeVeFNXRewardToken.connect(signers.otherUser1).transfer(signers.otherUser3, ethers.parseEther('0.4'));
        mintedId = await deployed.votingEscrow.lastMintedTokenId();

        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser1, signers.otherUser3, ethers.parseEther('0.4'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser3, ethers.ZeroAddress, ethers.parseEther('0.4'));

        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(BribeVeFNXRewardToken, deployed.votingEscrow, ethers.parseEther('0.4'));

        await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser3, mintedId);
        await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedId);
        await expect(tx)
          .to.be.emit(VotingEscrow, 'Deposit')
          .withArgs(
            BribeVeFNXRewardToken,
            mintedId,
            ethers.parseEther('0.4'),
            (t: any) => {
              return true;
            },
            1,

            (
              await tx.getBlock()
            )?.timestamp,
          );
        await expect(tx).to.be.emit(VotingEscrow, 'Supply').withArgs(ethers.parseEther('0.6'), ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser2)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser3)).to.be.eq(0);

        expect(await VotingEscrow.balanceOf(signers.otherUser2)).to.be.eq(1);
        expect(await VotingEscrow.balanceOf(signers.otherUser3)).to.be.eq(1);

        expect(await VotingEscrow.ownerOf(mintedId - 1n)).to.be.eq(signers.otherUser2);
        expect(await VotingEscrow.ownerOf(mintedId)).to.be.eq(signers.otherUser3);

        nftState = await VotingEscrow.getNftState(mintedId);

        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('0.4'));
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.end).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('0'));
        expect(await deployed.fenix.balanceOf(VotingEscrow)).to.be.eq(ethers.parseEther('1'));
      });
      it('transfer from user to user', async () => {
        expect(await BribeVeFNXRewardToken.hasRole(await BribeVeFNXRewardToken.WHITELIST_ROLE(), signers.otherUser1)).to.be.false;
        await BribeVeFNXRewardToken.mint(signers.otherUser1, ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser2)).to.be.eq(ethers.parseEther('0'));
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('1'));

        let tx = await BribeVeFNXRewardToken.connect(signers.otherUser1).transfer(signers.otherUser2, ethers.parseEther('0.6'));
        let mintedId = await deployed.votingEscrow.lastMintedTokenId();

        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser1, signers.otherUser2, ethers.parseEther('0.6'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser2, ethers.ZeroAddress, ethers.parseEther('0.6'));

        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(BribeVeFNXRewardToken, deployed.votingEscrow, ethers.parseEther('0.6'));

        await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser2, mintedId);
        await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedId);
        await expect(tx)
          .to.be.emit(VotingEscrow, 'Deposit')
          .withArgs(
            BribeVeFNXRewardToken,
            mintedId,
            ethers.parseEther('0.6'),
            (t: any) => {
              return true;
            },
            1,

            (
              await tx.getBlock()
            )?.timestamp,
          );
        await expect(tx).to.be.emit(VotingEscrow, 'Supply').withArgs(0, ethers.parseEther('0.6'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('0.4'));
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(ethers.parseEther('0.4'));
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('0.4'));

        expect(await VotingEscrow.balanceOf(signers.otherUser2)).to.be.eq(1);

        expect(await VotingEscrow.ownerOf(mintedId)).to.be.eq(signers.otherUser2);

        let nftState = await VotingEscrow.getNftState(mintedId);

        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('0.6'));
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.end).to.be.eq(0);

        tx = await BribeVeFNXRewardToken.connect(signers.otherUser1).transfer(signers.otherUser3, ethers.parseEther('0.4'));
        mintedId = await deployed.votingEscrow.lastMintedTokenId();

        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser1, signers.otherUser3, ethers.parseEther('0.4'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(signers.otherUser3, ethers.ZeroAddress, ethers.parseEther('0.4'));

        await expect(tx)
          .to.be.emit(deployed.fenix, 'Transfer')
          .withArgs(BribeVeFNXRewardToken, deployed.votingEscrow, ethers.parseEther('0.4'));

        await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser3, mintedId);
        await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedId);
        await expect(tx)
          .to.be.emit(VotingEscrow, 'Deposit')
          .withArgs(
            BribeVeFNXRewardToken,
            mintedId,
            ethers.parseEther('0.4'),
            (t: any) => {
              return true;
            },
            1,

            (
              await tx.getBlock()
            )?.timestamp,
          );
        await expect(tx).to.be.emit(VotingEscrow, 'Supply').withArgs(ethers.parseEther('0.6'), ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser1)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser2)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.balanceOf(signers.otherUser3)).to.be.eq(0);

        expect(await VotingEscrow.balanceOf(signers.otherUser2)).to.be.eq(1);
        expect(await VotingEscrow.balanceOf(signers.otherUser3)).to.be.eq(1);

        expect(await VotingEscrow.ownerOf(mintedId - 1n)).to.be.eq(signers.otherUser2);
        expect(await VotingEscrow.ownerOf(mintedId)).to.be.eq(signers.otherUser3);

        nftState = await VotingEscrow.getNftState(mintedId);

        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('0.4'));
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.end).to.be.eq(0);
        expect(await deployed.fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('0'));
        expect(await deployed.fenix.balanceOf(VotingEscrow)).to.be.eq(ethers.parseEther('1'));
      });
    });
  });
});

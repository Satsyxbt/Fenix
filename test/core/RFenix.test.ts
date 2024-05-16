import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Solex, RSolex, RSolex__factory, VotingEscrowUpgradeable } from '../../typechain-types';
import { ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';

describe('rFNX', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let fenix: Solex;
  let votingEscrow: VotingEscrowUpgradeable;
  let factory: RSolex__factory;
  let instance: RSolex;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    fenix = deployed.solex;
    votingEscrow = deployed.votingEscrow;
    signers = deployed.signers;

    factory = await ethers.getContractFactory('RSolex');

    instance = await factory.deploy(deployed.modeSfs.target, deployed.sfsAssignTokenId, votingEscrow.target);
  });

  describe('Deployment', function () {
    it('should fail if provide zero modesfs address', async function () {
      await expect(factory.deploy(ZERO_ADDRESS, deployed.sfsAssignTokenId, votingEscrow.target)).to.be.revertedWithCustomError(
        factory,
        'AddressZero',
      );
    });
    it('should fail if provide zero assign token id', async function () {
      await expect(factory.deploy(deployed.modeSfs.target, 0, votingEscrow.target)).to.be.revertedWithCustomError(
        factory,
        'ZeroSfsAssignTokenId',
      );
    });
    it('should fail if provide zero votingEscrow', async function () {
      await expect(factory.deploy(deployed.modeSfs.target, deployed.sfsAssignTokenId, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        factory,
        'AddressZero',
      );
    });
    it('should correct set inital parameters', async () => {
      expect(await instance.symbol()).to.be.eq('rSOLEX');
      expect(await instance.name()).to.be.eq('rSOLEX');
      expect(await instance.totalSupply()).to.be.eq(ZERO);
      expect(await instance.owner()).to.be.eq(signers.deployer.address);
      expect(await instance.token()).to.be.eq(fenix.target);
      expect(await votingEscrow.token()).to.be.eq(await instance.token());
      expect(await instance.votingEscrow()).to.be.eq(votingEscrow.target);
    });
  });

  describe('#recoverToken', async () => {
    it('should fail if caller not contract owner', async function () {
      await expect(instance.connect(signers.otherUser1).recoverToken(1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });

    it('should fail if contract have insuffation balance', async function () {
      await expect(instance.recoverToken(1)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('success recover token from contract balance and transfer to owner', async () => {
      await fenix.transfer(instance.target, ONE);

      await instance.transferOwnership(signers.otherUser1.address);
      await instance.connect(signers.otherUser1).acceptOwnership();

      let startContractBalance = await fenix.balanceOf(instance.target);
      let startBalance = await fenix.balanceOf(signers.otherUser1.address);
      await expect(instance.connect(signers.otherUser1).recoverToken(ONE))
        .to.be.emit(instance, 'Recover')
        .withArgs(signers.otherUser1.address, ONE);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(startBalance + ONE);

      expect(await fenix.balanceOf(instance.target)).to.be.eq(startContractBalance - ONE);
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ZERO);
    });

    it('success recover 99% tokens from contract balance and transfer to owner', async () => {
      await fenix.transfer(instance.target, ONE_ETHER);

      let transferAmount = ethers.parseEther('0.99');

      let startContractBalance = await fenix.balanceOf(instance.target);
      let startBalance = await fenix.balanceOf(signers.deployer.address);

      await expect(instance.recoverToken(transferAmount))
        .to.be.emit(instance, 'Recover')
        .withArgs(signers.deployer.address, transferAmount);

      expect(await fenix.balanceOf(signers.deployer.address)).to.be.eq(startBalance + transferAmount);

      expect(await fenix.balanceOf(instance.target)).to.be.eq(startContractBalance - transferAmount);
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('0.01'));
    });
  });

  describe('Minting', function () {
    it('Should mint new tokens and increase totalSupply correctly', async function () {
      expect(await instance.totalSupply()).to.equal(ZERO);
      expect(await instance.balanceOf(signers.otherUser1.address)).to.equal(ZERO);

      await instance.mint(signers.otherUser1.address, ONE);

      expect(await instance.balanceOf(signers.otherUser1.address)).to.equal(ONE);

      expect(await instance.totalSupply()).to.equal(ONE);

      await instance.mint(signers.otherUser2.address, ONE_ETHER);
      expect(await instance.balanceOf(signers.otherUser2.address)).to.equal(ONE_ETHER);
      expect(await instance.totalSupply()).to.equal(ONE_ETHER + ONE);
    });

    it('Should be fail, if called from not owner', async function () {
      await expect(instance.connect(signers.otherUser1).mint(signers.otherUser1.address, ONE_ETHER)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
  });

  describe('#convert & convertAll', async () => {
    it('should fail if user not have enough rFNX', async () => {
      await expect(instance.connect(signers.otherUser1).convert(1)).to.be.revertedWith('ERC20: burn amount exceeds balance');
    });
    it('should fail if user try convert zero amount', async () => {
      await expect(instance.connect(signers.otherUser1).convertAll()).to.be.revertedWithCustomError(instance, 'ZERO_AMOUNT');
      await expect(instance.connect(signers.otherUser1).convert(ZERO)).to.be.revertedWithCustomError(instance, 'ZERO_AMOUNT');
    });
    it('#convert should fail if contract not have enought FNX for convert', async () => {
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ZERO);

      await instance.mint(signers.otherUser1.address, ONE);
      await expect(instance.connect(signers.otherUser1).convert(ONE)).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      await fenix.transfer(instance.target, ONE);
      await expect(instance.connect(signers.otherUser1).convert(ONE)).to.be.not.reverted;
    });
    it('#convertAll should fail if contract not have enought FNX for convert', async () => {
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ZERO);

      await instance.mint(signers.otherUser1.address, ONE);
      await expect(instance.connect(signers.otherUser1).convertAll()).to.be.revertedWith('ERC20: transfer amount exceeds balance');

      await fenix.transfer(instance.target, ONE);
      await expect(instance.connect(signers.otherUser1).convert(ONE)).to.be.not.reverted;
    });

    describe('success convert', async () => {
      beforeEach(async () => {
        await fenix.transfer(instance.target, ethers.parseEther('100'));
        await instance.mint(signers.otherUser1.address, ethers.parseEther('5'));
        await instance.mint(signers.otherUser2.address, ethers.parseEther('14'));
      });
      it('__ check setup tests env', async () => {
        expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('100'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ZERO);
        expect(await instance.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('5'));
        expect(await instance.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('14'));
        expect(await instance.totalSupply()).to.be.eq(ethers.parseEther('19'));
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(ZERO);
        expect(await votingEscrow.supply()).to.be.eq(ZERO);
        expect(await votingEscrow.totalTokensMinted()).to.be.eq(ZERO);
      });

      it('should success burn rFNX from user and change totalSupply', async () => {
        let totalSupply = await instance.totalSupply();
        let balanceBefore = await instance.balanceOf(signers.otherUser1.address);

        await instance.connect(signers.otherUser1).convert(ONE_ETHER);

        expect(await instance.totalSupply()).to.be.eq(totalSupply - ONE_ETHER);
        expect(await instance.balanceOf(signers.otherUser1.address)).to.be.eq(balanceBefore - ONE_ETHER);
      });

      it('should corect create VeFNX and transfer to recipient', async () => {
        let changeAmount = (ethers.parseEther('5') * ethers.parseEther('0.6')) / ONE_ETHER;
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        let startTokenId = await votingEscrow.totalTokens();

        await instance.connect(signers.otherUser1).convertAll();

        let calcEpoch = BigInt(await time.latest()) + BigInt(182 * 86400);
        calcEpoch = (calcEpoch / BigInt(7 * 86400)) * BigInt(7 * 86400);

        expect(await votingEscrow.ownerOf(startTokenId + ONE)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        let locked1 = await votingEscrow.locked(startTokenId + ONE);
        expect(locked1.end).to.be.eq(calcEpoch);
        expect(locked1.amount).to.be.eq(changeAmount);
      });

      it('approve to ve should be clear after and before convert', async () => {
        expect(await fenix.allowance(instance.target, votingEscrow.target)).to.be.eq(ZERO);
        await instance.connect(signers.otherUser1).convert(ONE_ETHER);
        expect(await fenix.allowance(instance.target, votingEscrow.target)).to.be.eq(ZERO);
      });

      it('should success calculate and transfer 40% FNX to user wallet and 60% like veFNX', async () => {
        let balance = await fenix.balanceOf(signers.otherUser1.address);
        let stBalance = await fenix.balanceOf(instance);

        let toWallet = (ONE_ETHER * ethers.parseEther('0.4')) / ONE_ETHER;
        let toVotingEscrow = ONE_ETHER - toWallet;

        await instance.connect(signers.otherUser1).convert(ONE_ETHER);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(balance + toWallet);
        expect(await fenix.balanceOf(instance)).to.be.eq(stBalance - toWallet - toVotingEscrow);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(toVotingEscrow);
      });

      it('should success emit event', async () => {
        await expect(instance.connect(signers.otherUser1).convert(ethers.parseEther('1')))
          .to.be.emit(instance, 'Converted')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('0.4'), ethers.parseEther('0.6'), ONE);

        await expect(instance.connect(signers.otherUser2).convert(ethers.parseEther('2')))
          .to.be.emit(instance, 'Converted')
          .withArgs(signers.otherUser2.address, ethers.parseEther('2'), ethers.parseEther('0.8'), ethers.parseEther('1.2'), ONE + ONE);
      });

      it('general test', async () => {
        await expect(instance.connect(signers.otherUser1).convert(ethers.parseEther('3')))
          .to.be.emit(instance, 'Converted')
          .withArgs(signers.otherUser1.address, ethers.parseEther('3'), ethers.parseEther('1.2'), ethers.parseEther('1.8'), ONE);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1.2')); // 40% from 3
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('1.8')); // 60% from 3

        expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('97')); // 100 - 3

        expect(await instance.totalSupply()).to.be.eq(ethers.parseEther('16')); // 19 - 3

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ONE);

        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('1.8'));

        expect(await votingEscrow.totalTokensMinted()).to.be.eq(ONE);

        await expect(instance.connect(signers.otherUser2).convertAll())
          .to.be.emit(instance, 'Converted')
          .withArgs(signers.otherUser2.address, ethers.parseEther('14'), ethers.parseEther('5.6'), ethers.parseEther('8.4'), ONE + ONE);

        expect(await instance.totalSupply()).to.be.eq(ethers.parseEther('2')); // 19 - 3 - 14

        expect(await votingEscrow.totalTokensMinted()).to.be.eq(ONE + ONE);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ONE);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(ONE);

        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('10.2')); // 1.8 + 8.4

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1.2'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('5.6'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('10.2'));
        expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('83')); // 100 - 3 - 14

        await expect(instance.connect(signers.otherUser1).convertAll())
          .to.be.emit(instance, 'Converted')
          .withArgs(
            signers.otherUser1.address,
            ethers.parseEther('2'),
            ethers.parseEther('0.8'),
            ethers.parseEther('1.2'),
            ONE + ONE + ONE,
          );

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('2'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('11.4')); // 60% from 3

        expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('81')); // 100 - 3 - 14 - 2

        expect(await instance.totalSupply()).to.be.eq(ZERO); // 19 - 3 - 14 - 2

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ONE + ONE);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(ONE);

        expect(await votingEscrow.totalTokensMinted()).to.be.eq(ONE + ONE + ONE);
      });
    });
  });
});

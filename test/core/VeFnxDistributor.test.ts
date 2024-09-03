import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Fenix, VeFnxDistributorUpgradeable, VeFnxDistributorUpgradeable__factory, VotingEscrowUpgradeableV2 } from '../../typechain-types';
import { ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployTransaperntUpgradeableProxy } from '../utils/coreFixture';

describe('VeFnxDistributorUpgradeable', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;

  let factory: VeFnxDistributorUpgradeable__factory;
  let fenix: Fenix;
  let veFnxDistributor: VeFnxDistributorUpgradeable;
  let votingEscrow: VotingEscrowUpgradeableV2;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = deployed.fenix;

    factory = await ethers.getContractFactory('VeFnxDistributorUpgradeable');
    veFnxDistributor = deployed.veFnxDistributor;
    votingEscrow = deployed.votingEscrow;
  });

  describe('Deployment', async () => {
    it('Should fail if try initialize on implementation', async function () {
      let implementation = await factory.deploy(signers.deployer.address);
      await expect(implementation.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try second time initialize', async function () {
      await expect(veFnxDistributor.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try set zero address', async function () {
      let implementation = await factory.deploy(signers.deployer.address);

      const distributor = factory.attach(
        await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress()),
      ) as VeFnxDistributorUpgradeable;
      await expect(distributor.initialize(ZERO_ADDRESS, fenix.target, votingEscrow.target)).to.be.revertedWithCustomError(
        distributor,
        'AddressZero',
      );
      await expect(distributor.initialize(signers.blastGovernor.address, ZERO_ADDRESS, votingEscrow.target)).to.be.revertedWithCustomError(
        distributor,
        'AddressZero',
      );
      await expect(distributor.initialize(signers.blastGovernor.address, fenix.target, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        distributor,
        'AddressZero',
      );
    });

    it('Should correct setup parameters', async function () {
      expect(await veFnxDistributor.fenix()).to.be.eq(fenix.target);
      expect(await veFnxDistributor.votingEscrow()).to.be.eq(votingEscrow.target);
      expect(await veFnxDistributor.owner()).to.be.eq(signers.deployer.address);
    });
  });

  describe('#distributeVeFnx', async () => {
    it('Should fail if try call from not owner', async function () {
      await expect(veFnxDistributor.connect(signers.otherUser1).distributeVeFnx([signers.otherUser1.address], [1])).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });

    it('Should fail if provide incorrect array with different length', async function () {
      await expect(veFnxDistributor.distributeVeFnx([], [1])).to.be.revertedWithCustomError(veFnxDistributor, 'ArraysLengthMismatch');
      await expect(veFnxDistributor.distributeVeFnx([signers.otherUser1.address], [])).to.be.revertedWithCustomError(
        veFnxDistributor,
        'ArraysLengthMismatch',
      );
      await expect(
        veFnxDistributor.distributeVeFnx([signers.otherUser1.address, signers.otherUser2.address], [1]),
      ).to.be.revertedWithCustomError(veFnxDistributor, 'ArraysLengthMismatch');
      await expect(veFnxDistributor.distributeVeFnx([signers.otherUser1.address], [1, 2])).to.be.revertedWithCustomError(
        veFnxDistributor,
        'ArraysLengthMismatch',
      );
    });

    it('Should fail if not enought balance on contract for distribute', async function () {
      expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ZERO);

      await expect(veFnxDistributor.distributeVeFnx([signers.otherUser1.address], [1])).to.be.revertedWithCustomError(
        veFnxDistributor,
        'InsufficientBalance',
      );

      await fenix.transfer(veFnxDistributor.target, 1);

      await expect(veFnxDistributor.distributeVeFnx([signers.otherUser1.address], [1])).to.be.not.revertedWithCustomError(
        veFnxDistributor,
        'InsufficientBalance',
      );

      expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ZERO);

      await fenix.transfer(veFnxDistributor.target, ONE_ETHER);

      await expect(
        veFnxDistributor.distributeVeFnx(
          [signers.otherUser1.address, signers.otherUser2.address, signers.otherUser3.address],
          [ONE_ETHER - ONE, ONE, ONE],
        ),
      ).to.be.revertedWithCustomError(veFnxDistributor, 'InsufficientBalance');

      await expect(
        veFnxDistributor.distributeVeFnx([signers.otherUser1.address, signers.otherUser2.address], [ONE_ETHER - ONE, ONE]),
      ).to.be.not.revertedWithCustomError(veFnxDistributor, 'InsufficientBalance');
    });

    describe('Correct distribute veFnx to recipients', async () => {
      let startTokenId: bigint;
      beforeEach(async () => {
        await fenix.transfer(veFnxDistributor.target, ethers.parseEther('1000'));
        expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ethers.parseEther('1000'));
        startTokenId = await votingEscrow.lastMintedTokenId();
      });
      it('should corect emit events', async () => {
        let tx = await veFnxDistributor.distributeVeFnx(
          [signers.otherUser1.address, signers.otherUser2.address],
          [ONE_ETHER, ONE_ETHER / BigInt(2)],
        );
        await expect(tx)
          .to.be.emit(veFnxDistributor, 'AridropVeFnx')
          .withArgs(signers.otherUser1.address, 1, 182 * 86400, ONE_ETHER);
        await expect(tx)
          .to.be.emit(veFnxDistributor, 'AridropVeFnx')
          .withArgs(signers.otherUser2.address, 2, 182 * 86400, ONE_ETHER / BigInt(2));
      });

      it('should corect change balacnes', async () => {
        let startVotingEscrowBalance = await fenix.balanceOf(votingEscrow.target);

        await veFnxDistributor.distributeVeFnx(
          [signers.otherUser1.address, signers.otherUser2.address],
          [ONE_ETHER, ONE_ETHER / BigInt(2)],
        );

        expect(await fenix.balanceOf(veFnxDistributor.target)).to.be.eq(ethers.parseEther('998.5'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(startVotingEscrowBalance + ethers.parseEther('1.5'));
      });
      it('should clear approve after distribution', async () => {
        expect(await fenix.allowance(veFnxDistributor.target, votingEscrow.target)).to.be.eq(ZERO);
        await veFnxDistributor.distributeVeFnx(
          [signers.otherUser1.address, signers.otherUser2.address],
          [ONE_ETHER, ONE_ETHER / BigInt(2)],
        );
        expect(await fenix.allowance(veFnxDistributor.target, votingEscrow.target)).to.be.eq(ZERO);
      });
      it('should corect create VeFNX and transfer to recipients', async () => {
        await fenix.transfer(veFnxDistributor.target, ethers.parseEther('1000'));

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(ZERO);

        let tx = await veFnxDistributor.distributeVeFnx(
          [signers.otherUser1.address, signers.otherUser2.address],
          [ONE_ETHER, ONE_ETHER / BigInt(2)],
        );

        let calcEpoch = BigInt(await time.latest()) + BigInt(182 * 86400);
        calcEpoch = (calcEpoch / BigInt(7 * 86400)) * BigInt(7 * 86400);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + ONE, ONE_ETHER, calcEpoch, 1, anyValue);
        await expect(tx)
          .to.be.emit(votingEscrow, 'Deposit')
          .withArgs(veFnxDistributor.target, startTokenId + ONE + ONE, ONE_ETHER / BigInt(2), calcEpoch, 1, anyValue);

        expect(await votingEscrow.ownerOf(startTokenId + ONE)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(startTokenId + ONE + ONE)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('1.5'));
        expect(await votingEscrow.votingPowerTotalSupply()).to.be.closeTo(ethers.parseEther('1.5'), ethers.parseEther('0.1'));

        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        let locked1 = (await votingEscrow.nftStates(startTokenId + ONE)).locked;
        expect(locked1.end).to.be.eq(calcEpoch);
        expect(locked1.amount).to.be.eq(ONE_ETHER);

        let locked2 = (await votingEscrow.nftStates(startTokenId + ONE + ONE)).locked;
        expect(locked2.end).to.be.eq(calcEpoch);
        expect(locked2.amount).to.be.eq(ethers.parseEther('0.5'));
      });
    });
  });
});

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { setCode, time, mine, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Fenix, VeFnxSplitMerklAidropUpgradeable, VotingEscrowUpgradeableV2 } from '../../typechain-types/index';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { deployERC20MockToken, SignersList } from '../utils/coreFixture';
import { deploy } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { eq } from '../../lib/fenix-dex-v3/docs/doc_templates/public/helpers';

function getProof(address: string, tree: any): string[] {
  let proof: string[];
  for (const [i, v] of tree.entries()) {
    if (v[0] === address) {
      proof = tree.getProof(i);
    }
  }
  return proof!;
}

describe('VeFnxSplitMerklAidropUpgradeable Contract', function () {
  const TO_VE_FNX_PERCENTRAGE = ethers.parseEther('0.4');

  let implementation: VeFnxSplitMerklAidropUpgradeable;
  let proxy: VeFnxSplitMerklAidropUpgradeable;
  let fenix: Fenix;
  let votingEscrow: VotingEscrowUpgradeableV2;
  let signers: SignersList;

  beforeEach(async function () {
    let deployed = await loadFixture(completeFixture);
    votingEscrow = deployed.votingEscrow;
    signers = deployed.signers;
    fenix = deployed.fenix;

    implementation = await ethers.deployContract('VeFnxSplitMerklAidropUpgradeable', [signers.blastGovernor.address]);
    proxy = await ethers.getContractAt(
      'VeFnxSplitMerklAidropUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
      ).target,
    );

    await proxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, TO_VE_FNX_PERCENTRAGE);
  });

  describe('Deployment', function () {
    it('fail if try initialize on implementation', async () => {
      await expect(
        implementation.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, TO_VE_FNX_PERCENTRAGE),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fail if try initialize second time', async () => {
      await expect(
        proxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, TO_VE_FNX_PERCENTRAGE),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fail if try set zero address', async () => {
      let uninitializedProxy = await ethers.getContractAt(
        'VeFnxSplitMerklAidropUpgradeable',
        (
          await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
        ).target,
      );
      await expect(
        uninitializedProxy.initialize(ZERO_ADDRESS, fenix.target, votingEscrow.target, TO_VE_FNX_PERCENTRAGE),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, ZERO_ADDRESS, votingEscrow.target, TO_VE_FNX_PERCENTRAGE),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');

      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, ZERO_ADDRESS, TO_VE_FNX_PERCENTRAGE),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
    });
    it('fail if try set ve fnx percentage more then precision', async () => {
      let uninitializedProxy = await ethers.getContractAt(
        'VeFnxSplitMerklAidropUpgradeable',
        (
          await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
        ).target,
      );
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, ethers.parseEther('1') + BigInt(1)),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'IncorrectToVeFnxPercentage');
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, ethers.parseEther('1')),
      ).to.be.not.revertedWithCustomError(uninitializedProxy, 'IncorrectToVeFnxPercentage');
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, 0),
      ).to.be.not.revertedWithCustomError(uninitializedProxy, 'IncorrectToVeFnxPercentage');
    });
    describe('success deployment', async () => {
      it('correct setup params', async () => {
        expect(await proxy.token()).to.be.eq(fenix.target);
        expect(await proxy.votingEscrow()).to.be.eq(votingEscrow.target);
        expect(await proxy.toVeFnxPercentage()).to.be.eq(TO_VE_FNX_PERCENTRAGE);
      });

      it('owner should be deployer', async () => {
        expect(await proxy.owner()).to.be.eq(signers.deployer.address);
      });

      it('paused state by default', async () => {
        expect(await proxy.paused()).to.be.true;
      });

      it('not setuped merkl root', async () => {
        expect(await proxy.merklRoot()).to.be.eq(ethers.ZeroHash);
      });
    });
  });

  describe('Access restricted methods', async () => {
    describe('#setToVeFnxPercentage', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(signers.otherUser1).setToVeFnxPercentage(1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });

      it('should fail if try setup during not paused state', async () => {
        await proxy.unpause();
        expect(await proxy.paused()).to.be.false;
        await expect(proxy.setToVeFnxPercentage(1)).to.be.revertedWith(ERRORS.Pausable.NotPaused);
      });

      it('should fail if try setup more then 100%', async () => {
        await expect(proxy.setToVeFnxPercentage(ethers.parseEther('1') + BigInt(1))).to.be.revertedWithCustomError(
          proxy,
          'IncorrectToVeFnxPercentage',
        );
      });

      it('success setup with emit event', async () => {
        expect(await proxy.paused()).to.be.true;
        expect(await proxy.toVeFnxPercentage()).to.be.eq(TO_VE_FNX_PERCENTRAGE);

        await expect(proxy.setToVeFnxPercentage(0)).to.be.emit(proxy, 'SetToVeFnxPercentage').withArgs(0);
        expect(await proxy.toVeFnxPercentage()).to.be.eq(0);

        await expect(proxy.setToVeFnxPercentage(ethers.parseEther('1')))
          .to.be.emit(proxy, 'SetToVeFnxPercentage')
          .withArgs(ethers.parseEther('1'));
        expect(await proxy.toVeFnxPercentage()).to.be.eq(ethers.parseEther('1'));

        await expect(proxy.setToVeFnxPercentage(ethers.parseEther('0.005')))
          .to.be.emit(proxy, 'SetToVeFnxPercentage')
          .withArgs(ethers.parseEther('0.005'));
        expect(await proxy.toVeFnxPercentage()).to.be.eq(ethers.parseEther('0.005'));
      });
    });

    describe('#setMerklRoot', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(signers.otherUser1).setMerklRoot(ethers.ZeroHash)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('fail if try setuped during unpaused state', async () => {
        await proxy.unpause();
        expect(await proxy.paused()).to.be.false;
        await expect(proxy.setMerklRoot(ethers.ZeroHash)).to.be.revertedWith(ERRORS.Pausable.NotPaused);
      });
      it('should correct setup new merkl root and emit event', async () => {
        expect(await proxy.merklRoot()).to.be.eq(ethers.ZeroHash);
        const tree = StandardMerkleTree.of([[signers.otherUser1.address, ethers.parseEther('1')]], ['address', 'uint256']);
        await expect(proxy.setMerklRoot(tree.root)).to.be.emit(proxy, 'SetMerklRoot').withArgs(tree.root);
        expect(await proxy.merklRoot()).to.be.not.eq(ethers.ZeroHash);
        expect(await proxy.merklRoot()).to.be.eq(tree.root);
      });
    });

    describe('#pause', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(signers.otherUser1).pause()).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('fail if try pause during paused state', async () => {
        expect(await proxy.paused()).to.be.true;
        await expect(proxy.pause()).to.be.revertedWith(ERRORS.Pausable.Paused);
      });
      it('should correct paused', async () => {
        await proxy.unpause();
        expect(await proxy.paused()).to.be.false;
        await proxy.pause();
        expect(await proxy.paused()).to.be.true;
      });
    });

    describe('#unpause', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(signers.otherUser1).unpause()).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('fail if try pause during unpause state', async () => {
        await proxy.unpause();
        expect(await proxy.paused()).to.be.false;
        await expect(proxy.unpause()).to.be.revertedWith(ERRORS.Pausable.NotPaused);
      });
      it('should correct unpaused', async () => {
        expect(await proxy.paused()).to.be.true;
        await proxy.unpause();
        expect(await proxy.paused()).to.be.false;
      });
    });
    describe('#setIsAllowedClaimOperator', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(signers.otherUser1).setIsAllowedClaimOperator(signers.otherUser1.address, true)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });

      it('success setup allowed operator with emit event', async () => {
        expect(await proxy.isAllowedClaimOperator(signers.otherUser1.address)).to.be.false;
        expect(await proxy.isAllowedClaimOperator(signers.otherUser2.address)).to.be.false;

        await expect(proxy.setIsAllowedClaimOperator(signers.otherUser1.address, true))
          .to.be.emit(proxy, 'SetIsAllowedClaimOperator')
          .withArgs(signers.otherUser1.address, true);

        expect(await proxy.isAllowedClaimOperator(signers.otherUser1.address)).to.be.true;
        expect(await proxy.isAllowedClaimOperator(signers.otherUser2.address)).to.be.false;

        await expect(proxy.setIsAllowedClaimOperator(signers.otherUser2.address, true))
          .to.be.emit(proxy, 'SetIsAllowedClaimOperator')
          .withArgs(signers.otherUser2.address, true);

        expect(await proxy.isAllowedClaimOperator(signers.otherUser1.address)).to.be.true;
        expect(await proxy.isAllowedClaimOperator(signers.otherUser2.address)).to.be.true;

        await expect(proxy.setIsAllowedClaimOperator(signers.otherUser1.address, false))
          .to.be.emit(proxy, 'SetIsAllowedClaimOperator')
          .withArgs(signers.otherUser1.address, false);

        expect(await proxy.isAllowedClaimOperator(signers.otherUser1.address)).to.be.false;
        expect(await proxy.isAllowedClaimOperator(signers.otherUser2.address)).to.be.true;
      });
    });
  });

  describe('#isValidProof', async () => {
    let tree: any;
    let user: string;

    beforeEach(async () => {
      user = signers.otherUser1.address;
      tree = StandardMerkleTree.of(
        [
          [user, ethers.parseEther('1')],
          [signers.otherUser2.address, ethers.parseEther('0.5')],
        ],
        ['address', 'uint256'],
      );
      await proxy.setMerklRoot(tree.root);
    });

    describe('return false if', async () => {
      it('not provide proof', async () => {
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), [])).to.be.false;
      });
      it('merklRoot is zero hash', async () => {
        await proxy.setMerklRoot(ethers.ZeroHash);
        expect(await proxy.merklRoot()).to.be.eq(ethers.ZeroHash);
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), getProof(user, tree))).to.be.false;
      });
      it('provide valid proof but invalid amount', async () => {
        expect(await proxy.isValidProof(user, ethers.parseEther('1') - BigInt(1), getProof(user, tree))).to.be.false;
        expect(await proxy.isValidProof(user, ethers.parseEther('1') + BigInt(1), getProof(user, tree))).to.be.false;
      });

      it('provide invalid proof with valid amount ', async () => {
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), getProof(signers.otherUser2.address, tree))).to.be.false;
      });

      it('provide invalid address with proof for other ', async () => {
        expect(await proxy.isValidProof(user, ethers.parseEther('0.5'), getProof(signers.otherUser2.address, tree))).to.be.false;
      });

      it('after change merkl root ', async () => {
        let newTree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('1.1')],
            [signers.otherUser2.address, ethers.parseEther('0.5')],
          ],
          ['address', 'uint256'],
        );
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), getProof(user, tree))).to.be.true;
        await proxy.setMerklRoot(newTree.root);
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), getProof(user, tree))).to.be.false;
      });
    });
    describe('return true if ', async () => {
      it('provode valid params', async () => {
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), getProof(user, tree))).to.be.true;
        expect(await proxy.isValidProof(signers.otherUser2.address, ethers.parseEther('0.5'), getProof(signers.otherUser2.address, tree)))
          .to.be.true;
      });
      it('after change merkl root and user provide valid params', async () => {
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), getProof(user, tree))).to.be.true;

        let newTree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('1.1')],
            [signers.otherUser2.address, ethers.parseEther('0.5')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(newTree.root);
        expect(await proxy.isValidProof(user, ethers.parseEther('1.1'), getProof(user, tree))).to.be.true;
        expect(await proxy.isValidProof(user, ethers.parseEther('1'), getProof(user, tree))).to.be.false;
      });
    });
  });

  describe('RecoverToken', async () => {
    it('should fail if caller not contract owner', async function () {
      await expect(proxy.connect(signers.otherUser1).recoverToken(1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });

    it('should fail if contract have insuffation balance', async function () {
      await expect(proxy.recoverToken(1)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });

    it('success recover token from contract balance and transfer to owner', async () => {
      await fenix.transfer(proxy.target, ONE);

      await proxy.transferOwnership(signers.otherUser1.address);
      await proxy.connect(signers.otherUser1).acceptOwnership();

      let startContractBalance = await fenix.balanceOf(proxy.target);
      let startBalance = await fenix.balanceOf(signers.otherUser1.address);
      await expect(proxy.connect(signers.otherUser1).recoverToken(ONE))
        .to.be.emit(proxy, 'Recover')
        .withArgs(signers.otherUser1.address, ONE);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(startBalance + ONE);

      expect(await fenix.balanceOf(proxy.target)).to.be.eq(startContractBalance - ONE);
      expect(await fenix.balanceOf(proxy.target)).to.be.eq(ZERO);
    });

    it('success recover 99% tokens from contract balance and transfer to owner', async () => {
      await fenix.transfer(proxy.target, ONE_ETHER);

      let transferAmount = ethers.parseEther('0.99');

      let startContractBalance = await fenix.balanceOf(proxy.target);
      let startBalance = await fenix.balanceOf(signers.deployer.address);

      await expect(proxy.recoverToken(transferAmount)).to.be.emit(proxy, 'Recover').withArgs(signers.deployer.address, transferAmount);

      expect(await fenix.balanceOf(signers.deployer.address)).to.be.eq(startBalance + transferAmount);

      expect(await fenix.balanceOf(proxy.target)).to.be.eq(startContractBalance - transferAmount);
      expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('0.01'));
    });
  });

  describe('Claim flow', async () => {
    let tree: any;
    let user: string;

    beforeEach(async () => {
      user = signers.otherUser1.address;
      tree = StandardMerkleTree.of(
        [
          [user, ethers.parseEther('100')],
          [signers.otherUser2.address, ethers.parseEther('50.5')],
          [signers.otherUser3.address, ethers.parseEther('200.1')],
        ],
        ['address', 'uint256'],
      );
      await proxy.setMerklRoot(tree.root);
      await proxy.unpause();
      await fenix.transfer(proxy.target, ethers.parseEther('200'));
      expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200'));
      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
    });

    describe('fail if', async () => {
      it("contracts have'nt enough tokens for user claim", async () => {
        await expect(
          proxy.connect(signers.otherUser3).claim(ethers.parseEther('200.1'), getProof(signers.otherUser3.address, tree)),
        ).to.be.revertedWith(ERRORS.ERC20.InsufficientBalance);
      });
      it('user provide invalid proof', async () => {
        await expect(
          proxy.connect(signers.otherUser1).claim(ethers.parseEther('100'), getProof(signers.otherUser2.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'InvalidProof');
      });
      it('during paused state', async () => {
        await proxy.pause();
        await expect(
          proxy.connect(signers.otherUser1).claim(ethers.parseEther('100'), getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWith(ERRORS.Pausable.Paused);
      });
      it('claim amount is zero (after success claim)', async () => {
        await proxy.connect(signers.otherUser1).claim(ethers.parseEther('100'), getProof(signers.otherUser1.address, tree));
        await expect(
          proxy.connect(signers.otherUser1).claim(ethers.parseEther('100'), getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
      });
    });

    describe('success claim', async () => {
      beforeEach(async () => {
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(0);
        expect(await votingEscrow.supply()).to.be.eq(0);
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(0);
      });
      it('test', async () => {
        let tx = await proxy.connect(signers.otherUser1).claim(ethers.parseEther('100'), getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('100'), ethers.parseEther('60'), ethers.parseEther('40'), 1);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('60'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('40'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('60'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('40'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('40'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        await expect(
          proxy.connect(signers.otherUser1).claim(ethers.parseEther('100'), getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        tx = await proxy.connect(signers.otherUser2).claim(ethers.parseEther('50.5'), getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('50.5'), ethers.parseEther('30.3'), ethers.parseEther('20.2'), 2);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser2.address, ethers.parseEther('30.3'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('20.2'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('60'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.3'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('49.5'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('50.5'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('60.2'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('60.2'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        await expect(
          proxy.connect(signers.otherUser1).claim(ethers.parseEther('100'), getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
        await expect(
          proxy.connect(signers.otherUser2).claim(ethers.parseEther('50.5'), getProof(signers.otherUser2.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('101')],
            [signers.otherUser2.address, ethers.parseEther('51')],
            [signers.otherUser3.address, ethers.parseEther('200.1')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        tx = await proxy.connect(signers.otherUser1).claim(ethers.parseEther('101'), getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('0.6'), ethers.parseEther('0.4'), 3);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('0.6'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('0.4'));

        tx = await proxy.connect(signers.otherUser2).claim(ethers.parseEther('51'), getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('0.5'), ethers.parseEther('0.3'), ethers.parseEther('0.2'), 4);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser2.address, ethers.parseEther('0.3'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('0.2'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('60.6'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.6'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('48'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('101'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(4)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(2);

        await proxy.pause();

        await proxy.setToVeFnxPercentage(ethers.parseEther('0'));
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('102')],
            [signers.otherUser2.address, ethers.parseEther('51')],
            [signers.otherUser3.address, ethers.parseEther('10')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        tx = await proxy.connect(signers.otherUser1).claim(ethers.parseEther('102'), getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('1'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('1'));

        tx = await proxy.connect(signers.otherUser3).claim(ethers.parseEther('10'), getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), ethers.parseEther('10'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser3.address, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('61.6'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.6'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('37'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('102'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(4)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(2);

        await proxy.pause();

        await proxy.setToVeFnxPercentage(ethers.parseEther('1'));
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('102')],
            [signers.otherUser2.address, ethers.parseEther('51')],
            [signers.otherUser3.address, ethers.parseEther('20')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        tx = await proxy.connect(signers.otherUser3).claim(ethers.parseEther('20'), getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), 0, ethers.parseEther('10'), 5);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('61.6'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.6'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('27'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('102'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('20'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('70.8'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('70.8'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(5);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(4)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(5)).to.be.eq(signers.otherUser3.address);
        expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);
      });
    });
  });

  describe('Claim For flow', async () => {
    let tree: any;
    let user: string;
    let operator: HardhatEthersSigner;

    beforeEach(async () => {
      user = signers.otherUser1.address;
      operator = signers.otherUser5;

      tree = StandardMerkleTree.of(
        [
          [user, ethers.parseEther('100')],
          [signers.otherUser2.address, ethers.parseEther('50.5')],
          [signers.otherUser3.address, ethers.parseEther('200.1')],
        ],
        ['address', 'uint256'],
      );
      await proxy.setMerklRoot(tree.root);
      await proxy.unpause();
      await fenix.transfer(proxy.target, ethers.parseEther('200'));
      await proxy.setIsAllowedClaimOperator(operator.address, true);

      expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200'));
      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
    });

    it('fail if call from not allowed operator', async () => {
      await expect(
        proxy.connect(signers.otherUser3).claimFor(user, ethers.parseEther('100'), getProof(user, tree)),
      ).to.be.revertedWithCustomError(proxy, 'NotAllowedClaimOperator');
    });

    it('success call for the himself', async () => {
      await expect(
        proxy
          .connect(signers.otherUser1)
          .claimFor(signers.otherUser1, ethers.parseEther('100'), getProof(signers.otherUser1.address, tree)),
      ).to.be.not.reverted;
    });

    describe('success claim', async () => {
      beforeEach(async () => {
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(0);
        expect(await votingEscrow.supply()).to.be.eq(0);
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(0);
      });
      it('test', async () => {
        let tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser1.address, ethers.parseEther('100'), getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('100'), ethers.parseEther('60'), ethers.parseEther('40'), 1);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('60'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('40'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('60'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('40'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('40'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        await expect(
          proxy
            .connect(operator)
            .claimFor(signers.otherUser1.address, ethers.parseEther('100'), getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser2.address, ethers.parseEther('50.5'), getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('50.5'), ethers.parseEther('30.3'), ethers.parseEther('20.2'), 2);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser2.address, ethers.parseEther('30.3'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('20.2'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('60'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.3'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('49.5'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('50.5'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('60.2'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('60.2'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        await expect(
          proxy
            .connect(operator)
            .claimFor(signers.otherUser1.address, ethers.parseEther('100'), getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
        await expect(
          proxy
            .connect(operator)
            .claimFor(signers.otherUser2.address, ethers.parseEther('50.5'), getProof(signers.otherUser2.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('101')],
            [signers.otherUser2.address, ethers.parseEther('51')],
            [signers.otherUser3.address, ethers.parseEther('200.1')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser1.address, ethers.parseEther('101'), getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('0.6'), ethers.parseEther('0.4'), 3);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('0.6'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('0.4'));

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser2.address, ethers.parseEther('51'), getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('0.5'), ethers.parseEther('0.3'), ethers.parseEther('0.2'), 4);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser2.address, ethers.parseEther('0.3'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('0.2'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('60.6'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.6'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('48'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('101'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(4)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(2);

        await proxy.pause();

        await proxy.setToVeFnxPercentage(ethers.parseEther('0'));
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('102')],
            [signers.otherUser2.address, ethers.parseEther('51')],
            [signers.otherUser3.address, ethers.parseEther('10')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser1.address, ethers.parseEther('102'), getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('1'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('1'));

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser3.address, ethers.parseEther('10'), getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), ethers.parseEther('10'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser3.address, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('61.6'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.6'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('37'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('102'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('60.8'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(4);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(4)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(2);

        await proxy.pause();

        await proxy.setToVeFnxPercentage(ethers.parseEther('1'));
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('102')],
            [signers.otherUser2.address, ethers.parseEther('51')],
            [signers.otherUser3.address, ethers.parseEther('20')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser3.address, ethers.parseEther('20'), getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), 0, ethers.parseEther('10'), 5);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('61.6'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('30.6'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('27'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('102'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('20'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('70.8'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('70.8'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(5);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.ownerOf(4)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(2);
        expect(await votingEscrow.ownerOf(5)).to.be.eq(signers.otherUser3.address);
        expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);
      });
    });
  });
});

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { setCode, time, mine } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastMock__factory, ERC20Mock, Fenix, FenixRaiseUpgradeable } from '../../typechain-types/index';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { deployERC20MockToken } from '../utils/coreFixture';
import { deploy } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

function getProof(address: string, tree: any): string[] {
  let proof: string[];
  for (const [i, v] of tree.entries()) {
    if (v[0] === address) {
      proof = tree.getProof(i);
    }
  }
  return proof!;
}

describe('FenixRaiseUpgradeable Contract', function () {
  let implementation: FenixRaiseUpgradeable;
  let proxy: FenixRaiseUpgradeable;
  let blastGovernor: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;
  let otherUser2: HardhatEthersSigner;

  let deployer: HardhatEthersSigner;
  let proxyAdmin: HardhatEthersSigner;
  let depositsReciever: HardhatEthersSigner;
  let usdb: ERC20Mock;

  beforeEach(async function () {
    await setCode(BLAST_PREDEPLOYED_ADDRESS, BlastMock__factory.bytecode);

    [deployer, proxyAdmin, depositsReciever, blastGovernor, otherUser, otherUser2] = await ethers.getSigners();

    implementation = await ethers.deployContract('FenixRaiseUpgradeable');
    proxy = await ethers.getContractAt(
      'FenixRaiseUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
      ).target,
    );
    usdb = await deployERC20MockToken(deployer, 'USDB', 'USDB', 18);

    await proxy.initialize(blastGovernor.address, usdb.target, depositsReciever.address);
  });

  describe('Deployment', function () {
    it('fail if try initialize on implementation', async () => {
      await expect(implementation.initialize(blastGovernor.address, usdb.target, depositsReciever.address)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('fail if try initialize second time', async () => {
      await expect(proxy.initialize(blastGovernor.address, usdb.target, depositsReciever.address)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('fail if try set zero address', async () => {
      let uninitializedProxy = await ethers.getContractAt(
        'FenixRaiseUpgradeable',
        (
          await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
        ).target,
      );
      await expect(uninitializedProxy.initialize(ZERO_ADDRESS, usdb.target, depositsReciever.address)).to.be.revertedWithCustomError(
        uninitializedProxy,
        'AddressZero',
      );
      await expect(
        uninitializedProxy.initialize(blastGovernor.address, ZERO_ADDRESS, depositsReciever.address),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
      await expect(uninitializedProxy.initialize(blastGovernor.address, usdb.target, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        uninitializedProxy,
        'AddressZero',
      );
    });

    it('correct initialize parameters', async () => {
      expect(await proxy.token()).to.be.eq(usdb.target);
      expect(await proxy.depositsReciever()).to.be.eq(depositsReciever.address);
      expect(await proxy.owner()).to.be.eq(deployer.address);
    });

    it('initial setup', async () => {
      expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(0);
      expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(0);
      expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(0);
      expect(await proxy.whitelistPhaseUserCap()).to.be.eq(0);
      expect(await proxy.publicPhaseUserCap()).to.be.eq(0);
      expect(await proxy.totalDepositCap()).to.be.eq(0);
      expect(await proxy.totalDeposited()).to.be.eq(0);
      expect(await proxy.whitelistMerklRoot()).to.be.eq(ethers.ZeroHash);
    });

    it('#isWhitelistPhase should return false', async () => {
      expect(await proxy.isWhitelistPhase()).to.be.false;
    });

    it('#isPublicPhase should return false', async () => {
      expect(await proxy.isPublicPhase()).to.be.false;
    });
  });

  describe('Whitelist', async () => {
    it('should return false if merkl root zero', async () => {
      expect(await proxy.isWhitelisted(otherUser.address, 0, [ethers.ZeroHash])).to.be.false;
    });
    it('should return false if proofs empty', async () => {
      const tree = StandardMerkleTree.of([[otherUser.address, ethers.parseEther('1')]], ['address', 'uint256']);
      await proxy.setWhitelistRoot(tree.root);
      expect(await proxy.isWhitelisted(otherUser.address, 0, [])).to.be.false;
    });
    it('should return false if merkl setup. but user not include in tree', async () => {
      const tree = StandardMerkleTree.of(
        [
          [otherUser.address, ethers.parseEther('1')],
          [otherUser2.address, ethers.parseEther('0.5')],
        ],
        ['address', 'uint256'],
      );
      await proxy.setWhitelistRoot(tree.root);

      let proof = getProof(otherUser.address, tree);

      expect(await proxy.isWhitelisted(deployer.address, ethers.parseEther('1'), proof!)).to.be.false;
      expect(await proxy.isWhitelisted(otherUser.address, ethers.parseEther('1'), proof!)).to.be.true;
    });
    it('should should return true before, and false after change root', async () => {
      let tree = StandardMerkleTree.of(
        [
          [otherUser.address, ethers.parseEther('1')],
          [otherUser2.address, ethers.parseEther('0.5')],
        ],
        ['address', 'uint256'],
      );
      await proxy.setWhitelistRoot(tree.root);

      let proof = getProof(otherUser.address, tree);
      expect(await proxy.isWhitelisted(otherUser.address, ethers.parseEther('1'), proof!)).to.be.true;

      tree = StandardMerkleTree.of(
        [
          [otherUser.address, ethers.parseEther('0.9')],
          [otherUser2.address, ethers.parseEther('0.5')],
        ],
        ['address', 'uint256'],
      );
      await proxy.setWhitelistRoot(tree.root);
      proof = getProof(otherUser.address, tree);
      expect(await proxy.isWhitelisted(otherUser.address, ethers.parseEther('1'), proof!)).to.be.false;
      expect(await proxy.isWhitelisted(otherUser.address, ethers.parseEther('0.9'), proof!)).to.be.true;

      tree = StandardMerkleTree.of([[otherUser2.address, ethers.parseEther('0.5')]], ['address', 'uint256']);
      await proxy.setWhitelistRoot(tree.root);
      expect(await proxy.isWhitelisted(otherUser.address, ethers.parseEther('0.9'), proof!)).to.be.false;
    });
  });
  describe('Phases', async () => {
    it('should correct change phase base on timestamp', async () => {
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.false;
      const timeNow = await time.latest();
      await proxy.setTimestamps(timeNow + 100, timeNow + 200, timeNow + 300);
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.false;
      await time.increaseTo(timeNow + 101);
      expect(await proxy.isWhitelistPhase()).to.be.true;
      expect(await proxy.isPublicPhase()).to.be.false;
      await time.increaseTo(timeNow + 201);
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.true;
      await time.increaseTo(timeNow + 301);
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.false;
    });
  });
  describe('Access restricted methods', async () => {
    describe('#withdrawDeposits', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(otherUser).whithdrawDeposits()).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should fail if public phase not closed', async () => {
        await expect(proxy.whithdrawDeposits()).to.be.revertedWithCustomError(proxy, 'RaiseNotFinished');
      });
      it('should fail if try withdraw zero balance', async () => {
        await proxy.setTimestamps(1, 2, 3);
        await expect(proxy.whithdrawDeposits()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
      });
      it('should success withdraw and transfer to deposits reciever', async () => {
        await proxy.setTimestamps(1, 2, 3);

        await usdb.mint(proxy.target, ethers.parseEther('123.123'));
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('123.123'));
        expect(await usdb.balanceOf(depositsReciever.address)).to.be.eq(0);

        let tx = await proxy.whithdrawDeposits();
        await expect(tx)
          .to.be.emit(proxy, 'WithdrawDeposits')
          .withArgs(deployer.address, depositsReciever.address, ethers.parseEther('123.123'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(proxy.target, depositsReciever.address, ethers.parseEther('123.123'));
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(0);
        expect(await usdb.balanceOf(depositsReciever.address)).to.be.eq(ethers.parseEther('123.123'));
      });
    });
    describe('#setDepositCaps', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(otherUser).setDepositCaps(0, 0, 0)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should correct setup and emit event', async () => {
        expect(await proxy.whitelistPhaseUserCap()).to.be.eq(0);
        expect(await proxy.publicPhaseUserCap()).to.be.eq(0);
        expect(await proxy.totalDepositCap()).to.be.eq(0);
        await expect(proxy.setDepositCaps(1, 2, 3)).to.be.emit(proxy, 'UpdateDepositCaps').withArgs(1, 2, 3);
        expect(await proxy.whitelistPhaseUserCap()).to.be.eq(2);
        expect(await proxy.publicPhaseUserCap()).to.be.eq(3);
        expect(await proxy.totalDepositCap()).to.be.eq(1);
        await expect(proxy.setDepositCaps(ethers.parseEther('567.5'), ethers.parseEther('11.5'), ethers.parseEther('50')))
          .to.be.emit(proxy, 'UpdateDepositCaps')
          .withArgs(ethers.parseEther('567.5'), ethers.parseEther('11.5'), ethers.parseEther('50'));
        expect(await proxy.totalDepositCap()).to.be.eq(ethers.parseEther('567.5'));
        expect(await proxy.whitelistPhaseUserCap()).to.be.eq(ethers.parseEther('11.5'));
        expect(await proxy.publicPhaseUserCap()).to.be.eq(ethers.parseEther('50'));
        await expect(proxy.setDepositCaps(0, 0, 0)).to.be.emit(proxy, 'UpdateDepositCaps').withArgs(0, 0, 0);
      });
    });

    describe('#setWhitelistRoot', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(otherUser).setWhitelistRoot(ethers.ZeroHash)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should correct setup new merkl root and emit event', async () => {
        expect(await proxy.whitelistMerklRoot()).to.be.eq(ethers.ZeroHash);
        const tree = StandardMerkleTree.of([[otherUser.address, ethers.parseEther('1')]], ['address', 'uint256']);
        await expect(proxy.setWhitelistRoot(tree.root)).to.be.emit(proxy, 'UpdateWhitelistRoot').withArgs(tree.root);
        expect(await proxy.whitelistMerklRoot()).to.be.not.eq(ethers.ZeroHash);
        expect(await proxy.whitelistMerklRoot()).to.be.eq(tree.root);
      });
    });

    describe('#setTimestamps', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(otherUser).setTimestamps(0, 0, 0)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('fail if try setup incorrect timestamps', async () => {
        await expect(proxy.setTimestamps(0, 0, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 0, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(0, 1, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(0, 0, 1)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 1, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 1, 1)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 2, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 0, 2)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(2, 0, 2)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(10, 20, 20)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 2, 3)).to.be.not.reverted;
        await expect(proxy.setTimestamps(10, 20, 30)).to.be.not.reverted;
      });
      it('should correct setup new timestamps and emit event', async () => {
        expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(0);
        expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(0);
        expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(0);
        await expect(proxy.setTimestamps(0, 1, 2)).to.be.emit(proxy, 'UpdateTimestamps').withArgs(0, 1, 2);
        expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(0);
        expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(1);
        expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(2);
        await expect(proxy.setTimestamps(100, 250, 421)).to.be.emit(proxy, 'UpdateTimestamps').withArgs(100, 250, 421);
        expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(100);
        expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(250);
        expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(421);
      });
    });
  });
  describe('Deposit flow', async () => {
    it('before whitelist phase and after public should fail with DepositClodes ', async () => {
      const timeNow = await time.latest();
      await proxy.setTimestamps(timeNow + 100, timeNow + 200, timeNow + 300);
      await expect(proxy.connect(otherUser).deposit(100, 0, [])).to.be.revertedWithCustomError(proxy, 'DepositClosed');
      await time.increaseTo(timeNow + 301);
      await expect(proxy.connect(otherUser).deposit(100, 0, [])).to.be.revertedWithCustomError(proxy, 'DepositClosed');
    });

    describe('Whitelisted phase', async () => {
      let tree: any;

      beforeEach(async () => {
        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(otherUser2).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(blastGovernor).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, ethers.parseEther('10'));
        await usdb.mint(otherUser2.address, ethers.parseEther('10'));
        await usdb.mint(blastGovernor.address, ethers.parseEther('10'));
        const timeNow = await time.latest();
        await proxy.setTimestamps(timeNow + 100, timeNow * 2, timeNow * 3);
        await proxy.setDepositCaps(ethers.parseEther('1.5'), ethers.parseEther('0.5'), ethers.parseEther('0.25'));
        await time.increaseTo(timeNow + 101);
        tree = StandardMerkleTree.of(
          [
            [otherUser.address, ethers.parseEther('1')],
            [otherUser2.address, ethers.parseEther('0.5')],
            [blastGovernor.address, 0],
          ],
          ['address', 'uint256'],
        );
        await proxy.setWhitelistRoot(tree.root);
      });
      it('should fail if whitelist phase and user not provide proof or incorrect proof', async () => {
        let proof = getProof(otherUser.address, tree);
        await expect(
          proxy.connect(otherUser).deposit(ethers.parseEther('1'), ethers.parseEther('0.9'), proof),
        ).to.be.revertedWithCustomError(proxy, 'OnlyForWhitelistedUser');
        await expect(proxy.connect(deployer).deposit(ethers.parseEther('1'), ethers.parseEther('1'), proof)).to.be.revertedWithCustomError(
          proxy,
          'OnlyForWhitelistedUser',
        );
      });

      it('should fail if user try deposit more then total deposit cap', async () => {
        let proof = getProof(otherUser.address, tree);
        await proxy.connect(otherUser).deposit(ethers.parseEther('1'), ethers.parseEther('1'), proof);

        proof = getProof(otherUser2.address, tree);
        await proxy.connect(otherUser2).deposit(ethers.parseEther('0.5'), ethers.parseEther('0.5'), proof);

        proof = getProof(blastGovernor.address, tree);

        await expect(proxy.connect(blastGovernor).deposit(1, 0, proof)).to.be.revertedWithCustomError(proxy, 'TotalDepositCap');
      });

      it('should fail if user try deposit more then own cap', async () => {
        let proof = getProof(otherUser.address, tree);
        await expect(
          proxy.connect(otherUser).deposit(ethers.parseEther('1.1'), ethers.parseEther('1'), proof),
        ).to.be.revertedWithCustomError(proxy, 'UserDepositCap');

        await proxy.connect(otherUser).deposit(ethers.parseEther('0.9'), ethers.parseEther('1'), proof);

        await expect(
          proxy.connect(otherUser).deposit(ethers.parseEther('0.2'), ethers.parseEther('1'), proof),
        ).to.be.revertedWithCustomError(proxy, 'UserDepositCap');
      });

      it('if zero cap in tree, than should get cap from default whitelist user cap', async () => {
        let proof = getProof(blastGovernor.address, tree);
        await expect(proxy.connect(blastGovernor).deposit(ethers.parseEther('0.6'), 0, proof)).to.be.revertedWithCustomError(
          proxy,
          'UserDepositCap',
        );
        await expect(proxy.connect(blastGovernor).deposit(ethers.parseEther('0.5'), 0, proof)).to.be.not.reverted;
      });

      it('should correct deposits and update values', async () => {
        // firstdeposit
        expect(await proxy.totalDeposited()).to.be.eq(0);
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(0);
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(0);
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(0);

        let proof = getProof(otherUser.address, tree);
        let tx = await proxy.connect(otherUser).deposit(ethers.parseEther('0.1'), ethers.parseEther('1'), proof);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser.address, ethers.parseEther('0.1'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser.address, proxy.target, ethers.parseEther('0.1'));

        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('0.1'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('0.1'));
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('0.1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(0);
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);

        proof = getProof(otherUser2.address, tree);
        tx = await proxy.connect(otherUser2).deposit(ethers.parseEther('0.5'), ethers.parseEther('0.5'), proof);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser2.address, ethers.parseEther('0.5'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser2.address, proxy.target, ethers.parseEther('0.5'));
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('0.6'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('0.1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.5'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('0.6'));
        await expect(proxy.connect(otherUser2).deposit(1, ethers.parseEther('0.5'), proof)).to.be.revertedWithCustomError(
          proxy,
          'UserDepositCap',
        );

        proof = getProof(otherUser.address, tree);
        await expect(
          proxy.connect(otherUser).deposit(ethers.parseEther('0.91'), ethers.parseEther('1'), proof),
        ).to.be.revertedWithCustomError(proxy, 'UserDepositCap');

        tx = await proxy.connect(otherUser).deposit(ethers.parseEther('0.9'), ethers.parseEther('1'), proof);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser.address, ethers.parseEther('0.9'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser.address, proxy.target, ethers.parseEther('0.9'));

        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('1.5'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('1.5'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.5'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);

        proof = getProof(otherUser.address, tree);
        await expect(proxy.connect(otherUser).deposit(1, ethers.parseEther('1'), proof)).to.be.revertedWithCustomError(
          proxy,
          'UserDepositCap',
        );

        proof = getProof(otherUser2.address, tree);
        await expect(proxy.connect(otherUser2).deposit(1, ethers.parseEther('0.5'), proof)).to.be.revertedWithCustomError(
          proxy,
          'UserDepositCap',
        );

        proof = getProof(blastGovernor.address, tree);
        await expect(proxy.connect(blastGovernor).deposit(1, 0, proof)).to.be.revertedWithCustomError(proxy, 'TotalDepositCap');
      });
    });

    describe('Public phase', async () => {
      let tree: any;

      beforeEach(async () => {
        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(otherUser2).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(blastGovernor).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, ethers.parseEther('10'));
        await usdb.mint(otherUser2.address, ethers.parseEther('10'));
        await usdb.mint(blastGovernor.address, ethers.parseEther('10'));
        await proxy.setDepositCaps(ethers.parseEther('1.5'), ethers.parseEther('0.5'), ethers.parseEther('0.25'));
        tree = StandardMerkleTree.of(
          [
            [otherUser.address, ethers.parseEther('1')],
            [otherUser2.address, ethers.parseEther('0.5')],
            [blastGovernor.address, 0],
          ],
          ['address', 'uint256'],
        );
        await proxy.setWhitelistRoot(tree.root);
        const timeNow = await time.latest();
        await proxy.setTimestamps(1, timeNow + 100, timeNow * 3);

        let proof = getProof(otherUser.address, tree);
        await proxy.connect(otherUser).deposit(ethers.parseEther('1'), ethers.parseEther('1'), proof);
        await time.increaseTo(timeNow + 101);
      });

      it('state after whitelist phase', async () => {
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(0);
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);
      });

      it('fail if user try deposit more then public phase user cap', async () => {
        await expect(proxy.connect(otherUser2).deposit(ethers.parseEther('0.26'), 0, [])).to.be.revertedWithCustomError(
          proxy,
          'UserDepositCap',
        );
      });

      it('should not fail with `OnlyForWhitelistedUser` if public phase and not provide proof', async () => {
        let tx = await proxy.connect(otherUser2).deposit(ethers.parseEther('0.25'), 0, []);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser2.address, ethers.parseEther('0.25'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser2.address, proxy.target, ethers.parseEther('0.25'));
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('1.25'));
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('1.25'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.25'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);
      });

      it('fail if user try deposit more then total deposit cap', async () => {
        await proxy.connect(otherUser2).deposit(ethers.parseEther('0.25'), 0, []);
        await usdb.approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(deployer.address, ethers.parseEther('10'));
        await proxy.connect(deployer).deposit(ethers.parseEther('0.25'), 0, []);
        await expect(proxy.connect(blastGovernor).deposit(1, 0, [])).to.be.revertedWithCustomError(proxy, 'TotalDepositCap');
      });

      it('should correct deposits and update values', async () => {
        await expect(proxy.connect(otherUser).deposit(1, 0, [])).to.be.revertedWithCustomError(proxy, 'UserDepositCap');

        let tx = await proxy.connect(otherUser2).deposit(ethers.parseEther('0.25'), 0, []);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser2.address, ethers.parseEther('0.25'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser2.address, proxy.target, ethers.parseEther('0.25'));

        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('1.25'));
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('1.25'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.25'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);

        await expect(proxy.connect(otherUser2).deposit(1, 0, [])).to.be.revertedWithCustomError(proxy, 'UserDepositCap');

        tx = await proxy.connect(blastGovernor).deposit(ethers.parseEther('0.1'), 0, []);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(blastGovernor.address, ethers.parseEther('0.1'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(blastGovernor.address, proxy.target, ethers.parseEther('0.1'));

        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('1.35'));
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('1.35'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.25'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(ethers.parseEther('0.1'));

        tx = await proxy.connect(blastGovernor).deposit(ethers.parseEther('0.15'), 0, []);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(blastGovernor.address, ethers.parseEther('0.15'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(blastGovernor.address, proxy.target, ethers.parseEther('0.15'));

        expect(await usdb.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('1.5'));
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('1.5'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.25'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(ethers.parseEther('0.25'));

        await expect(proxy.connect(blastGovernor).deposit(1, 0, [])).to.be.revertedWithCustomError(proxy, 'UserDepositCap');
        await expect(proxy.connect(deployer).deposit(1, 0, [])).to.be.revertedWithCustomError(proxy, 'TotalDepositCap');

        await expect(proxy.whithdrawDeposits()).to.be.revertedWithCustomError(proxy, 'RaiseNotFinished');

        await time.increaseTo((await time.latest()) * 3);
        expect(await usdb.balanceOf(depositsReciever.address)).to.be.eq(0);
        tx = await proxy.whithdrawDeposits();
        await expect(tx)
          .to.be.emit(proxy, 'WithdrawDeposits')
          .withArgs(deployer.address, depositsReciever.address, ethers.parseEther('1.5'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(proxy.target, depositsReciever.address, ethers.parseEther('1.5'));
        expect(await usdb.balanceOf(proxy.target)).to.be.eq(0);
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('1.5'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.25'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(ethers.parseEther('0.25'));
        expect(await usdb.balanceOf(depositsReciever.address)).to.be.eq(ethers.parseEther('1.5'));
      });
    });
  });
});

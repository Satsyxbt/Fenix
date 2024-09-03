import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { setCode, time, mine, loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, FenixRaiseUpgradeable, VotingEscrowUpgradeableV2 } from '../../typechain-types/index';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, deployERC20MockToken } from '../utils/coreFixture';
import { deploy } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { Signer } from '@ethersproject/abstract-signer';

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
  let Fenix: ERC20Mock;
  let votingEscrow: VotingEscrowUpgradeableV2;
  let deployed: CoreFixtureDeployed;

  async function getInstance(
    depositTokenDecimals: number | bigint,
    rewardTokenDecimals: number | bigint,
    toVeNftPercentage: number | bigint,
    amountOfRewardTokenPerDepositToken: number | bigint,
  ) {
    let depositToken = await deployERC20MockToken(deployer, 'T', 'T', Number(depositTokenDecimals));
    let rewardToken = await deployERC20MockToken(deployer, 'R', 'R', Number(rewardTokenDecimals));
    let uninitializedProxy = await ethers.getContractAt(
      'FenixRaiseUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
      ).target,
    );

    await uninitializedProxy.initialize(
      blastGovernor.address,
      depositToken.target,
      rewardToken.target,
      depositsReciever.address,
      amountOfRewardTokenPerDepositToken,
      votingEscrow.target,
      toVeNftPercentage,
    );
    return uninitializedProxy;
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    votingEscrow = deployed.votingEscrow;

    [deployer, proxyAdmin, depositsReciever, blastGovernor, otherUser, otherUser2] = await ethers.getSigners();

    implementation = await ethers.deployContract('FenixRaiseUpgradeable', [blastGovernor.address]);
    proxy = await ethers.getContractAt(
      'FenixRaiseUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
      ).target,
    );
    usdb = await deployERC20MockToken(deployer, 'USDB', 'USDB', 18);
    Fenix = await deployERC20MockToken(deployer, 'FNX', 'FNX', 18);

    await proxy.initialize(
      blastGovernor.address,
      usdb.target,
      Fenix.target,
      depositsReciever.address,
      ethers.parseEther('1'),
      ethers.ZeroAddress,
      0,
    );
  });

  describe('Deployment', function () {
    it('fail if try initialize on implementation', async () => {
      await expect(
        implementation.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          0,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('fail if try initialize second time', async () => {
      await expect(
        proxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          0,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('fail if try set toVeNftPercentage more then max percentage', async () => {
      let uninitializedProxy = await ethers.getContractAt(
        'FenixRaiseUpgradeable',
        (
          await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
        ).target,
      );
      await expect(
        uninitializedProxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          ethers.parseEther('1.001'),
        ),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'IncorrectToVeNftPercentage');
    });

    it('fail if try set toVeNftPercentage more then zero  with votingEscrow zero address', async () => {
      let uninitializedProxy = await ethers.getContractAt(
        'FenixRaiseUpgradeable',
        (
          await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
        ).target,
      );
      await expect(
        uninitializedProxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          ethers.parseEther('1'),
        ),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
    });

    it('fail if try set zero address', async () => {
      let uninitializedProxy = await ethers.getContractAt(
        'FenixRaiseUpgradeable',
        (
          await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
        ).target,
      );
      await expect(
        uninitializedProxy.initialize(
          ZERO_ADDRESS,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          0,
        ),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
      await expect(
        uninitializedProxy.initialize(
          blastGovernor.address,
          ZERO_ADDRESS,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          0,
        ),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
      await expect(
        uninitializedProxy.initialize(
          blastGovernor.address,
          usdb.target,
          ZERO_ADDRESS,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          0,
        ),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');

      await expect(
        uninitializedProxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          ZERO_ADDRESS,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          0,
        ),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');

      await expect(
        uninitializedProxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1'),
          ethers.ZeroAddress,
          1,
        ),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
    });

    it('correct initialize parameters', async () => {
      expect(await proxy.token()).to.be.eq(usdb.target);
      expect(await proxy.depositsReciever()).to.be.eq(depositsReciever.address);
      expect(await proxy.owner()).to.be.eq(deployer.address);
      expect(await proxy.rewardToken()).to.be.eq(Fenix.target);
      expect(await proxy.votingEscrow()).to.be.eq(ZERO_ADDRESS);
      expect(await proxy.toVeNftPercentage()).to.be.eq(0);
      expect(await proxy.amountOfRewardTokenPerDepositToken()).to.be.eq(ethers.parseEther('1'));
    });

    it('initial setup', async () => {
      expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(0);
      expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(0);
      expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(0);
      expect(await proxy.startClaimPhaseTimestamp()).to.be.eq(0);
      expect(await proxy.whitelistPhaseUserCap()).to.be.eq(0);
      expect(await proxy.publicPhaseUserCap()).to.be.eq(0);
      expect(await proxy.totalDepositCap()).to.be.eq(0);
      expect(await proxy.totalDeposited()).to.be.eq(0);
      expect(await proxy.whitelistMerklRoot()).to.be.eq(ethers.ZeroHash);
    });

    it('#isClaimPashe should return false', async () => {
      expect(await proxy.isClaimPhase()).to.be.false;
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
      expect(await proxy.isClaimPhase()).to.be.false;

      const timeNow = await time.latest();
      await proxy.setTimestamps(timeNow + 100, timeNow + 200, timeNow + 300, timeNow + 400);
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.false;
      expect(await proxy.isClaimPhase()).to.be.false;

      await time.increaseTo(timeNow + 101);
      expect(await proxy.isWhitelistPhase()).to.be.true;
      expect(await proxy.isPublicPhase()).to.be.false;
      expect(await proxy.isClaimPhase()).to.be.false;

      await time.increaseTo(timeNow + 201);
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.true;
      expect(await proxy.isClaimPhase()).to.be.false;

      await time.increaseTo(timeNow + 301);
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.false;
      expect(await proxy.isClaimPhase()).to.be.false;
      await time.increaseTo(timeNow + 401);
      expect(await proxy.isWhitelistPhase()).to.be.false;
      expect(await proxy.isPublicPhase()).to.be.false;
      expect(await proxy.isClaimPhase()).to.be.true;
    });
  });
  describe('Access restricted methods', async () => {
    describe('#withdrawExcessiveRewardTokens', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(otherUser).withdrawExcessiveRewardTokens()).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should fail if public phase not closed', async () => {
        await expect(proxy.withdrawExcessiveRewardTokens()).to.be.revertedWithCustomError(proxy, 'RaiseNotFinished');
      });
      it('should fail if try withdraw zero balance', async () => {
        await proxy.setTimestamps(1, 2, 3, 4);
        await expect(proxy.withdrawExcessiveRewardTokens()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
      });
      it('should success withdraw and transfer to deposits reciever full balance when not present deposits', async () => {
        await proxy.setTimestamps(1, 2, 3, 4);

        await Fenix.mint(proxy.target, ethers.parseEther('99'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('99'));
        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(0);

        let tx = await proxy.withdrawExcessiveRewardTokens();
        await expect(tx)
          .to.be.emit(proxy, 'WithdrawExcessiveRewardTokens')
          .withArgs(deployer.address, depositsReciever.address, ethers.parseEther('99'));
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, depositsReciever.address, ethers.parseEther('99'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(0);
        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(ethers.parseEther('99'));
      });

      it('should success withdraw part rewards tokens', async () => {
        await Fenix.mint(proxy.target, ethers.parseEther('100'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(0);

        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, ethers.parseEther('100'));
        const timeNow = await time.latest();
        await proxy.setTimestamps(timeNow + 100, timeNow + 200, timeNow + 300, timeNow + 400);
        await proxy.setDepositCaps(ethers.parseEther('100'), ethers.parseEther('100'), ethers.parseEther('100'));
        await time.increaseTo(timeNow + 201);

        await proxy.connect(otherUser).deposit(ethers.parseEther('40'), 0, []);
        await time.increaseTo(timeNow + 305);

        let tx = await proxy.withdrawExcessiveRewardTokens();
        await expect(tx)
          .to.be.emit(proxy, 'WithdrawExcessiveRewardTokens')
          .withArgs(deployer.address, depositsReciever.address, ethers.parseEther('60'));
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, depositsReciever.address, ethers.parseEther('60'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('40'));
        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(ethers.parseEther('60'));

        await expect(proxy.withdrawExcessiveRewardTokens()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
      });

      it('should success withdraw part rewards tokens, after users claim', async () => {
        await Fenix.mint(proxy.target, ethers.parseEther('100'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(0);

        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(otherUser2).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser2.address, ethers.parseEther('100'));
        await usdb.mint(otherUser.address, ethers.parseEther('100'));

        const timeNow = await time.latest();
        await proxy.setTimestamps(timeNow + 100, timeNow + 200, timeNow + 300, timeNow + 400);
        await proxy.setDepositCaps(ethers.parseEther('100'), ethers.parseEther('100'), ethers.parseEther('100'));
        await time.increaseTo(timeNow + 201);

        await proxy.connect(otherUser).deposit(ethers.parseEther('20'), 0, []);
        await proxy.connect(otherUser2).deposit(ethers.parseEther('20'), 0, []);
        await time.increaseTo(timeNow + 405);

        await proxy.connect(otherUser).claim();

        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('20'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('80'));

        let tx = await proxy.withdrawExcessiveRewardTokens();
        await expect(tx)
          .to.be.emit(proxy, 'WithdrawExcessiveRewardTokens')
          .withArgs(deployer.address, depositsReciever.address, ethers.parseEther('60'));
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, depositsReciever.address, ethers.parseEther('60'));

        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(ethers.parseEther('60'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('20'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('20'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(0);

        await expect(proxy.withdrawExcessiveRewardTokens()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        await proxy.connect(otherUser2).claim();
        await expect(proxy.withdrawExcessiveRewardTokens()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(ethers.parseEther('60'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(0);
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('20'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(ethers.parseEther('20'));
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('40'));
      });
      it('should refert if not present excessive rewards tokens', async () => {
        await Fenix.mint(proxy.target, ethers.parseEther('100'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await Fenix.balanceOf(depositsReciever.address)).to.be.eq(0);

        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, ethers.parseEther('100'));
        const timeNow = await time.latest();
        await proxy.setTimestamps(timeNow + 100, timeNow + 200, timeNow + 300, timeNow + 400);
        await proxy.setDepositCaps(ethers.parseEther('100'), ethers.parseEther('100'), ethers.parseEther('100'));
        await time.increaseTo(timeNow + 201);

        await proxy.connect(otherUser).deposit(ethers.parseEther('100'), 0, []);
        await time.increaseTo(timeNow + 305);

        await expect(proxy.withdrawExcessiveRewardTokens()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
      });
    });

    describe('#withdrawDeposits', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(otherUser).whithdrawDeposits()).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('should fail if public phase not closed', async () => {
        await expect(proxy.whithdrawDeposits()).to.be.revertedWithCustomError(proxy, 'RaiseNotFinished');
      });
      it('should fail if try withdraw zero balance', async () => {
        await proxy.setTimestamps(1, 2, 3, 4);
        await expect(proxy.whithdrawDeposits()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
      });
      it('should success withdraw and transfer to deposits reciever', async () => {
        await proxy.setTimestamps(1, 2, 3, 4);

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
        await expect(proxy.connect(otherUser).setTimestamps(0, 0, 0, 0)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('fail if try setup incorrect timestamps', async () => {
        await expect(proxy.setTimestamps(0, 0, 0, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 0, 0, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(0, 1, 0, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(0, 0, 1, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(0, 0, 0, 1)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 1, 0, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 1, 1, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 1, 1, 1)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 2, 0, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 0, 2, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 0, 0, 2)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(2, 0, 2, 0)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(2, 2, 2, 2)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(10, 20, 20, 20)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 2, 3, 2)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 2, 3, 3)).to.be.revertedWithCustomError(proxy, 'IncorrectTimestamps');
        await expect(proxy.setTimestamps(1, 2, 3, 4)).to.be.not.reverted;
        await expect(proxy.setTimestamps(10, 20, 30, 40)).to.be.not.reverted;
      });
      it('should correct setup new timestamps and emit event', async () => {
        expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(0);
        expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(0);
        expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(0);
        await expect(proxy.setTimestamps(0, 1, 2, 3)).to.be.emit(proxy, 'UpdateTimestamps').withArgs(0, 1, 2, 3);
        expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(0);
        expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(1);
        expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(2);
        expect(await proxy.startClaimPhaseTimestamp()).to.be.eq(3);

        await expect(proxy.setTimestamps(100, 250, 421, 523)).to.be.emit(proxy, 'UpdateTimestamps').withArgs(100, 250, 421, 523);
        expect(await proxy.startWhitelistPhaseTimestamp()).to.be.eq(100);
        expect(await proxy.startPublicPhaseTimestamp()).to.be.eq(250);
        expect(await proxy.endPublicPhaseTimestamp()).to.be.eq(421);
        expect(await proxy.startClaimPhaseTimestamp()).to.be.eq(523);
      });
    });
  });
  describe('#getRewardsAmountOut()', async () => {
    const CASES = [
      {
        inDecimals: 18,
        outDecimals: 18,
        toVeNft: ethers.parseEther('0.5'),
        rate: ethers.parseEther('1'),
        amounts: [ethers.parseEther('100'), ethers.parseEther('200')],
        toRewardTokenAmounts: [ethers.parseEther('50'), ethers.parseEther('100')],
        toVeNftAmounts: [ethers.parseEther('50'), ethers.parseEther('100')],
      },
      {
        inDecimals: 18,
        outDecimals: 6,
        toVeNft: ethers.parseEther('0.1'),
        rate: 0.5e6,
        amounts: [ethers.parseEther('100')],
        toRewardTokenAmounts: [45000000],
        toVeNftAmounts: [5000000],
      },
      {
        inDecimals: 6,
        outDecimals: 18,
        toVeNft: ethers.parseEther('0.45'),
        rate: ethers.parseEther('1256'),
        amounts: [1e6],
        toRewardTokenAmounts: [ethers.parseEther('690.8')],
        toVeNftAmounts: [ethers.parseEther('565.2')],
      },
    ];

    it('should correct return amounts', async () => {
      for (let index = 0; index < CASES.length; index++) {
        const iterator = CASES[index];
        console.log(
          `Testing with parameters: inDecimals=${iterator.inDecimals}, outDecimals=${
            iterator.outDecimals
          }, toVeNft=${iterator.toVeNft.toString()}, rate=${iterator.rate.toString()}`,
        );
        let instance = await getInstance(iterator.inDecimals, iterator.outDecimals, iterator.toVeNft, iterator.rate);
        for (let i = 0; i < iterator.amounts.length; i++) {
          console.log(
            `amount=${iterator.amounts[i].toString()}, expectedRewardTokenAmount=${iterator.toRewardTokenAmounts[
              i
            ].toString()}, expectedVeNftAmount=${iterator.toVeNftAmounts[i].toString()}`,
          );
          let [toRewardTokenAmount, toVeNftAmount] = await instance.getRewardsAmountOut(iterator.amounts[i]);
          expect(toRewardTokenAmount).to.be.eq(iterator.toRewardTokenAmounts[i]);
          expect(toVeNftAmount).to.be.eq(iterator.toVeNftAmounts[i]);
        }
      }
    });
  });

  describe('Deposit flow', async () => {
    it('should fail if try deposit zero amount', async () => {
      await expect(proxy.deposit(0, 0, [])).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
    });

    it('before whitelist phase and after public should fail with DepositClodes ', async () => {
      const timeNow = await time.latest();
      await proxy.setTimestamps(timeNow + 100, timeNow + 200, timeNow + 300, timeNow + 400);
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
        await proxy.setTimestamps(timeNow + 100, timeNow * 2, timeNow * 3, timeNow * 4);
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
        expect(await proxy.userDepositsWhitelistPhase(otherUser.address)).to.be.eq(0);
        expect(await proxy.userDepositsWhitelistPhase(otherUser2.address)).to.be.eq(0);
        expect(await proxy.userDepositsWhitelistPhase(blastGovernor.address)).to.be.eq(0);
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
        expect(await proxy.userDepositsWhitelistPhase(otherUser.address)).to.be.eq(ethers.parseEther('0.1'));
        expect(await proxy.userDepositsWhitelistPhase(otherUser2.address)).to.be.eq(0);
        expect(await proxy.userDepositsWhitelistPhase(blastGovernor.address)).to.be.eq(0);

        proof = getProof(otherUser2.address, tree);
        tx = await proxy.connect(otherUser2).deposit(ethers.parseEther('0.5'), ethers.parseEther('0.5'), proof);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser2.address, ethers.parseEther('0.5'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser2.address, proxy.target, ethers.parseEther('0.5'));
        expect(await proxy.totalDeposited()).to.be.eq(ethers.parseEther('0.6'));
        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('0.1'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('0.5'));
        expect(await proxy.userDeposited(blastGovernor.address)).to.be.eq(0);
        expect(await proxy.userDepositsWhitelistPhase(otherUser.address)).to.be.eq(ethers.parseEther('0.1'));
        expect(await proxy.userDepositsWhitelistPhase(otherUser2.address)).to.be.eq(ethers.parseEther('0.5'));
        expect(await proxy.userDepositsWhitelistPhase(blastGovernor.address)).to.be.eq(0);
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
        expect(await proxy.userDepositsWhitelistPhase(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDepositsWhitelistPhase(otherUser2.address)).to.be.eq(ethers.parseEther('0.5'));
        expect(await proxy.userDepositsWhitelistPhase(blastGovernor.address)).to.be.eq(0);
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
        await proxy.setTimestamps(1, timeNow + 100, timeNow * 3, timeNow * 4);

        let proof = getProof(otherUser.address, tree);
        await proxy.connect(otherUser).deposit(ethers.parseEther('1'), ethers.parseEther('1'), proof);
        await time.increaseTo(timeNow + 101);
      });

      afterEach(async () => {
        expect(await proxy.userDepositsWhitelistPhase(otherUser.address)).to.be.eq(ethers.parseEther('1'));
        expect(await proxy.userDepositsWhitelistPhase(otherUser2.address)).to.be.eq(0);
        expect(await proxy.userDepositsWhitelistPhase(blastGovernor.address)).to.be.eq(0);
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

      it('should use public cap, even if the user deposited during the whitelist', async () => {
        await expect(proxy.connect(otherUser).deposit(ethers.parseEther('0.26'), 0, [])).to.be.revertedWithCustomError(
          proxy,
          'UserDepositCap',
        );
        let tx = await proxy.connect(otherUser).deposit(ethers.parseEther('0.24'), 0, []);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser.address, ethers.parseEther('0.24'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser.address, proxy.target, ethers.parseEther('0.24'));

        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1.24'));

        await expect(proxy.connect(otherUser).deposit(ethers.parseEther('0.2'), 0, [])).to.be.revertedWithCustomError(
          proxy,
          'UserDepositCap',
        );

        tx = await proxy.connect(otherUser).deposit(ethers.parseEther('0.01'), 0, []);
        await expect(tx).to.be.emit(proxy, 'Deposit').withArgs(otherUser.address, ethers.parseEther('0.01'));
        await expect(tx).to.be.emit(usdb, 'Transfer').withArgs(otherUser.address, proxy.target, ethers.parseEther('0.01'));

        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1.25'));

        await expect(proxy.connect(otherUser).deposit(1, 0, [])).to.be.revertedWithCustomError(proxy, 'UserDepositCap');

        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('1.25'));
      });
      it('should correct deposits and update values', async () => {
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

  describe('Claim flow', async () => {
    describe('success claim', async () => {
      it('success claim and emit event without veNFT tokens, 18, 18, 0.125', async () => {
        proxy = await ethers.getContractAt(
          'FenixRaiseUpgradeable',
          (
            await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
          ).target,
        );

        await proxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('0.125'),
          votingEscrow.target,
          0,
        );

        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(otherUser2).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(blastGovernor).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, ethers.parseEther('10'));
        await usdb.mint(otherUser2.address, ethers.parseEther('10'));
        await usdb.mint(blastGovernor.address, ethers.parseEther('10'));

        await Fenix.mint(proxy.target, ethers.parseEther('100'));
        let startTime = await time.latest();
        await proxy.setTimestamps(1, 2, startTime + 300, startTime + 400);
        await proxy.setDepositCaps(ethers.parseEther('100'), ethers.parseEther('100'), ethers.parseEther('1000'));

        await proxy.connect(otherUser).deposit(ethers.parseEther('10'), 0, []);
        await proxy.connect(otherUser2).deposit(ethers.parseEther('5'), 0, []);
        await time.increaseTo(startTime + 401);

        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('10'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('5'));
        expect(await proxy.isUserClaimed(otherUser.address)).to.be.false;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);

        let user1AmountsOut = await proxy.getRewardsAmountOut(ethers.parseEther('10'));
        expect(user1AmountsOut.toRewardTokenAmount).to.be.eq(ethers.parseEther('1.25'));
        expect(user1AmountsOut.toVeNftAmount).to.be.eq(0);

        let user2AmountsOut = await proxy.getRewardsAmountOut(ethers.parseEther('5'));
        expect(user2AmountsOut.toRewardTokenAmount).to.be.eq(ethers.parseEther('0.625'));
        expect(user2AmountsOut.toVeNftAmount).to.be.eq(0);

        let tx = await proxy.connect(otherUser).claim();

        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(otherUser.address, ethers.parseEther('1.25'), ethers.parseEther('1.25'), 0, 0);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, otherUser.address, ethers.parseEther('1.25'));

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('1.25'));
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('98.75'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('1.25'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(0);

        tx = await proxy.connect(otherUser2).claim();

        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(otherUser2.address, ethers.parseEther('0.625'), ethers.parseEther('0.625'), 0, 0);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, otherUser2.address, ethers.parseEther('0.625'));

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.true;

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');
        await expect(proxy.connect(otherUser2).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('1.875'));

        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('98.12500'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('1.25'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(ethers.parseEther('0.625'));
      });
      it('success claim and emit event without veNFT tokens, 6, 18, 1.25', async () => {
        proxy = await ethers.getContractAt(
          'FenixRaiseUpgradeable',
          (
            await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
          ).target,
        );
        usdb = await deployERC20MockToken(deployer, 'T', 'T', 6);
        await proxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('1.25'),
          votingEscrow.target,
          0,
        );

        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(otherUser2).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(blastGovernor).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, 10e6);
        await usdb.mint(otherUser2.address, 10e6);

        await Fenix.mint(proxy.target, ethers.parseEther('100'));
        let startTime = await time.latest();
        await proxy.setTimestamps(1, 2, startTime + 300, startTime + 400);
        await proxy.setDepositCaps(ethers.parseEther('100'), ethers.parseEther('100'), ethers.parseEther('1000'));

        await proxy.connect(otherUser).deposit(10e6, 0, []);
        await proxy.connect(otherUser2).deposit(5e6, 0, []);
        await time.increaseTo(startTime + 401);

        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(10e6);
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(5e6);
        expect(await proxy.isUserClaimed(otherUser.address)).to.be.false;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);

        let user1AmountsOut = await proxy.getRewardsAmountOut(10e6);
        expect(user1AmountsOut.toRewardTokenAmount).to.be.eq(ethers.parseEther('12.5'));
        expect(user1AmountsOut.toVeNftAmount).to.be.eq(0);

        let user2AmountsOut = await proxy.getRewardsAmountOut(5e6);
        expect(user2AmountsOut.toRewardTokenAmount).to.be.eq(ethers.parseEther('6.25'));
        expect(user2AmountsOut.toVeNftAmount).to.be.eq(0);

        let tx = await proxy.connect(otherUser).claim();

        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(otherUser.address, ethers.parseEther('12.5'), ethers.parseEther('12.5'), 0, 0);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, otherUser.address, ethers.parseEther('12.5'));

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('12.5'));

        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('87.5'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('12.5'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(0);

        tx = await proxy.connect(otherUser2).claim();

        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(otherUser2.address, ethers.parseEther('6.25'), ethers.parseEther('6.25'), 0, 0);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, otherUser2.address, ethers.parseEther('6.25'));

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.true;

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');
        await expect(proxy.connect(otherUser2).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');

        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('81.25'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('12.5'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(ethers.parseEther('6.25'));
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('18.75'));
      });
      it('success claim and emit event with 40% to veNFT tokens, 18, 18, 0.01', async () => {
        Fenix = deployed.fenix;
        proxy = await ethers.getContractAt(
          'FenixRaiseUpgradeable',
          (
            await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
          ).target,
        );
        usdb = await deployERC20MockToken(deployer, 'T', 'T', 18);
        await proxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('0.01'),
          votingEscrow.target,
          ethers.parseEther('0.4'),
        );

        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(otherUser2).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(blastGovernor).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, ethers.parseEther('100'));
        await usdb.mint(otherUser2.address, ethers.parseEther('100'));

        await Fenix.transfer(proxy.target, ethers.parseEther('100'));
        let startTime = await time.latest();
        await proxy.setTimestamps(1, 2, startTime + 300, startTime + 400);
        await proxy.setDepositCaps(ethers.parseEther('1000'), ethers.parseEther('100'), ethers.parseEther('100'));

        await proxy.connect(otherUser).deposit(ethers.parseEther('100'), 0, []);
        await proxy.connect(otherUser2).deposit(ethers.parseEther('50'), 0, []);
        await time.increaseTo(startTime + 401);

        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('50'));
        expect(await proxy.isUserClaimed(otherUser.address)).to.be.false;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);

        let user1AmountsOut = await proxy.getRewardsAmountOut(ethers.parseEther('100'));
        expect(user1AmountsOut.toRewardTokenAmount).to.be.eq(ethers.parseEther('0.6'));
        expect(user1AmountsOut.toVeNftAmount).to.be.eq(ethers.parseEther('0.4'));

        let user2AmountsOut = await proxy.getRewardsAmountOut(ethers.parseEther('50'));
        expect(user2AmountsOut.toRewardTokenAmount).to.be.eq(ethers.parseEther('0.3'));
        expect(user2AmountsOut.toVeNftAmount).to.be.eq(ethers.parseEther('0.2'));

        let tx = await proxy.connect(otherUser).claim();

        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(otherUser.address, ethers.parseEther('1'), ethers.parseEther('0.6'), ethers.parseEther('0.4'), 1);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, otherUser.address, ethers.parseEther('0.6'));
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('0.4'));

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('1'));

        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('99'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('0.6'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(0);

        tx = await proxy.connect(otherUser2).claim();

        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(otherUser2.address, ethers.parseEther('0.5'), ethers.parseEther('0.3'), ethers.parseEther('0.2'), 2);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, otherUser2.address, ethers.parseEther('0.3'));
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('0.2'));
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('1.5'));

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.true;

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');
        await expect(proxy.connect(otherUser2).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');

        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('98.5'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(ethers.parseEther('0.6'));
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(ethers.parseEther('0.3'));
      });
      it('success claim and emit event with 100% to veNFT tokens, 18, 18, 0.5', async () => {
        Fenix = deployed.fenix;

        proxy = await ethers.getContractAt(
          'FenixRaiseUpgradeable',
          (
            await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, proxyAdmin.address, '0x'])
          ).target,
        );

        await proxy.initialize(
          blastGovernor.address,
          usdb.target,
          Fenix.target,
          depositsReciever.address,
          ethers.parseEther('0.5'),
          votingEscrow.target,
          ethers.parseEther('1'), // 100% to veNFT
        );

        await usdb.connect(otherUser).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(otherUser2).approve(proxy.target, ethers.MaxUint256);
        await usdb.connect(blastGovernor).approve(proxy.target, ethers.MaxUint256);
        await usdb.mint(otherUser.address, ethers.parseEther('10'));
        await usdb.mint(otherUser2.address, ethers.parseEther('10'));
        await usdb.mint(blastGovernor.address, ethers.parseEther('10'));

        await Fenix.transfer(proxy.target, ethers.parseEther('100'));
        let startTime = await time.latest();
        await proxy.setTimestamps(1, 2, startTime + 300, startTime + 400);
        await proxy.setDepositCaps(ethers.parseEther('100'), ethers.parseEther('100'), ethers.parseEther('1000'));

        await proxy.connect(otherUser).deposit(ethers.parseEther('10'), 0, []);
        await proxy.connect(otherUser2).deposit(ethers.parseEther('5'), 0, []);
        await time.increaseTo(startTime + 401);

        expect(await proxy.userDeposited(otherUser.address)).to.be.eq(ethers.parseEther('10'));
        expect(await proxy.userDeposited(otherUser2.address)).to.be.eq(ethers.parseEther('5'));
        expect(await proxy.isUserClaimed(otherUser.address)).to.be.false;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;
        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(0);

        let user1AmountsOut = await proxy.getRewardsAmountOut(ethers.parseEther('10'));
        expect(user1AmountsOut.toRewardTokenAmount).to.be.eq(0);
        expect(user1AmountsOut.toVeNftAmount).to.be.eq(ethers.parseEther('5'));

        let user2AmountsOut = await proxy.getRewardsAmountOut(ethers.parseEther('5'));
        expect(user2AmountsOut.toRewardTokenAmount).to.be.eq(0);
        expect(user2AmountsOut.toVeNftAmount).to.be.eq(ethers.parseEther('2.5'));

        let tx = await proxy.connect(otherUser).claim();

        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(otherUser.address, ethers.parseEther('5'), 0, ethers.parseEther('5'), 1);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('5'));

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.false;

        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('95'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(0);

        tx = await proxy.connect(otherUser2).claim();

        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(otherUser2.address, ethers.parseEther('2.5'), 0, ethers.parseEther('2.5'), 2);
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('2.5'));

        expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;
        expect(await proxy.isUserClaimed(otherUser2.address)).to.be.true;

        await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');
        await expect(proxy.connect(otherUser2).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');

        expect(await Fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('92.5'));
        expect(await Fenix.balanceOf(otherUser.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(otherUser2.address)).to.be.eq(0);
        expect(await proxy.totalClaimed()).to.be.eq(ethers.parseEther('7.5'));
      });
    });

    it('fail if try claim during not claim phase', async () => {
      const timeNow = await time.latest();
      await proxy.setTimestamps(0, 1, 2, timeNow + 100);
      expect(await proxy.isClaimPhase()).to.be.false;
      await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'ClaimPhaseNotStarted');
      await time.increaseTo(timeNow + 101);
      expect(await proxy.isClaimPhase()).to.be.true;
      await expect(proxy.connect(otherUser).claim()).to.be.not.revertedWithCustomError(proxy, 'ClaimPhaseNotStarted');
    });
    it('fail if user not deposited before claim phase', async () => {
      const timeNow = await time.latest();
      await proxy.setTimestamps(0, 1, 2, timeNow - 1);
      expect(await proxy.isClaimPhase()).to.be.true;
      expect(await proxy.userDeposited(otherUser.address)).to.be.eq(0);
      expect(await proxy.isUserClaimed(otherUser.address)).to.be.false;

      await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
    });

    it('fail if userd already claimed', async () => {
      const timeNow = await time.latest();
      await proxy.setTimestamps(0, timeNow - 1, timeNow + 100, timeNow + 101);

      await Fenix.mint(proxy.target, ethers.parseEther('1'));
      await proxy.setDepositCaps(ethers.parseEther('1'), ethers.parseEther('1'), ethers.parseEther('1'));
      await usdb.connect(otherUser).approve(proxy.target, ethers.parseEther('1'));
      await usdb.mint(otherUser.address, ethers.parseEther('1'));

      await proxy.connect(otherUser).deposit(ethers.parseEther('1'), 0, []);

      await time.increaseTo(timeNow + 101);
      await proxy.connect(otherUser).claim();
      expect(await proxy.isUserClaimed(otherUser.address)).to.be.true;

      await expect(proxy.connect(otherUser).claim()).to.be.revertedWithCustomError(proxy, 'AlreadyClaimed');
    });
  });
});

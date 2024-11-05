import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
  Fenix,
  ManagedNFTManagerUpgradeable,
  RouterV2,
  RouterV2PathProviderUpgradeable,
  VeFnxSplitMerklAidropUpgradeable,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types/index';
import { ERRORS, ONE, ONE_ETHER, WETH_PREDEPLOYED_ADDRESS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, deployTransaperntUpgradeableProxy, SignersList } from '../utils/coreFixture';

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
  const TO_PURE_TOKESN_RATE = ethers.parseEther('0.25');

  let deployed: CoreFixtureDeployed;
  let implementation: VeFnxSplitMerklAidropUpgradeable;
  let proxy: VeFnxSplitMerklAidropUpgradeable;
  let fenix: Fenix;
  let votingEscrow: VotingEscrowUpgradeableV2;
  let signers: SignersList;
  let strategyFactory: CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;
  let routerV2: RouterV2;
  let routerV2PathProvider: RouterV2PathProviderUpgradeable;
  let managedNFTManager: ManagedNFTManagerUpgradeable;

  async function newStrategy() {
    let strategy = await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyUpgradeable',
      await strategyFactory.createStrategy.staticCall('VeMax'),
    );
    await strategyFactory.createStrategy('VeMax');
    return strategy;
  }

  async function deployStrategyFactory() {
    strategyFactory = (await ethers.getContractAt(
      'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (
            await ethers.deployContract('CompoundVeFNXManagedNFTStrategyFactoryUpgradeable', [signers.blastGovernor.address])
          ).getAddress(),
        )
      ).target,
    )) as CompoundVeFNXManagedNFTStrategyFactoryUpgradeable;

    routerV2PathProvider = (await ethers.getContractFactory('RouterV2PathProviderUpgradeable')).attach(
      (
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await (await ethers.deployContract('RouterV2PathProviderUpgradeable', [signers.blastGovernor.address])).getAddress(),
        )
      ).target,
    ) as RouterV2PathProviderUpgradeable;

    routerV2 = await ethers.deployContract('RouterV2', [
      signers.blastGovernor.address,
      deployed.v2PairFactory.target,
      WETH_PREDEPLOYED_ADDRESS,
    ]);

    await routerV2PathProvider.initialize(signers.blastGovernor.address, deployed.v2PairFactory.target, routerV2.target);

    await strategyFactory.initialize(
      signers.blastGovernor.address,
      (
        await ethers.deployContract('CompoundVeFNXManagedNFTStrategyUpgradeable', [signers.blastGovernor.address])
      ).target,
      (
        await ethers.deployContract('SingelTokenVirtualRewarderUpgradeable', [signers.blastGovernor.address])
      ).target,
      managedNFTManager.target,
      routerV2PathProvider.target,
    );
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
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

    await proxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, TO_PURE_TOKESN_RATE);

    managedNFTManager = deployed.managedNFTManager;

    await deployStrategyFactory();
  });

  describe('Deployment', function () {
    it('fail if try initialize on implementation', async () => {
      await expect(
        implementation.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, TO_PURE_TOKESN_RATE),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fail if try initialize second time', async () => {
      await expect(
        proxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, TO_PURE_TOKESN_RATE),
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
        uninitializedProxy.initialize(ZERO_ADDRESS, fenix.target, votingEscrow.target, TO_PURE_TOKESN_RATE),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, ZERO_ADDRESS, votingEscrow.target, TO_PURE_TOKESN_RATE),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');

      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, ZERO_ADDRESS, TO_PURE_TOKESN_RATE),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'AddressZero');
    });
    it('fail if try set pure tokens rate more then 100%', async () => {
      let uninitializedProxy = await ethers.getContractAt(
        'VeFnxSplitMerklAidropUpgradeable',
        (
          await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
        ).target,
      );
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, ethers.parseEther('1') + BigInt(1)),
      ).to.be.revertedWithCustomError(uninitializedProxy, 'IncorrectPureTokensRate');
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, ethers.parseEther('1')),
      ).to.be.not.revertedWithCustomError(uninitializedProxy, 'IncorrectPureTokensRate');
      await expect(
        uninitializedProxy.initialize(signers.blastGovernor.address, fenix.target, votingEscrow.target, 0),
      ).to.be.not.revertedWithCustomError(uninitializedProxy, 'IncorrectPureTokensRate');
    });
    describe('success deployment', async () => {
      it('correct setup params', async () => {
        expect(await proxy.token()).to.be.eq(fenix.target);
        expect(await proxy.votingEscrow()).to.be.eq(votingEscrow.target);
        expect(await proxy.pureTokensRate()).to.be.eq(TO_PURE_TOKESN_RATE);
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
    describe('#setPureTokensRate', async () => {
      it('fail if try call from not owner', async () => {
        await expect(proxy.connect(signers.otherUser1).setPureTokensRate(1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });

      it('should fail if try setup during not paused state', async () => {
        await proxy.unpause();
        expect(await proxy.paused()).to.be.false;
        await expect(proxy.setPureTokensRate(1)).to.be.revertedWith(ERRORS.Pausable.NotPaused);
      });

      it('should fail if try setup more then 100%', async () => {
        await expect(proxy.setPureTokensRate(ethers.parseEther('1') + BigInt(1))).to.be.revertedWithCustomError(
          proxy,
          'IncorrectPureTokensRate',
        );
      });

      it('success setup with emit event', async () => {
        expect(await proxy.paused()).to.be.true;
        expect(await proxy.pureTokensRate()).to.be.eq(TO_PURE_TOKESN_RATE);

        await expect(proxy.setPureTokensRate(0)).to.be.emit(proxy, 'SetPureTokensRate').withArgs(0);
        expect(await proxy.pureTokensRate()).to.be.eq(0);

        await expect(proxy.setPureTokensRate(ethers.parseEther('1')))
          .to.be.emit(proxy, 'SetPureTokensRate')
          .withArgs(ethers.parseEther('1'));
        expect(await proxy.pureTokensRate()).to.be.eq(ethers.parseEther('1'));

        await expect(proxy.setPureTokensRate(ethers.parseEther('0.005')))
          .to.be.emit(proxy, 'SetPureTokensRate')
          .withArgs(ethers.parseEther('0.005'));
        expect(await proxy.pureTokensRate()).to.be.eq(ethers.parseEther('0.005'));
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
  it('#calculatePureTokensAmount', async () => {
    expect(await proxy.pureTokensRate()).to.be.eq(TO_PURE_TOKESN_RATE);
    expect(await proxy.calculatePureTokensAmount(0)).to.be.eq(0);
    expect(await proxy.calculatePureTokensAmount(1)).to.be.eq(0);
    expect(await proxy.calculatePureTokensAmount(10)).to.be.eq(2);
    expect(await proxy.calculatePureTokensAmount(100)).to.be.eq(25);
    expect(await proxy.calculatePureTokensAmount(ethers.parseEther('1'))).to.be.eq(ethers.parseEther('0.25'));

    await proxy.setPureTokensRate(ethers.parseEther('1'));
    expect(await proxy.calculatePureTokensAmount(ethers.parseEther('1'))).to.be.eq(ethers.parseEther('1'));
    expect(await proxy.calculatePureTokensAmount(1)).to.be.eq(1);
    await proxy.setPureTokensRate(ethers.parseEther('0.1'));
    expect(await proxy.calculatePureTokensAmount(ethers.parseEther('1'))).to.be.eq(ethers.parseEther('0.1'));
    expect(await proxy.calculatePureTokensAmount(10)).to.be.eq(1);
    expect(await proxy.calculatePureTokensAmount(ethers.parseEther('1.12345'))).to.be.eq(ethers.parseEther('0.112345'));
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
          proxy.connect(signers.otherUser3).claim(false, ethers.parseEther('200.1'), false, 0, getProof(signers.otherUser3.address, tree)),
        ).to.be.revertedWith(ERRORS.ERC20.InsufficientBalance);
      });
      it('user provide invalid proof', async () => {
        await expect(
          proxy.connect(signers.otherUser1).claim(false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser2.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'InvalidProof');
      });
      it('during paused state', async () => {
        await proxy.pause();
        await expect(
          proxy.connect(signers.otherUser1).claim(false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWith(ERRORS.Pausable.Paused);
      });
      it('claim amount is zero (after success claim)', async () => {
        await proxy
          .connect(signers.otherUser1)
          .claim(false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(
          proxy.connect(signers.otherUser1).claim(false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree)),
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

      it('success claim in veNft tokens with permanent and not permanent lock', async () => {
        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('100.1')],
            [signers.otherUser2.address, 1],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();
        let claimAmount = ethers.parseEther('100.1');

        let tx = await proxy.connect(signers.otherUser1).claim(false, claimAmount, false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(signers.otherUser1.address, claimAmount, 0, claimAmount, 1);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, claimAmount);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200') - claimAmount);
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(claimAmount);
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(claimAmount);
        expect(await votingEscrow.supply()).to.be.eq(claimAmount);
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('200')],
            [signers.otherUser2.address, 1],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        let newClaimedAmount = ethers.parseEther('200') - claimAmount;
        tx = await proxy
          .connect(signers.otherUser1)
          .claim(false, ethers.parseEther('200'), true, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(signers.otherUser1.address, newClaimedAmount, 0, newClaimedAmount, 2);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, newClaimedAmount);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200') - newClaimedAmount - claimAmount);
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('200'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(newClaimedAmount + claimAmount);
        expect(await votingEscrow.supply()).to.be.eq(newClaimedAmount + claimAmount);
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(newClaimedAmount);
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(2);

        let nftState = await votingEscrow.nftStates(1);
        expect(nftState.locked.isPermanentLocked).to.be.false;
        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('100.1'));
        expect(nftState.isAttached).to.be.false;
        expect(nftState.isVoted).to.be.false;

        nftState = await votingEscrow.nftStates(2);
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('99.9'));
        expect(nftState.isAttached).to.be.false;
        expect(nftState.isVoted).to.be.false;
      });

      it('success claim in pure and veNft tokens', async () => {
        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('100.1')],
            [signers.otherUser2.address, 1],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();
        expect(await proxy.pureTokensRate()).to.be.eq(TO_PURE_TOKESN_RATE);
        let claimAmount = ethers.parseEther('100.1');
        let expectedOutAmount = ethers.parseEther('25.02500');
        expect(await proxy.calculatePureTokensAmount(claimAmount)).to.be.eq(expectedOutAmount);

        let tx = await proxy.connect(signers.otherUser1).claim(true, claimAmount, false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(signers.otherUser1.address, claimAmount, expectedOutAmount, 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, expectedOutAmount);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(expectedOutAmount);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200') - expectedOutAmount);
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(claimAmount);
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(0);
        expect(await votingEscrow.supply()).to.be.eq(0);
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(0);

        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('202.2')],
            [signers.otherUser2.address, 1],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        expect(await proxy.calculatePureTokensAmount(claimAmount)).to.be.eq(expectedOutAmount);

        let newClaimedAmount = ethers.parseEther('202.2') - claimAmount;
        tx = await proxy
          .connect(signers.otherUser1)
          .claim(false, ethers.parseEther('202.2'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx).to.be.emit(proxy, 'Claim').withArgs(signers.otherUser1.address, newClaimedAmount, 0, newClaimedAmount, 1);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, newClaimedAmount);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(expectedOutAmount);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('200') - newClaimedAmount - expectedOutAmount);
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('202.2'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(newClaimedAmount);
        expect(await votingEscrow.supply()).to.be.eq(newClaimedAmount);
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
      });

      it('test', async () => {
        let tx = await proxy
          .connect(signers.otherUser1)
          .claim(false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('100'), 0, ethers.parseEther('100'), 1);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('100'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        await expect(
          proxy.connect(signers.otherUser1).claim(false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        tx = await proxy
          .connect(signers.otherUser2)
          .claim(true, ethers.parseEther('50.5'), false, 0, getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('50.5'), ethers.parseEther('12.62500'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser2.address, ethers.parseEther('12.62500'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('12.62500'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('87.37500'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('50.5'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(0);

        await expect(
          proxy.connect(signers.otherUser1).claim(true, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
        await expect(
          proxy.connect(signers.otherUser2).claim(false, ethers.parseEther('50.5'), false, 0, getProof(signers.otherUser2.address, tree)),
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
          .connect(signers.otherUser1)
          .claim(true, ethers.parseEther('101'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('0.25'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('0.25'));

        tx = await proxy
          .connect(signers.otherUser2)
          .claim(false, ethers.parseEther('51'), false, 0, getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('0.5'), 0, ethers.parseEther('0.5'), 2);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('0.5'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('0.25'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('12.62500'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('86.62500'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('101'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100.5'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100.5'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        await proxy.pause();

        await proxy.setPureTokensRate(ethers.parseEther('1'));
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
          .connect(signers.otherUser1)
          .claim(true, ethers.parseEther('102'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('1'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('1'));

        tx = await proxy
          .connect(signers.otherUser3)
          .claim(true, ethers.parseEther('10'), false, 0, getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), ethers.parseEther('10'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser3.address, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1.25'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('12.62500'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('75.62500'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('102'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100.5'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100.5'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        await proxy.pause();

        await proxy.setPureTokensRate(ethers.parseEther('0.5'));
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
          .connect(signers.otherUser3)
          .claim(true, ethers.parseEther('20'), false, 0, getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), ethers.parseEther('5'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser3.address, ethers.parseEther('5'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1.25'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('12.62500'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('15'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('70.62500'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('102'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('51'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('20'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100.5'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100.5'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
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
          [signers.otherUser2.address, ethers.parseEther('50')],
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
        proxy.connect(signers.otherUser3).claimFor(user, false, ethers.parseEther('100'), false, 0, getProof(user, tree)),
      ).to.be.revertedWithCustomError(proxy, 'NotAllowedClaimOperator');
    });

    it('success call for the himself', async () => {
      await expect(
        proxy
          .connect(signers.otherUser1)
          .claimFor(signers.otherUser1, false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree)),
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
        await proxy.pause();
        await proxy.setPureTokensRate(ethers.parseEther('0.1'));
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('100')],
            [signers.otherUser2.address, ethers.parseEther('50')],
            [signers.otherUser3.address, ethers.parseEther('200.1')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        let tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser1.address, false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('100'), 0, ethers.parseEther('100'), 1);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('100'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        await expect(
          proxy
            .connect(operator)
            .claimFor(signers.otherUser1.address, false, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser2.address, true, ethers.parseEther('50'), false, 0, getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('50'), ethers.parseEther('5'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser2.address, ethers.parseEther('5'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('5'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('95'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('50'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('100'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(1);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);

        await expect(
          proxy
            .connect(operator)
            .claimFor(signers.otherUser1.address, true, ethers.parseEther('100'), false, 0, getProof(signers.otherUser1.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');
        await expect(
          proxy
            .connect(operator)
            .claimFor(signers.otherUser2.address, true, ethers.parseEther('50'), false, 0, getProof(signers.otherUser2.address, tree)),
        ).to.be.revertedWithCustomError(proxy, 'ZeroAmount');

        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('110')],
            [signers.otherUser2.address, ethers.parseEther('60')],
            [signers.otherUser3.address, ethers.parseEther('200.1')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser1.address, true, ethers.parseEther('110'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('10'), ethers.parseEther('1'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('1'));

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser2.address, false, ethers.parseEther('60'), false, 0, getProof(signers.otherUser2.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser2.address, ethers.parseEther('10'), 0, ethers.parseEther('10'), 2);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('5'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('84'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('110'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(0);
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('110'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('110'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        await proxy.pause();

        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('111')],
            [signers.otherUser2.address, ethers.parseEther('60')],
            [signers.otherUser3.address, ethers.parseEther('10')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.setPureTokensRate(ethers.parseEther('1'));

        await proxy.unpause();

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser1.address, true, ethers.parseEther('111'), false, 0, getProof(signers.otherUser1.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('1'), ethers.parseEther('1'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser1.address, ethers.parseEther('1'));

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser3.address, true, ethers.parseEther('10'), false, 0, getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), ethers.parseEther('10'), 0, 0);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, signers.otherUser3.address, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('2'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('5'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('73'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('111'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('110'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('110'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(2);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);

        await proxy.pause();

        await proxy.setPureTokensRate(ethers.parseEther('0'));
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('112')],
            [signers.otherUser2.address, ethers.parseEther('61')],
            [signers.otherUser3.address, ethers.parseEther('20')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        await expect(
          proxy
            .connect(operator)
            .claimFor(signers.otherUser3.address, true, ethers.parseEther('20'), false, 0, getProof(signers.otherUser3.address, tree)),
        ).revertedWithCustomError(proxy, 'ZeroPureTokensRate');
        await expect(
          proxy
            .connect(signers.otherUser3)
            .claimFor(signers.otherUser3.address, true, ethers.parseEther('20'), false, 0, getProof(signers.otherUser3.address, tree)),
        ).revertedWithCustomError(proxy, 'ZeroPureTokensRate');

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser3.address, false, ethers.parseEther('20'), false, 0, getProof(signers.otherUser3.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser3.address, ethers.parseEther('10'), 0, ethers.parseEther('10'), 3);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('10'));

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('2'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('5'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(proxy.target)).to.be.eq(ethers.parseEther('63'));
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('111'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('20'));
        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('120'));
        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('120'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(3);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser3.address);
        expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);

        let strategy = await newStrategy();
        await managedNFTManager.createManagedNFT(strategy);
        let managedTokenId = await votingEscrow.lastMintedTokenId();
        let user4TokenId = (await votingEscrow.lastMintedTokenId()) + 1n;
        let user5TokenId = (await votingEscrow.lastMintedTokenId()) + 2n;

        await proxy.pause();
        tree = StandardMerkleTree.of(
          [
            [user, ethers.parseEther('112')],
            [signers.otherUser2.address, ethers.parseEther('61')],
            [signers.otherUser3.address, ethers.parseEther('20')],
            [signers.otherUser4.address, ethers.parseEther('100')],
            [signers.otherUser5.address, ethers.parseEther('200')],
          ],
          ['address', 'uint256'],
        );
        await proxy.setMerklRoot(tree.root);
        await proxy.unpause();

        await fenix.transfer(proxy.target, ethers.parseEther('237'));

        tx = await proxy
          .connect(operator)
          .claimFor(signers.otherUser4.address, false, ethers.parseEther('100'), true, 0, getProof(signers.otherUser4.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser4.address, ethers.parseEther('100'), 0, ethers.parseEther('100'), user4TokenId);
        await expect(tx).to.be.emit(deployed.votingEscrow, 'LockPermanent').withArgs(proxy.target, user4TokenId);
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(proxy.target, votingEscrow.target, ethers.parseEther('100'));

        tx = await proxy
          .connect(signers.otherUser5)
          .claim(false, ethers.parseEther('200'), false, managedTokenId, getProof(signers.otherUser5.address, tree));
        await expect(tx)
          .to.be.emit(proxy, 'Claim')
          .withArgs(signers.otherUser5.address, ethers.parseEther('200'), 0, ethers.parseEther('200'), user5TokenId);
        await expect(tx).to.be.emit(deployed.voter, 'AttachToManagedNFT').withArgs(user5TokenId, managedTokenId);

        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('2'));
        expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('5'));
        expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('10'));
        expect(await fenix.balanceOf(signers.otherUser4.address)).to.be.eq(0);
        expect(await fenix.balanceOf(signers.otherUser5.address)).to.be.eq(0);

        expect(await fenix.balanceOf(proxy.target)).to.be.eq(0);
        expect(await proxy.userClaimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('111'));
        expect(await proxy.userClaimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
        expect(await proxy.userClaimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('20'));
        expect(await proxy.userClaimed(signers.otherUser4.address)).to.be.eq(ethers.parseEther('100'));
        expect(await proxy.userClaimed(signers.otherUser5.address)).to.be.eq(ethers.parseEther('200'));

        expect(await fenix.balanceOf(votingEscrow.target)).to.be.eq(ethers.parseEther('420'));
        expect(await votingEscrow.permanentTotalSupply()).to.be.eq(ethers.parseEther('300'));

        expect(await votingEscrow.supply()).to.be.eq(ethers.parseEther('420'));
        expect(await votingEscrow.lastMintedTokenId()).to.be.eq(user5TokenId);
        expect(await votingEscrow.ownerOf(1)).to.be.eq(signers.otherUser1.address);
        expect(await votingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(2)).to.be.eq(signers.otherUser2.address);
        expect(await votingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(3)).to.be.eq(signers.otherUser3.address);
        expect(await votingEscrow.balanceOf(signers.otherUser3.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(user4TokenId)).to.be.eq(signers.otherUser4.address);
        expect(await votingEscrow.balanceOf(signers.otherUser4.address)).to.be.eq(1);
        expect(await votingEscrow.ownerOf(user5TokenId)).to.be.eq(signers.otherUser5.address);
        expect(await votingEscrow.balanceOf(signers.otherUser5.address)).to.be.eq(1);

        let nftState = await deployed.votingEscrow.nftStates(managedTokenId);
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('200'));
        expect(nftState.isAttached).to.be.false;
        expect(nftState.isVoted).to.be.false;

        nftState = await deployed.votingEscrow.nftStates(user4TokenId);
        expect(nftState.locked.isPermanentLocked).to.be.true;
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(ethers.parseEther('100'));
        expect(nftState.isAttached).to.be.false;
        expect(nftState.isVoted).to.be.false;

        nftState = await deployed.votingEscrow.nftStates(user5TokenId);
        expect(nftState.locked.isPermanentLocked).to.be.false;
        expect(nftState.locked.end).to.be.eq(0);
        expect(nftState.locked.amount).to.be.eq(0);
        expect(nftState.isAttached).to.be.true;
        expect(nftState.isVoted).to.be.false;

        expect(await managedNFTManager.getAttachedManagedTokenId(user5TokenId)).to.be.eq(managedTokenId);
      });
    });
  });
});

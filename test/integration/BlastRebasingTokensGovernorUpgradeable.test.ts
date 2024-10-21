import { AlgebraFactoryUpgradeable, AlgebraPool, BlastMock } from '@cryptoalgebra/integral-core/typechain';
import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, setCode, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  BlastGovernorMock,
  BlastMock__factory,
  BlastRebasingTokensGovernorUpgradeable,
  ERC20Mock,
  ERC20RebasingMock,
  Pair,
} from '../../typechain-types';
import { ERRORS, getAccessControlError } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, deployAlgebraCore, deployERC20MockToken, mockBlast } from '../utils/coreFixture';
import { deployERC20Mock } from '../../scripts/utils';
import { ContractTransactionResponse, Signature } from 'ethers';
import { NonfungiblePositionManager, SwapRouter } from '@cryptoalgebra/integral-periphery/typechain';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';

describe('BlastGovernorClaimableSetup Contract', function () {
  let deployer: HardhatEthersSigner;
  let proxyAdmin: HardhatEthersSigner;
  let blastGovernor: HardhatEthersSigner;
  let other: HardhatEthersSigner;
  let BlastRebasingTokensGovernor_Proxy: BlastRebasingTokensGovernorUpgradeable;
  let BlastRebasingTokensGovernor_Implementation: BlastRebasingTokensGovernorUpgradeable;
  let USDB: ERC20RebasingMock;
  let WETH: ERC20RebasingMock;
  let holder_1: Pair;
  let holder_2: Pair;
  let coreDeployed: CoreFixtureDeployed;
  let algebraFactory: AlgebraFactoryUpgradeable;
  let WETH_FENIX_POOL: AlgebraPool;
  let USDB_FENIX_POOL: AlgebraPool;
  let swapRouter: SwapRouter;
  let manager: NonfungiblePositionManager;

  async function newInstance() {
    let proxy = await ethers.deployContract('TransparentUpgradeableProxy', [
      BlastRebasingTokensGovernor_Implementation.target,
      proxyAdmin.address,
      '0x',
    ]);
    await proxy.waitForDeployment();
    let instance = await ethers.getContractAt('BlastRebasingTokensGovernorUpgradeable', proxy.target);
    return instance;
  }

  beforeEach(async function () {
    await mockBlast();
    coreDeployed = await loadFixture(completeFixture);
    [deployer, proxyAdmin, blastGovernor, other] = await ethers.getSigners();

    BlastRebasingTokensGovernor_Implementation = await ethers.deployContract('BlastRebasingTokensGovernorUpgradeable', [
      blastGovernor.address,
    ]);
    await BlastRebasingTokensGovernor_Implementation.waitForDeployment();

    BlastRebasingTokensGovernor_Proxy = await newInstance();

    await BlastRebasingTokensGovernor_Proxy.initialize(blastGovernor.address);
    await BlastRebasingTokensGovernor_Proxy.grantRole(await BlastRebasingTokensGovernor_Proxy.TOKEN_HOLDER_ADDER_ROLE(), deployer.address);
    await BlastRebasingTokensGovernor_Proxy.grantRole(await BlastRebasingTokensGovernor_Proxy.TOKEN_WITHDRAWER_ROLE(), deployer.address);

    USDB = await ethers.deployContract('ERC20RebasingMock', ['USDB', 'USDB', 6]);
    WETH = await ethers.deployContract('ERC20RebasingMock', ['WETH', 'WETH', 18]);

    await coreDeployed.v2PairFactory.createPair(USDB.target, WETH.target, false);
    await coreDeployed.v2PairFactory.createPair(USDB.target, WETH.target, true);

    holder_1 = await ethers.getContractAt('Pair', await coreDeployed.v2PairFactory.getPair(USDB.target, WETH.target, false));
    holder_2 = await ethers.getContractAt('Pair', await coreDeployed.v2PairFactory.getPair(USDB.target, WETH.target, true));

    await coreDeployed.v2PairFactory.grantRole(
      await coreDeployed.v2PairFactory.PAIRS_ADMINISTRATOR_ROLE(),
      BlastRebasingTokensGovernor_Proxy.target,
    );

    let algebraCore = await deployAlgebraCore(await coreDeployed.blastPoints.getAddress());

    algebraFactory = algebraCore.factory;
    await algebraFactory.grantRole(await algebraFactory.POOLS_CREATOR_ROLE(), deployer.address);

    let deployedPoolAddr = await algebraFactory.createPool.staticCall(WETH.target, coreDeployed.fenix.target);
    await algebraFactory.createPool(WETH.target, coreDeployed.fenix.target);

    WETH_FENIX_POOL = (await ethers.getContractAt(POOL_ABI, deployedPoolAddr)) as any as AlgebraPool;

    deployedPoolAddr = await algebraFactory.createPool.staticCall(USDB.target, coreDeployed.fenix.target);
    await algebraFactory.createPool(USDB.target, coreDeployed.fenix.target);

    USDB_FENIX_POOL = (await ethers.getContractAt(POOL_ABI, deployedPoolAddr)) as any as AlgebraPool;

    swapRouter = algebraCore.router;

    manager = algebraCore.manager;
  });

  describe('deployment', async () => {
    it('fail if try initialzie on implementation', async () => {
      await expect(BlastRebasingTokensGovernor_Implementation.initialize(blastGovernor.address)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('fail if try initialzie on proxy second time', async () => {
      await expect(BlastRebasingTokensGovernor_Proxy.initialize(blastGovernor.address)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });

    describe('initial state', async () => {
      it('deployer should have DEFAULT_ADMIN_ROLE', async () => {
        expect(await BlastRebasingTokensGovernor_Proxy.hasRole(ethers.ZeroHash, deployer.address)).to.be.true;
      });
    });
  });

  describe('Register token holder', async () => {
    it('isRegisteredTokenHolder() should return false, if not register like holder for token', async () => {
      expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(USDB.target, holder_1.target)).to.be.false;
      expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(WETH.target, holder_1.target)).to.be.false;
      expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(USDB.target, holder_2.target)).to.be.false;
      expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(WETH.target, holder_2.target)).to.be.false;
    });

    it('listRebasingTokenHolders() should return empty list, if not preset registered holders for tokens', async () => {
      expect(await BlastRebasingTokensGovernor_Proxy.listRebasingTokenHolders(USDB.target, 0, 100)).to.be.deep.eq([]);
      expect(await BlastRebasingTokensGovernor_Proxy.listRebasingTokenHolders(WETH.target, 0, 100)).to.be.deep.eq([]);
    });

    it('setup CLAIMABLE mode if not configure before', async () => {
      expect(await WETH.getConfiguration(holder_1.target)).to.be.eq(0);
      await BlastRebasingTokensGovernor_Proxy.addTokenHolder(WETH.target, holder_1.target);
      expect(await WETH.getConfiguration(holder_1.target)).to.be.eq(2);
    });

    describe('success register holder_1 for WETH', async () => {
      let tx: ContractTransactionResponse;
      beforeEach(async () => {
        tx = await BlastRebasingTokensGovernor_Proxy.addTokenHolder(WETH.target, holder_1.target);
      });

      it('emit event', async () => {
        await expect(tx).to.be.emit(BlastRebasingTokensGovernor_Proxy, 'AddRebasingTokenHolder').withArgs(WETH.target, holder_1.target);
      });

      it('isRegisteredTokenHolder() should return true for holder_1 with WETH', async () => {
        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(USDB.target, holder_1.target)).to.be.false;
        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(WETH.target, holder_1.target)).to.be.true;
        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(USDB.target, holder_2.target)).to.be.false;
        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(WETH.target, holder_2.target)).to.be.false;
      });

      it('listRebasingTokenHolders() should return list with singl element', async () => {
        expect(await BlastRebasingTokensGovernor_Proxy.listRebasingTokenHolders(USDB.target, 0, 100)).to.be.deep.eq([]);
        expect(await BlastRebasingTokensGovernor_Proxy.listRebasingTokenHolders(WETH.target, 0, 100)).to.be.deep.eq([holder_1.target]);
      });
    });
  });

  describe('Access restricted methods', async () => {
    describe('#addTokenHolder', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_HOLDER_ADDER_ROLE', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.connect(other).addTokenHolder(WETH.target, holder_1.target)).to.be.revertedWith(
            getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_HOLDER_ADDER_ROLE(), other.address),
          );
        });
        it('token holder already registry', async () => {
          await BlastRebasingTokensGovernor_Proxy.addTokenHolder(WETH.target, holder_1.target);
          await expect(BlastRebasingTokensGovernor_Proxy.addTokenHolder(WETH.target, holder_1.target)).to.be.revertedWithCustomError(
            BlastRebasingTokensGovernor_Proxy,
            'AlreadyRegistered',
          );
        });
        it('token is zero address', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.addTokenHolder(ethers.ZeroAddress, holder_1.target)).to.be.revertedWithCustomError(
            BlastRebasingTokensGovernor_Proxy,
            'AddressZero',
          );
        });
        it('holder is zero address', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.addTokenHolder(WETH.target, ethers.ZeroAddress)).to.be.revertedWithCustomError(
            BlastRebasingTokensGovernor_Proxy,
            'AddressZero',
          );
        });
      });

      it('success added token holders', async () => {
        await expect(BlastRebasingTokensGovernor_Proxy.addTokenHolder(WETH.target, holder_1.target))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'AddRebasingTokenHolder')
          .withArgs(WETH.target, holder_1.target);
        await expect(BlastRebasingTokensGovernor_Proxy.addTokenHolder(WETH.target, holder_2.target))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'AddRebasingTokenHolder')
          .withArgs(WETH.target, holder_2.target);
        await expect(BlastRebasingTokensGovernor_Proxy.addTokenHolder(USDB.target, holder_1.target))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'AddRebasingTokenHolder')
          .withArgs(USDB.target, holder_1.target);

        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(USDB.target, holder_1.target)).to.be.true;
        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(WETH.target, holder_1.target)).to.be.true;
        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(WETH.target, holder_2.target)).to.be.true;

        expect(await BlastRebasingTokensGovernor_Proxy.isRegisteredTokenHolder(USDB.target, holder_2.target)).to.be.false;

        expect(await BlastRebasingTokensGovernor_Proxy.listRebasingTokenHolders(USDB.target, 0, 100)).to.be.deep.eq([holder_1.target]);
        expect(await BlastRebasingTokensGovernor_Proxy.listRebasingTokenHolders(WETH.target, 0, 100)).to.be.deep.eq([
          holder_1.target,
          holder_2.target,
        ]);
        expect(await BlastRebasingTokensGovernor_Proxy.listRebasingTokenHolders(WETH.target, 0, 1)).to.be.deep.eq([holder_1.target]);
      });
    });

    describe('#directV3Swap', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_WITHDRAWER_ROLE', async () => {
          await expect(
            BlastRebasingTokensGovernor_Proxy.connect(other).directV3Swap(WETH.target, other.address, 1, 1, 1, 0),
          ).to.be.revertedWith(getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_WITHDRAWER_ROLE(), other.address));
        });

        it('swapTargetTokenCache not setup', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', swapRouter.target);

          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([ethers.ZeroAddress, swapRouter.target]);
          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(WETH.target, other.address, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'AddressNotSetupForSupportSwap');
        });

        it('swap Router not setup', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', coreDeployed.fenix.target);

          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([coreDeployed.fenix.target, ethers.ZeroAddress]);
          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(WETH.target, other.address, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'AddressNotSetupForSupportSwap');
        });

        it('input token_ and swap target token the same', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', swapRouter.target);
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', WETH.target);
          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(WETH.target, other.address, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'InvalidSwapSourceToken');
        });
      });

      describe('success swap to target swap token and transfer to recipient', async () => {
        beforeEach(async () => {
          let fenix = coreDeployed.fenix;
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', fenix.target);
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', swapRouter.target);

          await WETH_FENIX_POOL.initialize(encodePriceSqrt(1, 1));

          await WETH.mint(deployer.address, ethers.parseEther('1000000'));
          await fenix.approve(manager.target, ethers.parseEther('100000'));
          await WETH.approve(manager.target, ethers.parseEther('100000'));

          let token0 = fenix.target;
          let token1 = WETH.target;
          if (token0 > token1) {
            token0 = WETH.target;
            token1 = fenix.target;
          }

          await manager.mint({
            amount0Min: 1,
            amount1Min: 1,
            amount0Desired: ethers.parseEther('10000'),
            amount1Desired: ethers.parseEther('10000'),
            tickLower: -60,
            tickUpper: 60,
            deadline: (await time.latest()) + 100,
            token0: token0,
            token1: token1,
            recipient: deployer.address,
          });
          await WETH.mint(BlastRebasingTokensGovernor_Proxy.target, ethers.parseEther('2'));
          await USDB.mint(BlastRebasingTokensGovernor_Proxy.target, 1e6);
        });

        it('state before', async () => {
          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('2'));
          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(1e6);
          expect(await coreDeployed.fenix.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);
        });

        it('success swap 50% WETH and emit events', async () => {
          let tx = await BlastRebasingTokensGovernor_Proxy.directV3Swap(
            WETH.target,
            BlastRebasingTokensGovernor_Proxy.target,
            ethers.parseEther('1'),
            ethers.parseEther('0.99'),
            0,
            (await time.latest()) + 100,
          );
          let fenixOutputAmount = await coreDeployed.fenix.balanceOf(BlastRebasingTokensGovernor_Proxy.target);
          expect(fenixOutputAmount).to.be.closeTo(ethers.parseEther('1'), ethers.parseEther('0.01'));

          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('1'));
          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(1e6);

          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'DirectV3Swap')
            .withArgs(
              deployer.address,
              BlastRebasingTokensGovernor_Proxy.target,
              WETH.target,
              coreDeployed.fenix.target,
              ethers.parseEther('1'),
              fenixOutputAmount,
            );
        });
        it('success swap 100% WETH and emit events', async () => {
          let tx = await BlastRebasingTokensGovernor_Proxy.directV3Swap(
            WETH.target,
            other.address,
            ethers.parseEther('2'),
            ethers.parseEther('0.99'),
            0,
            (await time.latest()) + 100,
          );
          let fenixOutputAmount = await coreDeployed.fenix.balanceOf(other.address);
          expect(fenixOutputAmount).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.01'));

          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);
          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(1e6);
          expect(await coreDeployed.fenix.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);

          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'DirectV3Swap')
            .withArgs(deployer.address, other.address, WETH.target, coreDeployed.fenix.target, ethers.parseEther('2'), fenixOutputAmount);
        });
      });
    });

    describe('#withdraw', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_WITHDRAWER_ROLE', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.connect(other).withdraw(WETH.target, other.address, 1)).to.be.revertedWith(
            getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_WITHDRAWER_ROLE(), other.address),
          );
        });
      });

      describe('success withdraw erc20 tokens from contract', async () => {
        beforeEach(async () => {
          await USDB.mint(BlastRebasingTokensGovernor_Proxy.target, 10e6);
          await WETH.mint(BlastRebasingTokensGovernor_Proxy.target, ethers.parseEther('10'));
          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(10e6);
          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('10'));
          expect(await USDB.balanceOf(deployer.address)).to.be.eq(0);
          expect(await WETH.balanceOf(deployer.address)).to.be.eq(0);
        });

        it('usdb to the caller', async () => {
          let tx = await BlastRebasingTokensGovernor_Proxy.withdraw(USDB.target, deployer.address, 1e6);
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, deployer.address, USDB.target, 1e6);
          await expect(tx).to.be.emit(USDB, 'Transfer').withArgs(BlastRebasingTokensGovernor_Proxy.target, deployer.address, 1e6);

          tx = await BlastRebasingTokensGovernor_Proxy.withdraw(USDB.target, deployer.address, 2e6);
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, deployer.address, USDB.target, 2e6);
          await expect(tx).to.be.emit(USDB, 'Transfer').withArgs(BlastRebasingTokensGovernor_Proxy.target, deployer.address, 2e6);

          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(7e6);
          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('10'));
          expect(await USDB.balanceOf(deployer.address)).to.be.eq(3e6);
          expect(await WETH.balanceOf(deployer.address)).to.be.eq(0);
        });

        it('weth to the other recipient', async () => {
          let tx = await BlastRebasingTokensGovernor_Proxy.withdraw(WETH.target, other.address, ethers.parseEther('1'));
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, other.address, WETH.target, ethers.parseEther('1'));
          await expect(tx)
            .to.be.emit(WETH, 'Transfer')
            .withArgs(BlastRebasingTokensGovernor_Proxy.target, other.address, ethers.parseEther('1'));

          tx = await BlastRebasingTokensGovernor_Proxy.withdraw(WETH.target, other.address, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, other.address, WETH.target, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(WETH, 'Transfer')
            .withArgs(BlastRebasingTokensGovernor_Proxy.target, other.address, ethers.parseEther('2'));

          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(10e6);
          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('7'));
          expect(await USDB.balanceOf(deployer.address)).to.be.eq(0);
          expect(await WETH.balanceOf(deployer.address)).to.be.eq(0);
          expect(await WETH.balanceOf(other.address)).to.be.eq(ethers.parseEther('3'));
        });
      });
    });

    describe('#claimFromSpecifiedTokenHolders', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_WITHDRAWER_ROLE', async () => {
          await expect(
            BlastRebasingTokensGovernor_Proxy.connect(other).claimFromSpecifiedTokenHolders(WETH.target, other.address, []),
          ).to.be.revertedWith(getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_WITHDRAWER_ROLE(), other.address));
        });
      });

      it('success empty call without specifice holder', async () => {
        await expect(BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(WETH.target, other.address, []))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
          .withArgs(deployer.address, other.address, WETH.target, [], 0);
      });
    });

    describe('#claim', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_WITHDRAWER_ROLE', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.connect(other).claim(WETH.target, other.address, 0, 100)).to.be.revertedWith(
            getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_WITHDRAWER_ROLE(), other.address),
          );
        });
      });
      it('success empty call with zero size to call', async () => {
        await expect(BlastRebasingTokensGovernor_Proxy.claim(WETH.target, other.address, 0, 0))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
          .withArgs(deployer.address, other.address, WETH.target, [], 0);
      });
    });

    describe('#updateAddress', async () => {
      describe('should fail if', async () => {
        it('call from not DEFAULT_ADMIN_ROLE', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.connect(other).updateAddress('swapRouter', ethers.ZeroAddress)).to.be.revertedWith(
            getAccessControlError(ethers.ZeroHash, other.address),
          );
        });
        it('call with invalid key', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.updateAddress('1', ethers.ZeroAddress)).to.be.revertedWithCustomError(
            BlastRebasingTokensGovernor_Proxy,
            'InvalidAddressKey',
          );
        });
      });

      describe('success update and emit event', async () => {
        const TEST_ADDRESS = '0x1000000000000000000000000000000000000001';
        const TEST_ADDRESS_2 = '0x1000000000000000000000000000000000000002';

        beforeEach(async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', ethers.ZeroAddress);
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', ethers.ZeroAddress);

          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([ethers.ZeroAddress, ethers.ZeroAddress]);
        });

        it('swapRouter', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', TEST_ADDRESS))
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateAddress')
            .withArgs('swapRouter', TEST_ADDRESS);
          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([ethers.ZeroAddress, TEST_ADDRESS]);
        });

        it('swapTargetToken', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', TEST_ADDRESS_2))
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateAddress')
            .withArgs('swapTargetToken', TEST_ADDRESS_2);
          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([TEST_ADDRESS_2, ethers.ZeroAddress]);
        });

        it('both', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', TEST_ADDRESS_2))
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateAddress')
            .withArgs('swapTargetToken', TEST_ADDRESS_2);
          await expect(BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', TEST_ADDRESS))
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateAddress')
            .withArgs('swapRouter', TEST_ADDRESS);
          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([TEST_ADDRESS_2, TEST_ADDRESS]);
        });
      });
    });
  });
});

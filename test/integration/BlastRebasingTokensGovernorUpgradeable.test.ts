import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { AlgebraFactoryUpgradeable, AlgebraPool } from '@cryptoalgebra/integral-core/typechain';

import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { NonfungiblePositionManager, SwapRouter } from '@cryptoalgebra/integral-periphery/typechain';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ContractTransactionResponse, Signature } from 'ethers';
import { ethers } from 'hardhat';
import { BlastRebasingTokensGovernorUpgradeable, ERC20RebasingMock, Pair } from '../../typechain-types';
import { YieldDistributionDirection } from '../../utils/Constants';
import { ERRORS, getAccessControlError } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, deployAlgebraCore, mockBlast } from '../utils/coreFixture';

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

  async function getNewHolder() {
    let holder = await ethers.deployContract('MockRebasingHolder');
    await holder.waitForDeployment();
    return holder;
  }
  async function shouldBeAllZero(direction: number) {
    let bribesDirectionInfo = await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(direction);
    expect(bribesDirectionInfo.distributionPercentage).to.be.eq(0);

    expect(bribesDirectionInfo.isAvailableToSwapToTargetTokens).to.be.false;
    let info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(direction, WETH.target);
    expect(info.totalAccumulated).to.be.eq(0);
    expect(info.available).to.be.eq(0);
    info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(direction, USDB.target);
    expect(info.totalAccumulated).to.be.eq(0);
    expect(info.available).to.be.eq(0);

    info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(direction, coreDeployed.fenix.target);
    expect(info.totalAccumulated).to.be.eq(0);
    expect(info.available).to.be.eq(0);
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
    await BlastRebasingTokensGovernor_Proxy.grantRole(await BlastRebasingTokensGovernor_Proxy.TOKEN_CLAIMER_ROLE(), deployer.address);
    await BlastRebasingTokensGovernor_Proxy.grantRole(await BlastRebasingTokensGovernor_Proxy.TOKEN_SWAPER_ROLE(), deployer.address);

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

      it('directions inital state', async () => {
        await shouldBeAllZero(YieldDistributionDirection.Bribes);
        await shouldBeAllZero(YieldDistributionDirection.Others);
        await shouldBeAllZero(YieldDistributionDirection.Incentives);
        await shouldBeAllZero(YieldDistributionDirection.Rise);
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
  describe('#getYieldDirectionsInfo', async () => {
    it('getYieldDirectionsInfo should return correct data without specife tokens address', async () => {
      let data = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionsInfo([]);

      expect(data).to.be.length(4);

      expect(data[0].direction).to.be.eq(YieldDistributionDirection.Others);
      expect(data[0].distributionPercentage).to.be.eq(0);
      expect(data[0].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[0].tokensInfo).to.be.length(0);

      expect(data[1].direction).to.be.eq(YieldDistributionDirection.Incentives);
      expect(data[1].distributionPercentage).to.be.eq(0);
      expect(data[1].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[1].tokensInfo).to.be.length(0);

      expect(data[2].direction).to.be.eq(YieldDistributionDirection.Rise);
      expect(data[2].distributionPercentage).to.be.eq(0);
      expect(data[2].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[2].tokensInfo).to.be.length(0);

      expect(data[3].direction).to.be.eq(YieldDistributionDirection.Bribes);
      expect(data[3].distributionPercentage).to.be.eq(0);
      expect(data[3].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[3].tokensInfo).to.be.length(0);
    });

    it('getYieldDirectionsInfo should return correct data with specife tokens address', async () => {
      let data = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionsInfo([WETH.target, USDB.target]);

      expect(data).to.be.length(4);

      expect(data[0].direction).to.be.eq(YieldDistributionDirection.Others);
      expect(data[0].distributionPercentage).to.be.eq(0);
      expect(data[0].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[0].tokensInfo).to.be.length(2);
      expect(data[0].tokensInfo[0].totalAccumulated).to.be.eq(0);
      expect(data[0].tokensInfo[0].available).to.be.eq(0);
      expect(data[0].tokensInfo[1].totalAccumulated).to.be.eq(0);
      expect(data[0].tokensInfo[1].available).to.be.eq(0);
      expect(data[0].tokensInfo[0].token).to.be.eq(WETH.target);
      expect(data[0].tokensInfo[1].token).to.be.eq(USDB.target);

      expect(data[1].direction).to.be.eq(YieldDistributionDirection.Incentives);
      expect(data[1].distributionPercentage).to.be.eq(0);
      expect(data[1].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[1].tokensInfo).to.be.length(2);
      expect(data[1].tokensInfo[0].totalAccumulated).to.be.eq(0);
      expect(data[1].tokensInfo[0].available).to.be.eq(0);
      expect(data[1].tokensInfo[1].totalAccumulated).to.be.eq(0);
      expect(data[1].tokensInfo[1].available).to.be.eq(0);
      expect(data[1].tokensInfo[1].token).to.be.eq(USDB.target);
      expect(data[1].tokensInfo[0].token).to.be.eq(WETH.target);

      expect(data[2].direction).to.be.eq(YieldDistributionDirection.Rise);
      expect(data[2].distributionPercentage).to.be.eq(0);
      expect(data[2].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[2].tokensInfo).to.be.length(2);
      expect(data[2].tokensInfo[0].totalAccumulated).to.be.eq(0);
      expect(data[2].tokensInfo[0].available).to.be.eq(0);
      expect(data[2].tokensInfo[1].totalAccumulated).to.be.eq(0);
      expect(data[2].tokensInfo[1].available).to.be.eq(0);
      expect(data[2].tokensInfo[1].token).to.be.eq(USDB.target);
      expect(data[2].tokensInfo[0].token).to.be.eq(WETH.target);

      expect(data[3].direction).to.be.eq(YieldDistributionDirection.Bribes);
      expect(data[3].distributionPercentage).to.be.eq(0);
      expect(data[3].isAvailableToSwapToTargetTokens).to.be.false;
      expect(data[3].tokensInfo).to.be.length(2);
      expect(data[3].tokensInfo[0].token).to.be.eq(WETH.target);
      expect(data[3].tokensInfo[0].totalAccumulated).to.be.eq(0);
      expect(data[3].tokensInfo[0].available).to.be.eq(0);
      expect(data[3].tokensInfo[1].token).to.be.eq(USDB.target);
      expect(data[3].tokensInfo[1].totalAccumulated).to.be.eq(0);
      expect(data[3].tokensInfo[1].available).to.be.eq(0);
      expect(data[3].tokensInfo[0].token).to.be.eq(WETH.target);
    });
  });

  describe('Access restricted methods', async () => {
    describe('#setDirectionAvailableToSwapToTargetToken', async () => {
      it('should fail if call from not DEFAULT_ADMIN_ROLE', async () => {
        await expect(
          BlastRebasingTokensGovernor_Proxy.connect(other).setDirectionAvailableToSwapToTargetToken(
            YieldDistributionDirection.Bribes,
            true,
          ),
        ).to.be.revertedWith(getAccessControlError(await BlastRebasingTokensGovernor_Proxy.DEFAULT_ADMIN_ROLE(), other.address));
      });

      it('success update state and emit event', async () => {
        await expect(BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Bribes, true))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateDirectionAvailableToSwapToTargetToken')
          .withArgs(YieldDistributionDirection.Bribes, true);

        expect(
          (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Bribes))
            .isAvailableToSwapToTargetTokens,
        ).to.be.true;

        await shouldBeAllZero(YieldDistributionDirection.Incentives);
        await shouldBeAllZero(YieldDistributionDirection.Others);
        await shouldBeAllZero(YieldDistributionDirection.Rise);

        await expect(BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Bribes, false))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateDirectionAvailableToSwapToTargetToken')
          .withArgs(YieldDistributionDirection.Bribes, false);

        expect(
          (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Bribes))
            .isAvailableToSwapToTargetTokens,
        ).to.be.false;

        await shouldBeAllZero(YieldDistributionDirection.Incentives);
        await shouldBeAllZero(YieldDistributionDirection.Others);
        await shouldBeAllZero(YieldDistributionDirection.Rise);

        await expect(BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Bribes, true))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateDirectionAvailableToSwapToTargetToken')
          .withArgs(YieldDistributionDirection.Bribes, true);

        await expect(
          BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Incentives, true),
        )
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateDirectionAvailableToSwapToTargetToken')
          .withArgs(YieldDistributionDirection.Incentives, true);

        expect(
          (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Bribes))
            .isAvailableToSwapToTargetTokens,
        ).to.be.true;

        expect(
          (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Incentives))
            .isAvailableToSwapToTargetTokens,
        ).to.be.true;
      });
    });

    describe('#setYieldDistributionDirectionsPercentage', async () => {
      it('should fail if call from not DEFAULT_ADMIN_ROLE', async () => {
        await expect(
          BlastRebasingTokensGovernor_Proxy.connect(other).setYieldDistributionDirectionsPercentage(0, 0, 0, 0),
        ).to.be.revertedWith(getAccessControlError(await BlastRebasingTokensGovernor_Proxy.DEFAULT_ADMIN_ROLE(), other.address));
      });
      it('should fail if sum all percentage != 100%', async () => {
        await expect(BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, 0, 0, 0)).to.be.revertedWithCustomError(
          BlastRebasingTokensGovernor_Proxy,
          'InvalidPercentageSum',
        );
        await expect(
          BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(ethers.parseEther('0.99'), 0, 0, 0),
        ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'InvalidPercentageSum');

        await expect(
          BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, 0, 0, ethers.parseEther('0.99')),
        ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'InvalidPercentageSum');

        await expect(
          BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, 0, ethers.parseEther('1.01'), 0),
        ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'InvalidPercentageSum');

        await expect(BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, 1, 0, 0)).to.be.revertedWithCustomError(
          BlastRebasingTokensGovernor_Proxy,
          'InvalidPercentageSum',
        );
      });

      it('success update distribution percentage and emit event', async () => {
        async function checkDistributionPercentage(p1: bigint, p2: bigint, p3: bigint, p4: bigint) {
          expect(
            (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Others))
              .distributionPercentage,
          ).to.be.eq(p1);
          expect(
            (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Incentives))
              .distributionPercentage,
          ).to.be.eq(p2);
          expect(
            (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Rise))
              .distributionPercentage,
          ).to.be.eq(p3);
          expect(
            (await BlastRebasingTokensGovernor_Proxy.yieldDistributionDirectionInfo(YieldDistributionDirection.Bribes))
              .distributionPercentage,
          ).to.be.eq(p4);
        }
        await shouldBeAllZero(YieldDistributionDirection.Incentives);
        await shouldBeAllZero(YieldDistributionDirection.Others);
        await shouldBeAllZero(YieldDistributionDirection.Rise);
        await shouldBeAllZero(YieldDistributionDirection.Bribes);

        await checkDistributionPercentage(0n, 0n, 0n, 0n);

        await expect(BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(ethers.parseEther('1'), 0, 0, 0))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateYieldDistributionPercentage')
          .withArgs(ethers.parseEther('1'), 0, 0, 0);

        await checkDistributionPercentage(ethers.parseEther('1'), 0n, 0n, 0n);

        await expect(BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, ethers.parseEther('1'), 0, 0))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateYieldDistributionPercentage')
          .withArgs(0, ethers.parseEther('1'), 0, 0);

        await checkDistributionPercentage(0n, ethers.parseEther('1'), 0n, 0n);

        await expect(BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, 0, ethers.parseEther('1'), 0))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateYieldDistributionPercentage')
          .withArgs(0, 0, ethers.parseEther('1'), 0);

        await checkDistributionPercentage(0n, 0n, ethers.parseEther('1'), 0n);

        await expect(BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, 0, 0, ethers.parseEther('1')))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateYieldDistributionPercentage')
          .withArgs(0, 0, 0, ethers.parseEther('1'));

        await checkDistributionPercentage(0n, 0n, 0, ethers.parseEther('1'));

        await expect(
          BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(
            ethers.parseEther('0.25'),
            ethers.parseEther('0.15'),
            ethers.parseEther('0.5'),
            ethers.parseEther('0.10'),
          ),
        )
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'UpdateYieldDistributionPercentage')
          .withArgs(ethers.parseEther('0.25'), ethers.parseEther('0.15'), ethers.parseEther('0.5'), ethers.parseEther('0.10'));

        await checkDistributionPercentage(
          ethers.parseEther('0.25'),
          ethers.parseEther('0.15'),
          ethers.parseEther('0.5'),
          ethers.parseEther('0.10'),
        );
      });
    });
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

    describe('#directV3Swap', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_SWAPER_ROLE', async () => {
          await expect(
            BlastRebasingTokensGovernor_Proxy.connect(other).directV3Swap(YieldDistributionDirection.Others, WETH.target, 1, 1, 1, 0),
          ).to.be.revertedWith(getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_SWAPER_ROLE(), other.address));
        });

        it('swapTargetTokenCache not setup', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', swapRouter.target);

          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([ethers.ZeroAddress, swapRouter.target]);
          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(YieldDistributionDirection.Others, WETH.target, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'AddressNotSetupForSupportSwap');
        });

        it('swap Router not setup', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', coreDeployed.fenix.target);

          expect(await BlastRebasingTokensGovernor_Proxy.swapInfo()).to.be.deep.eq([coreDeployed.fenix.target, ethers.ZeroAddress]);
          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(YieldDistributionDirection.Others, WETH.target, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'AddressNotSetupForSupportSwap');
        });

        it('input token_ and swap target token the same', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', swapRouter.target);
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', WETH.target);
          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(YieldDistributionDirection.Others, WETH.target, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'InvalidSwapSourceToken');
        });

        it('direction not avalable for swap to target tokens', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', swapRouter.target);
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', coreDeployed.fenix.target);

          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(YieldDistributionDirection.Others, WETH.target, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'SwapNotAvailableForDirection');
        });

        it('amount for swap is more then available for swap', async () => {
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapRouter', swapRouter.target);
          await BlastRebasingTokensGovernor_Proxy.updateAddress('swapTargetToken', coreDeployed.fenix.target);

          await BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Others, true);
          await expect(
            BlastRebasingTokensGovernor_Proxy.directV3Swap(YieldDistributionDirection.Others, WETH.target, 1, 1, 1, 0),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'AmountMoreThenAvailabelToSwapByThisDirection');
        });
      });

      describe('success swap to target swap token and add to avalaible for future withdraw', async () => {
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

          await BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(ethers.parseEther('1'), 0, 0, 0);
          let holder = await getNewHolder();
          await USDB.__mock_setClamaibleAmount(holder.target, 1e6);
          await BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(USDB.target, [holder.target]);
          await WETH.__mock_setClamaibleAmount(holder.target, ethers.parseEther('2'));
          await BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(WETH.target, [holder.target]);
        });

        it('state before', async () => {
          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('2'));
          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(1e6);
          expect(await coreDeployed.fenix.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);
          let tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            USDB.target,
          );
          expect(tokenInfo.available).to.be.eq(1e6);
          expect(tokenInfo.totalAccumulated).to.be.eq(1e6);

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, WETH.target);
          expect(tokenInfo.available).to.be.eq(ethers.parseEther('2'));
          expect(tokenInfo.totalAccumulated).to.be.eq(ethers.parseEther('2'));

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            coreDeployed.fenix.target,
          );
          expect(tokenInfo.available).to.be.eq(0);
          expect(tokenInfo.totalAccumulated).to.be.eq(0);
        });

        it('success swap 50% WETH and emit events', async () => {
          await BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Others, true);
          let tx = await BlastRebasingTokensGovernor_Proxy.directV3Swap(
            YieldDistributionDirection.Others,
            WETH.target,
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
              YieldDistributionDirection.Others,
              WETH.target,
              coreDeployed.fenix.target,
              ethers.parseEther('1'),
              fenixOutputAmount,
            );

          let tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            USDB.target,
          );
          expect(tokenInfo.available).to.be.eq(1e6);
          expect(tokenInfo.totalAccumulated).to.be.eq(1e6);

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, WETH.target);
          expect(tokenInfo.available).to.be.eq(ethers.parseEther('1'));
          expect(tokenInfo.totalAccumulated).to.be.eq(ethers.parseEther('2'));

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            coreDeployed.fenix.target,
          );
          expect(tokenInfo.available).to.be.eq(fenixOutputAmount);
          expect(tokenInfo.totalAccumulated).to.be.eq(fenixOutputAmount);
        });

        it('success swap 100% WETH and emit events', async () => {
          await BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Others, true);

          let tx = await BlastRebasingTokensGovernor_Proxy.directV3Swap(
            YieldDistributionDirection.Others,
            WETH.target,
            ethers.parseEther('2'),
            ethers.parseEther('0.99'),
            0,
            (await time.latest()) + 100,
          );
          let fenixOutputAmount = await coreDeployed.fenix.balanceOf(BlastRebasingTokensGovernor_Proxy.target);
          expect(fenixOutputAmount).to.be.closeTo(ethers.parseEther('2'), ethers.parseEther('0.01'));

          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);
          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(1e6);
          expect(await coreDeployed.fenix.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.closeTo(
            ethers.parseEther('2'),
            ethers.parseEther('0.01'),
          );

          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'DirectV3Swap')
            .withArgs(
              deployer.address,
              YieldDistributionDirection.Others,
              WETH.target,
              coreDeployed.fenix.target,
              ethers.parseEther('2'),
              fenixOutputAmount,
            );

          let tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            WETH.target,
          );
          expect(tokenInfo.available).to.be.eq(0);
          expect(tokenInfo.totalAccumulated).to.be.eq(ethers.parseEther('2'));

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            coreDeployed.fenix.target,
          );
          expect(tokenInfo.available).to.be.eq(fenixOutputAmount);
          expect(tokenInfo.totalAccumulated).to.be.eq(fenixOutputAmount);

          await BlastRebasingTokensGovernor_Proxy.withdraw(
            YieldDistributionDirection.Others,
            coreDeployed.fenix.target,
            other.address,
            fenixOutputAmount,
          );

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            coreDeployed.fenix.target,
          );
          expect(tokenInfo.available).to.be.eq(0);
          expect(tokenInfo.totalAccumulated).to.be.eq(fenixOutputAmount);

          expect(await coreDeployed.fenix.balanceOf(other.address)).to.be.eq(fenixOutputAmount);
          expect(await coreDeployed.fenix.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);
        });
      });
    });

    describe('#withdraw', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_WITHDRAWER_ROLE', async () => {
          await expect(
            BlastRebasingTokensGovernor_Proxy.connect(other).withdraw(YieldDistributionDirection.Bribes, WETH.target, other.address, 1),
          ).to.be.revertedWith(getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_WITHDRAWER_ROLE(), other.address));
        });
        it(' try withdraw when amount to withdraw is zero', async () => {
          await expect(
            BlastRebasingTokensGovernor_Proxy.withdraw(YieldDistributionDirection.Bribes, WETH.target, other.address, 1),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'ZeroTokensToClaim');
        });
        it(' try withdraw more then available', async () => {
          await BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(ethers.parseEther('1'), 0, 0, 0);
          let holder = await getNewHolder();
          await USDB.__mock_setClamaibleAmount(holder.target, 1e6);
          await BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(USDB.target, [holder.target]);

          await expect(
            BlastRebasingTokensGovernor_Proxy.withdraw(YieldDistributionDirection.Others, USDB.target, other.address, 1e6 + 1),
          ).to.be.revertedWithCustomError(BlastRebasingTokensGovernor_Proxy, 'InsufficientAvailableAmountToWithdraw');
        });
      });

      describe('success withdraw erc20 tokens from contract', async () => {
        it('usdb to the caller for bribes direction', async () => {
          await BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(
            0,
            ethers.parseEther('0.5'),
            0,
            ethers.parseEther('0.5'),
          );
          let holder = await getNewHolder();
          await USDB.__mock_setClamaibleAmount(holder.target, 6e6);
          await expect(BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(USDB.target, [holder.target]))
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
            .withArgs(deployer.address, USDB.target, 6e6, 0, 3e6, 0, 3e6);

          let tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Bribes,
            USDB.target,
          );

          expect(tokenInfo.available).to.be.eq(3e6);
          expect(tokenInfo.totalAccumulated).to.be.eq(3e6);
          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(6e6);

          let tx = await BlastRebasingTokensGovernor_Proxy.withdraw(YieldDistributionDirection.Bribes, USDB.target, deployer.address, 1e6);
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, deployer.address, YieldDistributionDirection.Bribes, USDB.target, 1e6);
          await expect(tx).to.be.emit(USDB, 'Transfer').withArgs(BlastRebasingTokensGovernor_Proxy.target, deployer.address, 1e6);

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, USDB.target);
          expect(tokenInfo.available).to.be.eq(2e6);
          expect(tokenInfo.totalAccumulated).to.be.eq(3e6);

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Incentives,
            USDB.target,
          );

          expect(tokenInfo.available).to.be.eq(3e6);
          expect(tokenInfo.totalAccumulated).to.be.eq(3e6);

          tx = await BlastRebasingTokensGovernor_Proxy.withdraw(YieldDistributionDirection.Bribes, USDB.target, deployer.address, 2e6);
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, deployer.address, YieldDistributionDirection.Bribes, USDB.target, 2e6);
          await expect(tx).to.be.emit(USDB, 'Transfer').withArgs(BlastRebasingTokensGovernor_Proxy.target, deployer.address, 2e6);

          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(3e6);
          expect(await USDB.balanceOf(deployer.address)).to.be.eq(3e6);

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, USDB.target);
          expect(tokenInfo.available).to.be.eq(0);
          expect(tokenInfo.totalAccumulated).to.be.eq(3e6);
          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Incentives,
            USDB.target,
          );
          expect(tokenInfo.available).to.be.eq(3e6);
          expect(tokenInfo.totalAccumulated).to.be.eq(3e6);

          tx = await BlastRebasingTokensGovernor_Proxy.withdraw(YieldDistributionDirection.Incentives, USDB.target, deployer.address, 3e6);
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, deployer.address, YieldDistributionDirection.Incentives, USDB.target, 3e6);
          await expect(tx).to.be.emit(USDB, 'Transfer').withArgs(BlastRebasingTokensGovernor_Proxy.target, deployer.address, 3e6);

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, USDB.target);
          expect(tokenInfo.available).to.be.eq(0);
          expect(tokenInfo.totalAccumulated).to.be.eq(3e6);
          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Incentives,
            USDB.target,
          );
          expect(tokenInfo.available).to.be.eq(0);
          expect(tokenInfo.totalAccumulated).to.be.eq(3e6);

          expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);
          expect(await USDB.balanceOf(deployer.address)).to.be.eq(6e6);
        });

        it('weth to the other recipient', async () => {
          await BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(ethers.parseEther('1'), 0, 0, 0);
          let holder = await getNewHolder();
          await WETH.__mock_setClamaibleAmount(holder.target, ethers.parseEther('10'));
          await BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(WETH.target, [holder.target]);

          let tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(
            YieldDistributionDirection.Others,
            WETH.target,
          );

          expect(tokenInfo.available).to.be.eq(ethers.parseEther('10'));
          expect(tokenInfo.totalAccumulated).to.be.eq(ethers.parseEther('10'));
          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('10'));

          let tx = await BlastRebasingTokensGovernor_Proxy.withdraw(
            YieldDistributionDirection.Others,
            WETH.target,
            other.address,
            ethers.parseEther('1'),
          );
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, other.address, YieldDistributionDirection.Others, WETH.target, ethers.parseEther('1'));
          await expect(tx)
            .to.be.emit(WETH, 'Transfer')
            .withArgs(BlastRebasingTokensGovernor_Proxy.target, other.address, ethers.parseEther('1'));

          tx = await BlastRebasingTokensGovernor_Proxy.withdraw(
            YieldDistributionDirection.Others,
            WETH.target,
            other.address,
            ethers.parseEther('2'),
          );
          await expect(tx)
            .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Withdraw')
            .withArgs(deployer.address, other.address, YieldDistributionDirection.Others, WETH.target, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(WETH, 'Transfer')
            .withArgs(BlastRebasingTokensGovernor_Proxy.target, other.address, ethers.parseEther('2'));

          expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('7'));
          expect(await WETH.balanceOf(deployer.address)).to.be.eq(0);
          expect(await WETH.balanceOf(other.address)).to.be.eq(ethers.parseEther('3'));

          tokenInfo = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, WETH.target);

          expect(tokenInfo.available).to.be.eq(ethers.parseEther('7'));
          expect(tokenInfo.totalAccumulated).to.be.eq(ethers.parseEther('10'));
        });
      });
    });

    describe('#claimFromSpecifiedTokenHolders', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_CLAIMER_ROLE', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.connect(other).claimFromSpecifiedTokenHolders(WETH.target, [])).to.be.revertedWith(
            getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_CLAIMER_ROLE(), other.address),
          );
        });
      });

      it('success empty call without specifice holder', async () => {
        await expect(BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(WETH.target, []))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
          .withArgs(deployer.address, WETH.target, 0, 0, 0, 0, 0);
      });

      it('success claim and distribute by directions base on them percentages', async () => {
        await BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(
          ethers.parseEther('0.1'),
          ethers.parseEther('0.2'),
          ethers.parseEther('0.3'),
          ethers.parseEther('0.4'),
        );
        expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(0);

        let holder = await getNewHolder();
        await WETH.__mock_setClamaibleAmount(holder.target, ethers.parseEther('1'));
        await expect(BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(WETH.target, [holder.target]))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
          .withArgs(
            deployer.address,
            WETH.target,
            ethers.parseEther('1'),
            ethers.parseEther('0.1'),
            ethers.parseEther('0.2'),
            ethers.parseEther('0.3'),
            ethers.parseEther('0.4'),
          );

        expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('1'));
        let info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.1'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.1'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Incentives, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.2'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.2'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Rise, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.3'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.3'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.4'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.4'));

        let holder2 = await getNewHolder();
        await USDB.__mock_setClamaibleAmount(holder.target, ethers.parseEther('5'));
        await USDB.__mock_setClamaibleAmount(holder2.target, ethers.parseEther('5'));

        await expect(BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(USDB.target, [holder.target, holder2.target]))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
          .withArgs(
            deployer.address,
            USDB.target,
            ethers.parseEther('10'),
            ethers.parseEther('1'),
            ethers.parseEther('2'),
            ethers.parseEther('3'),
            ethers.parseEther('4'),
          );

        expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('1'));
        expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('10'));

        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.1'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.1'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Incentives, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.2'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.2'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Rise, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.3'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.3'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.4'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.4'));

        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('1'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('1'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Incentives, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('2'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('2'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Rise, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('3'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('3'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('4'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('4'));

        await BlastRebasingTokensGovernor_Proxy.setYieldDistributionDirectionsPercentage(0, ethers.parseEther('1'), 0, 0);

        await expect(BlastRebasingTokensGovernor_Proxy.claimFromSpecifiedTokenHolders(USDB.target, [holder.target, holder2.target]))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
          .withArgs(deployer.address, USDB.target, ethers.parseEther('10'), 0, ethers.parseEther('10'), 0, 0);

        expect(await WETH.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('1'));
        expect(await USDB.balanceOf(BlastRebasingTokensGovernor_Proxy.target)).to.be.eq(ethers.parseEther('20'));

        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.1'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.1'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Incentives, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.2'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.2'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Rise, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.3'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.3'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, WETH.target);
        expect(info.available).to.be.eq(ethers.parseEther('0.4'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('0.4'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Others, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('1'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('1'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Incentives, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('12'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('12'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Rise, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('3'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('3'));
        info = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionTokenInfo(YieldDistributionDirection.Bribes, USDB.target);
        expect(info.available).to.be.eq(ethers.parseEther('4'));
        expect(info.totalAccumulated).to.be.eq(ethers.parseEther('4'));

        await BlastRebasingTokensGovernor_Proxy.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Bribes, true);

        let data = await BlastRebasingTokensGovernor_Proxy.getYieldDirectionsInfo([WETH.target, USDB.target]);

        expect(data).to.be.length(4);

        expect(data[0].direction).to.be.eq(YieldDistributionDirection.Others);
        expect(data[0].distributionPercentage).to.be.eq(ethers.parseEther('0'));
        expect(data[0].isAvailableToSwapToTargetTokens).to.be.false;
        expect(data[0].tokensInfo).to.be.length(2);
        expect(data[0].tokensInfo[0].totalAccumulated).to.be.eq(ethers.parseEther('0.1'));
        expect(data[0].tokensInfo[0].available).to.be.eq(ethers.parseEther('0.1'));
        expect(data[0].tokensInfo[1].totalAccumulated).to.be.eq(ethers.parseEther('1'));
        expect(data[0].tokensInfo[1].available).to.be.eq(ethers.parseEther('1'));
        expect(data[0].tokensInfo[0].token).to.be.eq(WETH.target);
        expect(data[0].tokensInfo[1].token).to.be.eq(USDB.target);

        expect(data[1].direction).to.be.eq(YieldDistributionDirection.Incentives);
        expect(data[1].distributionPercentage).to.be.eq(ethers.parseEther('1'));
        expect(data[1].isAvailableToSwapToTargetTokens).to.be.false;
        expect(data[1].tokensInfo).to.be.length(2);
        expect(data[1].tokensInfo[0].totalAccumulated).to.be.eq(ethers.parseEther('0.2'));
        expect(data[1].tokensInfo[0].available).to.be.eq(ethers.parseEther('0.2'));
        expect(data[1].tokensInfo[1].totalAccumulated).to.be.eq(ethers.parseEther('12'));
        expect(data[1].tokensInfo[1].available).to.be.eq(ethers.parseEther('12'));
        expect(data[1].tokensInfo[1].token).to.be.eq(USDB.target);
        expect(data[1].tokensInfo[0].token).to.be.eq(WETH.target);

        expect(data[2].direction).to.be.eq(YieldDistributionDirection.Rise);
        expect(data[2].distributionPercentage).to.be.eq(ethers.parseEther('0'));
        expect(data[2].isAvailableToSwapToTargetTokens).to.be.false;
        expect(data[2].tokensInfo).to.be.length(2);
        expect(data[2].tokensInfo[0].totalAccumulated).to.be.eq(ethers.parseEther('0.3'));
        expect(data[2].tokensInfo[0].available).to.be.eq(ethers.parseEther('0.3'));
        expect(data[2].tokensInfo[1].totalAccumulated).to.be.eq(ethers.parseEther('3'));
        expect(data[2].tokensInfo[1].available).to.be.eq(ethers.parseEther('3'));
        expect(data[2].tokensInfo[1].token).to.be.eq(USDB.target);
        expect(data[2].tokensInfo[0].token).to.be.eq(WETH.target);

        expect(data[3].direction).to.be.eq(YieldDistributionDirection.Bribes);
        expect(data[3].distributionPercentage).to.be.eq(ethers.parseEther('0'));
        expect(data[3].isAvailableToSwapToTargetTokens).to.be.true;
        expect(data[3].tokensInfo).to.be.length(2);
        expect(data[3].tokensInfo[0].token).to.be.eq(WETH.target);
        expect(data[3].tokensInfo[0].totalAccumulated).to.be.eq(ethers.parseEther('0.4'));
        expect(data[3].tokensInfo[0].available).to.be.eq(ethers.parseEther('0.4'));
        expect(data[3].tokensInfo[1].token).to.be.eq(USDB.target);
        expect(data[3].tokensInfo[1].totalAccumulated).to.be.eq(ethers.parseEther('4'));
        expect(data[3].tokensInfo[1].available).to.be.eq(ethers.parseEther('4'));
        expect(data[3].tokensInfo[0].token).to.be.eq(WETH.target);
      });
    });

    describe('#claim', async () => {
      describe('should fail if', async () => {
        it('call from not TOKEN_CLAIMER_ROLE', async () => {
          await expect(BlastRebasingTokensGovernor_Proxy.connect(other).claim(WETH.target, 0, 100)).to.be.revertedWith(
            getAccessControlError(await BlastRebasingTokensGovernor_Proxy.TOKEN_CLAIMER_ROLE(), other.address),
          );
        });
      });
      it('success empty call with zero size to call', async () => {
        await expect(BlastRebasingTokensGovernor_Proxy.claim(WETH.target, 0, 0))
          .to.be.emit(BlastRebasingTokensGovernor_Proxy, 'Claim')
          .withArgs(deployer.address, WETH.target, 0, 0, 0, 0, 0);
      });
    });
  });
});

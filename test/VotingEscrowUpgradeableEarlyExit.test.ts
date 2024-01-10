import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ERRORS, ONE, ONE_ETHER, ZERO_ADDRESS } from './utils/constants';
import { ethers } from 'hardhat';
import {
  TransparentUpgradeableProxy__factory,
  UniV3OracleLibrary__factory,
  VeEarlyExitManagerUpgradeable__factory,
  VotingEscrowUpgradeable,
  VotingEscrowUpgradeable__factory,
} from '../typechain-types';
import { deployToken } from './utils/fixture';
import { takeSnapshot, time, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';
import { ERC20Mock } from '../typechain-types/contracts/mocks/ERC20Mock';
import { VeEarlyExitManagerUpgradeable } from '../typechain-types';
import { VeArtProxyUpgradeable__factory } from '../typechain-types';
import { Fenix } from '../typechain-types';
import { EmissionManagerUpgradeable } from '../typechain-types';

describe('VotingEscrowUpgradeableEarlyExit', function () {
  let deployer: HardhatEthersSigner;
  let proxyAdmin: HardhatEthersSigner;
  let fenixMultisig: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;
  let others: HardhatEthersSigner[];

  let factory: VotingEscrowUpgradeable__factory;
  let fenix: Fenix;
  let usdcMock: ERC20Mock;
  let ethMock: ERC20Mock;
  let factoryProxy: TransparentUpgradeableProxy__factory;
  let votingEscrowImplementation: VotingEscrowUpgradeable;
  let votingEscrowProxy: VotingEscrowUpgradeable;
  let snapshot: SnapshotRestorer;
  let veEarlyExitManagerProxy: VeEarlyExitManagerUpgradeable;
  let emissionManager: EmissionManagerUpgradeable;
  let earlyExitManagerImplementation: VeEarlyExitManagerUpgradeable;

  async function getNewVotingEscrowProxy() {
    let newProxy = await factoryProxy.deploy(await votingEscrowImplementation.getAddress(), proxyAdmin.address, '0x');
    return factory.attach(await newProxy.getAddress()) as VotingEscrowUpgradeable;
  }

  async function deployEmissionManager() {
    const EmissionManagerUpgradeable = await ethers.getContractFactory('EmissionManagerUpgradeable');
    let implementation = (await EmissionManagerUpgradeable.deploy()) as EmissionManagerUpgradeable;
    let newProxy = await factoryProxy.deploy(await implementation.getAddress(), proxyAdmin.address, '0x');
    return EmissionManagerUpgradeable.attach(await newProxy.getAddress()) as EmissionManagerUpgradeable;
  }

  async function deployFenixToken() {
    const Fenix = await ethers.getContractFactory('Fenix');
    return (await Fenix.deploy(deployer.address)) as Fenix;
  }

  beforeEach(async function () {
    [deployer, proxyAdmin, fenixMultisig, otherUser, ...others] = await ethers.getSigners();

    factory = (await ethers.getContractFactory('VotingEscrowUpgradeable')) as VotingEscrowUpgradeable__factory;
    votingEscrowImplementation = await factory.deploy();
    let earlyExitManagerFactory = (await ethers.getContractFactory('VeEarlyExitManagerUpgradeable')) as VeArtProxyUpgradeable__factory;
    earlyExitManagerImplementation = (await earlyExitManagerFactory.deploy()) as VeEarlyExitManagerUpgradeable;

    factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
    fenix = await deployFenixToken();
    usdcMock = await deployToken('USDC', 'USDC', 9);
    ethMock = await deployToken('ETH', 'ETH', 18);
    emissionManager = await deployEmissionManager();

    let newProxy = await factoryProxy.deploy(await earlyExitManagerImplementation.getAddress(), proxyAdmin.address, '0x');
    veEarlyExitManagerProxy = (await earlyExitManagerFactory.attach(await newProxy.getAddress())) as VeEarlyExitManagerUpgradeable;

    votingEscrowProxy = await getNewVotingEscrowProxy();
    await votingEscrowProxy.initialize(await fenix.getAddress(), ZERO_ADDRESS);
    let library = await (await ethers.getContractFactory('UniV3OracleLibrary')).deploy();
    await veEarlyExitManagerProxy.initialize(await fenix.getAddress(), await emissionManager.getAddress(), await library.getAddress());

    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  describe('Deployment', function () {
    it('Should fail if try second time to initialize', async function () {
      await expect(votingEscrowProxy.initialize(await fenix.getAddress(), ZERO_ADDRESS)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should corect set initial paramaeters', async function () {
      expect(await votingEscrowProxy.token()).to.be.equal(await fenix.getAddress());
      expect(await votingEscrowProxy.team()).to.be.equal(deployer.address);
      expect(await votingEscrowProxy.voter()).to.be.equal(deployer.address);
      expect(await votingEscrowProxy.artProxy()).to.be.equal(ZERO_ADDRESS);
    });
  });

  describe('Early exit', function () {
    it('Should corect set initial paramaeters', async function () {
      expect(await votingEscrowProxy.tresuary()).to.be.equal(ZERO_ADDRESS);
      expect(await votingEscrowProxy.earlyExitManager()).to.be.equal(ZERO_ADDRESS);
    });
    describe('#setTresuary', async () => {
      it('Shouild fail if call from not team', async () => {
        await expect(votingEscrowProxy.connect(otherUser).setTresuary(otherUser.address)).to.be.reverted;
      });
      it('Shouild success if call from team address', async () => {
        await expect(votingEscrowProxy.connect(deployer).setTresuary(deployer.address)).to.be.not.reverted;
      });
      it('Shouild corectly change tresuary address and emit event', async () => {
        let tx = await votingEscrowProxy.setTresuary(fenixMultisig.address);
        await expect(tx).to.be.emit(votingEscrowProxy, 'SetTresuary').withArgs(fenixMultisig.address);
      });
    });
    describe('#setEarlyExitManager', async () => {
      it('Shouild fail if call from not team', async () => {
        await expect(votingEscrowProxy.connect(otherUser).setEarlyExitManager(otherUser.address)).to.be.reverted;
      });
      it('Shouild success if call from team address', async () => {
        await expect(votingEscrowProxy.connect(deployer).setEarlyExitManager(deployer.address)).to.be.not.reverted;
      });
      it('Shouild corectly change earlyExitManager address and emit event', async () => {
        let tx = await votingEscrowProxy.setEarlyExitManager(fenixMultisig.address);
        await expect(tx).to.be.emit(votingEscrowProxy, 'SetEarlyExitManager').withArgs(fenixMultisig.address);
      });
    });
    describe('#earlyWithdraw', async () => {
      describe('Should be fail if', async () => {
        it('the sender is not the token owner or approved by token owner ', async () => {
          await expect(votingEscrowProxy.connect(otherUser).earlyWithdraw(1, await usdcMock.getAddress())).to.be.revertedWith(
            'Not token owner',
          );
        });
        it('token havent any locked amount', async () => {});
        it('token lock expired', async () => {
          await fenix.mint(otherUser.address, ONE_ETHER);
          await fenix.connect(otherUser).approve(await votingEscrowProxy.getAddress(), ONE_ETHER);

          await votingEscrowProxy.connect(otherUser).create_lock(ONE_ETHER, 8 * 86400);

          let tokenId = await votingEscrowProxy.totalTokensMinted();
          await time.increase(9 * 86400);
          await expect(votingEscrowProxy.connect(otherUser).earlyWithdraw(tokenId, await usdcMock.getAddress())).to.be.revertedWith(
            'Lock expired',
          );
        });
        it('early withdraw not configure', async () => {
          await fenix.mint(otherUser.address, ONE_ETHER);
          await fenix.connect(otherUser).approve(await votingEscrowProxy.getAddress(), ONE_ETHER);

          await votingEscrowProxy.connect(otherUser).create_lock(ONE_ETHER, 12 * 86400);

          let tokenId = await votingEscrowProxy.totalTokensMinted();
          await time.increase(4 * 86401);
          await expect(votingEscrowProxy.connect(otherUser).earlyWithdraw(tokenId, await usdcMock.getAddress())).to.be.revertedWith(
            'Early exit is disabled',
          );
        });
        it('the specified fee payment token not supported', async () => {
          await fenix.mint(otherUser.address, ONE_ETHER);
          await fenix.connect(otherUser).approve(await votingEscrowProxy.getAddress(), ONE_ETHER);
          await votingEscrowProxy.connect(otherUser).create_lock(ONE_ETHER, 12 * 86400);
          let tokenId = await votingEscrowProxy.totalTokensMinted();

          await votingEscrowProxy.setTresuary(fenixMultisig.address);
          await votingEscrowProxy.setEarlyExitManager(await veEarlyExitManagerProxy.getAddress());
          await expect(
            votingEscrowProxy.connect(otherUser).earlyWithdraw(tokenId, await usdcMock.getAddress()),
          ).to.be.revertedWithCustomError(earlyExitManagerImplementation, 'FeePaymentTokenNotSupported');
        });
        it('user not approve payment token to pay', async () => {
          await fenix.mint(otherUser.address, ONE_ETHER);
          await fenix.connect(otherUser).approve(await votingEscrowProxy.getAddress(), ONE_ETHER);
          await votingEscrowProxy.connect(otherUser).create_lock(ONE_ETHER, 12 * 86400);
          let tokenId = await votingEscrowProxy.totalTokensMinted();

          await votingEscrowProxy.setTresuary(fenixMultisig.address);
          await votingEscrowProxy.setEarlyExitManager(await veEarlyExitManagerProxy.getAddress());

          let poolMock = await ethers.getContractFactory('UniswapV3PoolMock');
          let pair = await poolMock.deploy();
          await pair.setToken0(await fenix.getAddress());
          await pair.setToken1(await usdcMock.getAddress());

          await usdcMock.mint(otherUser.address, ONE_ETHER);
          await veEarlyExitManagerProxy.addFeePaymentTokenSupport(await usdcMock.getAddress(), await pair.getAddress());
          await usdcMock.connect(otherUser).approve(await votingEscrowProxy.getAddress(), ONE_ETHER);
          await votingEscrowProxy.connect(otherUser).earlyWithdraw(tokenId, await usdcMock.getAddress());
        });
        it('user havent enough payment token for pay fee', async () => {});
        it('user was voting in actual preiod', async () => {});
      });
      describe('Success cases', async () => {
        it('should burn user token corectly and emit event', async () => {});
        it('should corect change tokens balance', async () => {});
        it('should corect vested user unlocked token', async () => {});
      });
    });
  });
});

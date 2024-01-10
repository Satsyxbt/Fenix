import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ERRORS, ONE, ONE_ETHER, ZERO_ADDRESS } from './utils/constants';
import { ethers } from 'hardhat';
import {
  TransparentUpgradeableProxy__factory,
  UniV3OracleLibrary,
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

describe('VeEarlyExitManagerUpgradeable', function () {
  let deployer: HardhatEthersSigner;
  let proxyAdmin: HardhatEthersSigner;
  let fenixMultisig: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;
  let others: HardhatEthersSigner[];

  let factory: VeEarlyExitManagerUpgradeable__factory;
  let fenix: Fenix;
  let usdcMock: ERC20Mock;
  let ethMock: ERC20Mock;
  let factoryProxy: TransparentUpgradeableProxy__factory;
  let veEarlyExitManagerImplementation: VeEarlyExitManagerUpgradeable;
  let snapshot: SnapshotRestorer;
  let veEarlyExitManagerProxy: VeEarlyExitManagerUpgradeable;
  let emissionManager: EmissionManagerUpgradeable;
  let uniV3util: UniV3OracleLibrary;

  async function getNewExitManager() {
    let newProxy = await factoryProxy.deploy(await veEarlyExitManagerImplementation.getAddress(), proxyAdmin.address, '0x');
    return factory.attach(await newProxy.getAddress()) as VeEarlyExitManagerUpgradeable;
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

    factory = (await ethers.getContractFactory('VeEarlyExitManagerUpgradeable')) as VeEarlyExitManagerUpgradeable__factory;
    veEarlyExitManagerImplementation = await factory.deploy();

    factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
    fenix = await deployFenixToken();
    usdcMock = await deployToken('USDC', 'USDC', 9);
    ethMock = await deployToken('ETH', 'ETH', 18);
    emissionManager = await deployEmissionManager();

    let newProxy = await factoryProxy.deploy(await veEarlyExitManagerImplementation.getAddress(), proxyAdmin.address, '0x');
    veEarlyExitManagerProxy = (await factory.attach(await newProxy.getAddress())) as VeEarlyExitManagerUpgradeable;

    uniV3util = await (await ethers.getContractFactory('UniV3OracleLibrary')).deploy();
    await veEarlyExitManagerProxy.initialize(await fenix.getAddress(), await emissionManager.getAddress(), await uniV3util.getAddress());

    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  describe('Deployment', function () {
    it('Should fail if try second time to initialize', async function () {
      await expect(
        veEarlyExitManagerProxy.initialize(await fenix.getAddress(), await emissionManager.getAddress(), ZERO_ADDRESS),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should corect set initial paramaeters', async function () {
      expect(await veEarlyExitManagerProxy.fenix()).to.be.equal(await fenix.getAddress());
      expect(await veEarlyExitManagerProxy.emissionManager()).to.be.equal(await emissionManager.getAddress());
      expect(await veEarlyExitManagerProxy.uniV3util()).to.be.equal(await uniV3util.getAddress());
      expect(await veEarlyExitManagerProxy.timeWindow()).to.be.equal(360);
      expect(await veEarlyExitManagerProxy.maxFee()).to.be.equal(ethers.parseEther('0.75'));
      expect(await veEarlyExitManagerProxy.owner()).to.be.equal(deployer.address);
    });
  });
  describe('Check access control', async function () {
    it('#removeFeePaymentTokenSupport - should fail if call from not owner', async () => {
      await expect(veEarlyExitManagerProxy.connect(otherUser).removeFeePaymentTokenSupport(otherUser.address)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
    it('#addFeePaymentTokenSupport - should fail if call from not owner', async () => {
      await expect(
        veEarlyExitManagerProxy.connect(otherUser).addFeePaymentTokenSupport(otherUser.address, otherUser.address),
      ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
    it('#setMaxFee - should fail if call from not owner', async () => {
      await expect(veEarlyExitManagerProxy.connect(otherUser).setMaxFee(10000)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
    it('#setTimeWindow - should fail if call from not owner', async () => {
      await expect(veEarlyExitManagerProxy.connect(otherUser).setTimeWindow(10000)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
    it('#setVestedPeriodCount - should fail if call from not owner', async () => {
      await expect(veEarlyExitManagerProxy.connect(otherUser).setVestedPeriodCount(10000)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });
  });
  describe('#addFeePaymentTokenSupport', async function () {});
});

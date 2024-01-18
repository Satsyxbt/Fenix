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
} from '../../typechain-types';
import { deployToken } from './utils/fixture';
import { takeSnapshot, time, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';
import { ERC20Mock } from '../../typechain-types/contracts/mocks/ERC20Mock';
import { VeEarlyExitManagerUpgradeable } from '../../typechain-types';
import { VeArtProxyUpgradeable__factory } from '../../typechain-types';
import { Fenix } from '../../typechain-types';
import { EmissionManagerUpgradeable } from '../../typechain-types';

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

    factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
    fenix = await deployFenixToken();
    usdcMock = await deployToken('USDC', 'USDC', 9);
    ethMock = await deployToken('ETH', 'ETH', 18);
    emissionManager = await deployEmissionManager();

    votingEscrowProxy = await getNewVotingEscrowProxy();

    await votingEscrowProxy.initialize(await fenix.getAddress(), ZERO_ADDRESS);

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
});

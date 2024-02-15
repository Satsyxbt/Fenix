import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { BEACON_IMPLEMENTATION_SLOT, ERRORS, ZERO, ZERO_ADDRESS } from './utils/constants';
import { ethers } from 'hardhat';
import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

import {
  ERC20Mock,
  PermissionsRegistry,
  PermissionsRegistry__factory,
  TransparentUpgradeableProxy__factory,
  VoteMock,
  VoteMock__factory,
  ImplementationMock,
  CLGaugeFactoryUpgradeable,
  CLGaugeFactoryUpgradeable__factory,
  GaugeUpgradeable,
  GaugeUpgradeable__factory,
  CLFeesVault__factory,
  CLFeesVault,
} from '../typechain-types';
import { deployToken } from './utils/fixture';

describe('GaugeFactoryUpgradeable Contract', function () {
  let deployer: HardhatEthersSigner;
  let gaugeAdmin: HardhatEthersSigner;
  let emergencyCouncil: HardhatEthersSigner;

  let proxyAdmin: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;
  let votingEscrow: HardhatEthersSigner;
  let minter: HardhatEthersSigner;
  let internalBribe: HardhatEthersSigner;
  let extenralBribe: HardhatEthersSigner;

  let others: HardhatEthersSigner[];

  let clGaugeFactoryUpgradeableFactory: CLGaugeFactoryUpgradeable__factory;
  let clGaugeFactoryUpgradeableImplementation: CLGaugeFactoryUpgradeable;
  let clGaugeFactoryUpgradeableProxy: CLGaugeFactoryUpgradeable;

  let factoryProxy: TransparentUpgradeableProxy__factory;

  let permissionRegistryFactory: PermissionsRegistry__factory;
  let permissionRegistry: PermissionsRegistry;

  let voteMockFactory: VoteMock__factory;
  let voteMock: VoteMock;

  let clGaugeUpgradeableFactory: GaugeUpgradeable__factory;
  let clGaugeUpgradeableImplementation: GaugeUpgradeable;

  let implementaionMockInstance: ImplementationMock;

  let token18: ERC20Mock;
  let token9: ERC20Mock;

  let snapshot: SnapshotRestorer;

  async function getNewGaugeFactoryProxy() {
    let newProxy = await factoryProxy.deploy(await clGaugeFactoryUpgradeableImplementation.getAddress(), proxyAdmin.address, '0x');
    return clGaugeFactoryUpgradeableFactory.attach(await newProxy.getAddress()) as CLGaugeFactoryUpgradeable;
  }

  async function createGauge(
    rewardToken: string,
    votingEscrow: string,
    token: string,
    distribution: string,
    internalBribe: string,
    externalBribe: string,
  ) {
    await clGaugeFactoryUpgradeableProxy.createGauge(rewardToken, votingEscrow, token, distribution, internalBribe, externalBribe, false);
    return clGaugeUpgradeableFactory.attach(await clGaugeFactoryUpgradeableProxy.lastGauge()) as GaugeUpgradeable;
  }
  before(async function () {
    [deployer, gaugeAdmin, emergencyCouncil, proxyAdmin, otherUser, votingEscrow, internalBribe, extenralBribe, minter, ...others] =
      await ethers.getSigners();

    factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;

    clGaugeFactoryUpgradeableFactory = (await ethers.getContractFactory('GaugeFactoryUpgradeable')) as CLGaugeFactoryUpgradeable__factory;
    clGaugeFactoryUpgradeableImplementation = (await clGaugeFactoryUpgradeableFactory.deploy()) as CLGaugeFactoryUpgradeable;

    permissionRegistryFactory = await ethers.getContractFactory('PermissionsRegistry');
    permissionRegistry = await permissionRegistryFactory.connect(deployer).deploy();
    await permissionRegistry.connect(deployer).setRoleFor(gaugeAdmin.address, 'GAUGE_ADMIN');
    await permissionRegistry.connect(deployer).setEmergencyCouncil(emergencyCouncil.address);

    clGaugeUpgradeableFactory = (await ethers.getContractFactory('GaugeUpgradeable')) as GaugeUpgradeable__factory;
    clGaugeUpgradeableImplementation = (await clGaugeUpgradeableFactory.deploy()) as GaugeUpgradeable;

    voteMockFactory = await ethers.getContractFactory('VoteMock');
    voteMock = (await voteMockFactory.deploy(votingEscrow.address, minter.address)) as VoteMock;

    implementaionMockInstance = (await (await ethers.getContractFactory('ImplementationMock')).deploy()) as ImplementationMock;

    clGaugeFactoryUpgradeableProxy = await getNewGaugeFactoryProxy();
    token18 = await deployToken('RewardToken', 'T18', 18);
    token9 = await deployToken('PoolToken', 'T9', 9);

    await clGaugeFactoryUpgradeableProxy.initialize(
      await permissionRegistry.getAddress(),
      await clGaugeUpgradeableImplementation.getAddress(),
    );

    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  describe('Deployment', async function () {
    it('Should fail if try call initialize on implementation', async function () {
      await expect(
        clGaugeFactoryUpgradeableImplementation.initialize(
          await permissionRegistry.getAddress(),
          await clGaugeUpgradeableImplementation.getAddress(),
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should fail if try second time to initialize', async function () {
      await expect(
        clGaugeFactoryUpgradeableProxy.initialize(
          await permissionRegistry.getAddress(),
          await clGaugeUpgradeableImplementation.getAddress(),
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should correct set initial settings', async function () {
      expect(await clGaugeFactoryUpgradeableProxy.lastGauge()).to.be.equal(ZERO_ADDRESS);
      expect(await clGaugeFactoryUpgradeableProxy.implementation()).to.be.equal(await clGaugeUpgradeableImplementation.getAddress());
      expect(await clGaugeFactoryUpgradeableProxy.permissionsRegistry()).to.be.equal(await permissionRegistry.getAddress());
    });
    it('Should fail if one of main address is zero or implementation not contract', async function () {
      let proxy = await getNewGaugeFactoryProxy();

      await expect(proxy.initialize(await permissionRegistry.getAddress(), ZERO_ADDRESS)).to.be.revertedWithCustomError(
        proxy,
        'AddressNotContract',
      );
      await expect(proxy.initialize(ZERO_ADDRESS, await clGaugeUpgradeableImplementation.getAddress())).to.be.revertedWithCustomError(
        proxy,
        'ZeroAddress',
      );
    });
  });
  describe('Upgrade gauges', async function () {
    it('Should corect upgrades all gauges to new implementation', async function () {
      expect(await clGaugeFactoryUpgradeableProxy.implementation()).to.be.equal(await clGaugeUpgradeableImplementation.getAddress());

      let g1 = await createGauge(
        await token18.getAddress(),
        votingEscrow.address,
        await token9.getAddress(),
        await voteMock.getAddress(),
        internalBribe.address,
        extenralBribe.address,
      );
      let g2 = await createGauge(
        await token18.getAddress(),
        votingEscrow.address,
        await token9.getAddress(),
        await voteMock.getAddress(),
        internalBribe.address,
        extenralBribe.address,
      );
      let g3 = await createGauge(
        await token18.getAddress(),
        votingEscrow.address,
        await token9.getAddress(),
        await voteMock.getAddress(),
        internalBribe.address,
        extenralBribe.address,
      );
      await clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).upgradeProxiesTo(await implementaionMockInstance.getAddress());

      let factory = await ethers.getContractFactory('ImplementationMock');
      expect(await (factory.attach(g1) as ImplementationMock).gaugeVersion()).to.be.equal('Gauge Mock');
      expect(await (factory.attach(g2) as ImplementationMock).gaugeVersion()).to.be.equal('Gauge Mock');
      expect(await (factory.attach(g3) as ImplementationMock).gaugeVersion()).to.be.equal('Gauge Mock');

      expect(await clGaugeFactoryUpgradeableProxy.implementation()).to.be.equal(await implementaionMockInstance.getAddress());
    });
  });
  describe('Functions', async function () {
    describe('#setPermissionsRegistry', async function () {
      it('Should fail if try to set zero address', async function () {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setPermissionsRegistry(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'ZeroAddress',
        );
      });
      it('Should corectly set new permisison registry address', async function () {
        let newRegistry = await permissionRegistryFactory.deploy();
        expect(await clGaugeFactoryUpgradeableProxy.permissionsRegistry()).to.be.equal(await permissionRegistry.getAddress());
        let tx = await clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setPermissionsRegistry(await newRegistry.getAddress());
        expect(await clGaugeFactoryUpgradeableProxy.permissionsRegistry()).to.be.equal(await newRegistry.getAddress());

        await expect(tx)
          .to.be.emit(clGaugeFactoryUpgradeableProxy, 'SetPermissionRegistry')
          .withArgs(await newRegistry.getAddress());
      });
    });
    describe('#activateEmergencyMode', async function () {
      it('Should corectly active emergency mode on gauges', async function () {
        let g1 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g2 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g3 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        expect(await g1.emergencyMode()).to.be.false;
        expect(await g2.emergencyMode()).to.be.false;
        expect(await g3.emergencyMode()).to.be.false;

        await clGaugeFactoryUpgradeableProxy
          .connect(emergencyCouncil)
          .activateEmergencyMode([await g1.getAddress(), await g3.getAddress()]);

        expect(await g1.emergencyMode()).to.be.true;
        expect(await g2.emergencyMode()).to.be.false;
        expect(await g3.emergencyMode()).to.be.true;
      });
    });
    describe('#stopEmergencyMode', async function () {
      it('Should corectly stop emergency mode on gauges', async function () {
        let g1 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g2 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g3 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        await clGaugeFactoryUpgradeableProxy
          .connect(emergencyCouncil)
          .activateEmergencyMode([await g1.getAddress(), await g3.getAddress(), await g2.getAddress()]);

        expect(await g1.emergencyMode()).to.be.true;
        expect(await g2.emergencyMode()).to.be.true;
        expect(await g3.emergencyMode()).to.be.true;

        // TODO: GaugeUpgradeable not provide oportunity to stop emergency mode, than it's can be feat or bug not clear
        await clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).stopEmergencyMode([await g1.getAddress(), await g2.getAddress()]);

        expect(await g1.emergencyMode()).to.be.false;
        expect(await g2.emergencyMode()).to.be.false;
        expect(await g3.emergencyMode()).to.be.true;
      });
    });
    describe('#setRewarderPid', async function () {
      it('Should fail if arrays have differes length', async function () {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setRewarderPid([], [ZERO])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'MismatchArrayLen',
        );
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setRewarderPid([ZERO_ADDRESS, ZERO_ADDRESS], [ZERO]),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'MismatchArrayLen');
      });
      it('Should corectly update reward pid on gauges', async function () {
        let g1 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g2 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g3 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );

        expect(await g1.rewarderPid()).to.be.equal(ZERO);
        expect(await g2.rewarderPid()).to.be.equal(ZERO);
        expect(await g3.rewarderPid()).to.be.equal(ZERO);

        await clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setRewarderPid([await g2.getAddress(), await g3.getAddress()], [2, 4]);

        expect(await g1.rewarderPid()).to.be.equal(ZERO);
        expect(await g2.rewarderPid()).to.be.equal(2);
        expect(await g3.rewarderPid()).to.be.equal(4);
      });
    });
    describe('#updateGaugeRewarder', async function () {
      it('Should fail if arrays have differes length', async function () {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setGaugeRewarder([], [ZERO_ADDRESS])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'MismatchArrayLen',
        );
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setGaugeRewarder([ZERO_ADDRESS, ZERO_ADDRESS], [ZERO_ADDRESS]),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'MismatchArrayLen');
      });
      it('Should corectly update rewarder on gauges', async function () {
        let g1 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g2 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g3 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );

        expect(await g1.gaugeRewarder()).to.be.equal(ZERO_ADDRESS);
        expect(await g2.gaugeRewarder()).to.be.equal(ZERO_ADDRESS);
        expect(await g3.gaugeRewarder()).to.be.equal(ZERO_ADDRESS);

        await clGaugeFactoryUpgradeableProxy
          .connect(gaugeAdmin)
          .setGaugeRewarder(
            [await g1.getAddress(), await g3.getAddress()],
            [await gaugeAdmin.getAddress(), await emergencyCouncil.getAddress()],
          );

        expect(await g1.gaugeRewarder()).to.be.equal(gaugeAdmin.address);
        expect(await g2.gaugeRewarder()).to.be.equal(ZERO_ADDRESS);
        expect(await g3.gaugeRewarder()).to.be.equal(emergencyCouncil.address);
      });
    });
    describe('#setInternalBribe', async function () {
      it('Should fail if arrays have differes length', async function () {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setInternalBribe([], [ZERO_ADDRESS])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'MismatchArrayLen',
        );
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setInternalBribe([ZERO_ADDRESS, ZERO_ADDRESS], [ZERO_ADDRESS]),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'MismatchArrayLen');
      });
      it('Should corectly update intenral bribe on gauges', async function () {
        let g1 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g2 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g3 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );

        expect(await g1.internalBribe()).to.be.equal(internalBribe.address);
        expect(await g2.internalBribe()).to.be.equal(internalBribe.address);
        expect(await g3.internalBribe()).to.be.equal(internalBribe.address);

        await clGaugeFactoryUpgradeableProxy
          .connect(gaugeAdmin)
          .setInternalBribe([await g2.getAddress(), await g3.getAddress()], [extenralBribe.address, extenralBribe.address]);

        expect(await g1.internalBribe()).to.be.equal(internalBribe.address);
        expect(await g2.internalBribe()).to.be.equal(extenralBribe.address);
        expect(await g3.internalBribe()).to.be.equal(extenralBribe.address);
      });
    });

    describe('#setDistribution', async function () {
      it('Should corectly update distribution on gauges', async function () {
        let g1 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g2 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        let g3 = await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );

        expect(await g1.distribution()).to.be.equal(await voteMock.getAddress());
        expect(await g2.distribution()).to.be.equal(await voteMock.getAddress());
        expect(await g3.distribution()).to.be.equal(await voteMock.getAddress());

        let newVoter = await (await voteMockFactory.deploy(votingEscrow, minter.address)).getAddress();
        await clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setDistribution([await g1.getAddress(), await g2.getAddress()], newVoter);

        expect(await g1.distribution()).to.be.equal(newVoter);
        expect(await g2.distribution()).to.be.equal(newVoter);
        expect(await g3.distribution()).to.be.equal(await voteMock.getAddress());
      });
    });
  });
  describe('Create gauge', async function () {
    describe('Should corectly create new gauge and CLFeesVault', async function () {
      let deployedTx: any;
      let deployedGaugeAddress: string;

      beforeEach(async function () {
        deployedGaugeAddress = await clGaugeFactoryUpgradeableProxy.createGauge.staticCall(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
          false,
        );
        deployedTx = await clGaugeFactoryUpgradeableProxy.createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
          false,
        );
      });
      it('Should corect emit event after deploy new gauge', async function () {
        await expect(deployedTx).to.emit(clGaugeFactoryUpgradeableProxy, 'GaugeCreated').withArgs(deployedGaugeAddress);
      });
      it('Should corect return lastGauge address', async function () {
        expect(await clGaugeFactoryUpgradeableProxy.lastGauge()).to.be.equal(deployedGaugeAddress);
      });

      it('Should corect initialize deployead gauge', async function () {
        let gauge = clGaugeUpgradeableFactory.attach(deployedGaugeAddress) as GaugeUpgradeable;
        expect(await gauge.votingEscrow()).to.be.equal(votingEscrow.address);
        expect(await gauge.rewardToken()).to.be.equal(await token18.getAddress());
        expect(await gauge.depositToken()).to.be.equal(await token9.getAddress());
        expect(await gauge.distribution()).to.be.equal(await voteMock.getAddress());
        expect(await gauge.internalBribe()).to.be.equal(internalBribe.address);
        expect(await gauge.externalBribe()).to.be.equal(extenralBribe.address);
      });
      it('Deployed gauge should get implementation from factory implementation slot', async function () {
        expect('0x' + (await ethers.provider.getStorage(deployedGaugeAddress, BEACON_IMPLEMENTATION_SLOT)).substring(26)).to.be.equal(
          (await clGaugeFactoryUpgradeableProxy.getAddress()).toLowerCase(),
        );
      });
      it('Deployed gauge should be added to gauges list', async function () {
        expect(await clGaugeFactoryUpgradeableProxy.lastGauge()).to.be.equal(deployedGaugeAddress);
        expect(await clGaugeFactoryUpgradeableProxy.length()).to.be.equal(1);
        expect(await clGaugeFactoryUpgradeableProxy.list(0, 10)).to.be.deep.equal([deployedGaugeAddress]);
      });
    });
  });
  describe('Check access control', async function () {
    describe('functions for only access from GAUGE_ADMIN', async function () {
      it('#upgradeProxiesTo - Should fail if call from not GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(otherUser).upgradeProxiesTo(otherUser.address)).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).upgradeProxiesTo(emergencyCouncil.address),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#upgradeProxiesTo - Should success called from GAUGE_ADMIN', async () => {
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).upgradeProxiesTo(await clGaugeUpgradeableImplementation.getAddress()),
        ).to.be.not.reverted;
      });
      it('#activateEmergencyMode - Should fail if call from not EMERGENCY_COUNCIL', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(otherUser).activateEmergencyMode([])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).activateEmergencyMode([])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
      });
      it('#activateEmergencyMode - Should success called from EMERGENCY_COUNCIL', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).activateEmergencyMode([])).to.be.not.reverted;
      });
      it('#stopEmergencyMode - Should fail if call from not EMERGENCY_COUNCIL', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(otherUser).stopEmergencyMode([])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).stopEmergencyMode([])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
      });
      it('#stopEmergencyMode - Should success called from EMERGENCY_COUNCIL', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).stopEmergencyMode([])).to.be.not.reverted;
      });
      it('#setPermissionsRegistry - Should fail if call from not GAUGE_ADMIN', async () => {
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(otherUser).setPermissionsRegistry(otherUser.address),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'AccessDenied');
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).setPermissionsRegistry(emergencyCouncil.address),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#setPermissionsRegistry - Should success called from GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setPermissionsRegistry(await permissionRegistry.getAddress())).to.be
          .not.reverted;
      });
      it('#setRewarderPid - Should fail if call from not GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(otherUser).setRewarderPid([], [])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
        await expect(clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).setRewarderPid([], [])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
      });
      it('#setRewarderPid - Should success called from GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setRewarderPid([], [])).to.be.not.reverted;
      });
      it('#setGaugeRewarder - Should fail if call from not GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(otherUser).setGaugeRewarder([], [])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
        await expect(clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).setGaugeRewarder([], [])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
      });
      it('#setGaugeRewarder - Should success called from GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setGaugeRewarder([], [])).to.be.not.reverted;
      });
      it('#setDistribution - Should fail if call from not GAUGE_ADMIN', async () => {
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(otherUser).setDistribution([], otherUser.address),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'AccessDenied');
        await expect(
          clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).setDistribution([], emergencyCouncil.address),
        ).to.be.revertedWithCustomError(clGaugeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#setDistribution - Should success called from GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setDistribution([], gaugeAdmin.address)).to.be.not.reverted;
      });
      it('#setDistribution - Should fail if call from not GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(otherUser).setInternalBribe([], [])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
        await expect(clGaugeFactoryUpgradeableProxy.connect(emergencyCouncil).setInternalBribe([], [])).to.be.revertedWithCustomError(
          clGaugeFactoryUpgradeableProxy,
          'AccessDenied',
        );
      });
      it('#setDistribution - Should success called from GAUGE_ADMIN', async () => {
        await expect(clGaugeFactoryUpgradeableProxy.connect(gaugeAdmin).setInternalBribe([], [])).to.be.not.reverted;
      });
    });
  });
  describe('View functions', async function () {
    describe('#length', async function () {
      it('Should corectly return length without existsing gauges', async function () {
        expect(await clGaugeFactoryUpgradeableProxy.length()).to.be.equal(0);
      });
      it('Should corectly return length of deployed gauges', async function () {
        await createGauge(
          await token18.getAddress(),
          votingEscrow.address,
          await token9.getAddress(),
          await voteMock.getAddress(),
          internalBribe.address,
          extenralBribe.address,
        );
        expect(await clGaugeFactoryUpgradeableProxy.length()).to.be.equal(1);
      });
      it('Should corectly return length after deployed new', async function () {
        for (let index = 0; index < 3; index++) {
          await createGauge(
            await token18.getAddress(),
            votingEscrow.address,
            await token9.getAddress(),
            await voteMock.getAddress(),
            internalBribe.address,
            extenralBribe.address,
          );
        }
        expect(await clGaugeFactoryUpgradeableProxy.length()).to.be.equal(3);
      });
    });
    describe('#list', async function () {
      it('Should corectly return empty list without gauges after initialzier', async function () {
        expect(await clGaugeFactoryUpgradeableProxy.list(0, 100)).to.be.empty;
      });
      it('Should corectly return gauges accroding to parameters', async function () {
        let gauges = [];
        for (let index = 0; index < 5; index++) {
          gauges.push(
            await (
              await createGauge(
                await token18.getAddress(),
                votingEscrow.address,
                await token9.getAddress(),
                await voteMock.getAddress(),
                internalBribe.address,
                extenralBribe.address,
              )
            ).getAddress(),
          );
        }

        expect(await clGaugeFactoryUpgradeableProxy.list(0, 0)).to.be.empty;
        expect(await clGaugeFactoryUpgradeableProxy.list(0, 1)).to.be.deep.equal([gauges[0]]);
        expect(await clGaugeFactoryUpgradeableProxy.list(1, 1)).to.be.deep.equal([gauges[1]]);
        expect(await clGaugeFactoryUpgradeableProxy.list(0, 2)).to.be.deep.equal([gauges[0], gauges[1]]);
        expect(await clGaugeFactoryUpgradeableProxy.list(1, 2)).to.be.deep.equal([gauges[1], gauges[2]]);
        expect(await clGaugeFactoryUpgradeableProxy.list(0, 10)).to.be.deep.equal([gauges[0], gauges[1], gauges[2], gauges[3], gauges[4]]);
        expect(await clGaugeFactoryUpgradeableProxy.list(4, 10)).to.be.deep.equal([gauges[4]]);
        expect(await clGaugeFactoryUpgradeableProxy.list(3, 1)).to.be.deep.equal([gauges[3]]);
        expect(await clGaugeFactoryUpgradeableProxy.list(3, 2)).to.be.deep.equal([gauges[3], gauges[4]]);

        expect(await clGaugeFactoryUpgradeableProxy.list(5, 10)).to.be.empty;
        expect(await clGaugeFactoryUpgradeableProxy.list(5, 0)).to.be.empty;
      });
      it("Shouldn' revert if set incorect offset_, or limit_ parameters", async function () {
        await expect(clGaugeFactoryUpgradeableProxy.list(1500, 0)).to.be.not.reverted;
      });
    });
  });
});

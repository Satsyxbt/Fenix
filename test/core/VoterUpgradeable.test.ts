import { ethers } from 'hardhat';
import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable__factory,
  CLGaugeFactoryUpgradeable,
  CLGaugeFactoryUpgradeable__factory,
  CLGaugeUpgradeable,
  CLGaugeUpgradeable__factory,
  ERC20Mock,
  ERC20Mock__factory,
  EmissionManagerUpgradeable,
  EmissionManagerUpgradeable__factory,
  Fenix,
  Fenix__factory,
  PairFactoryMock,
  PermissionsRegistry,
  PermissionsRegistry__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
  RewardsDistributor,
  RewardsDistributor__factory,
  TransparentUpgradeableProxy__factory,
  VeArtProxyUpgradeable,
  VeArtProxyUpgradeable__factory,
  VoterUpgradeable,
  VoterUpgradeable__factory,
  VotingEscrowUpgradeable,
  VotingEscrowUpgradeable__factory,
} from '../../typechain-types/index';
import { ERRORS, ONE_ETHER, ZERO, ZERO_ADDRESS } from './utils/constants';
import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

describe('VoterUpgradeable Contract', function () {
  let ProxyAdmin: ProxyAdmin__factory;
  let TransparentUpgradeableProxy: TransparentUpgradeableProxy__factory;
  let VotingEscrowUpgradeable: VotingEscrowUpgradeable__factory;
  let VoterUpgradeable: VoterUpgradeable__factory;
  let BribeFactoryUpgradeable: BribeFactoryUpgradeable__factory;
  let BribeUpgradeable: BribeUpgradeable__factory;
  let CLGaugeUpgradeable: CLGaugeUpgradeable__factory;
  let VeArtProxyUpgradeable: VeArtProxyUpgradeable__factory;
  let CLGaugeFactoryUpgradeable: CLGaugeFactoryUpgradeable__factory;
  let EmissionManagerUpgradeable: EmissionManagerUpgradeable__factory;
  let PermissionsRegistry: PermissionsRegistry__factory;
  let RewardsDistributor: RewardsDistributor__factory;
  let PairFactoryMock: PairFactoryMock__factory;
  let UniswapV2PoolMock: UniswapV2PoolMock__factory;

  let FenixFactory: Fenix__factory;
  let ERC20MockFactory: ERC20Mock__factory;

  let fenixInstance = Fenix;
  let emissionManagerImplementation: EmissionManagerUpgradeable;
  let emissionManagerInstance: EmissionManagerUpgradeable;
  let permissionRegistryInstance: PermissionsRegistry;
  let voterImplementation: VoterUpgradeable;
  let voterInstance: VoterUpgradeable;
  let votingEscrowImplementation: VotingEscrowUpgradeable;
  let votingEscrowInstance: VotingEscrowUpgradeable;
  let bribeImplementation: BribeUpgradeable;
  let clGaugeImplementation: CLGaugeUpgradeable;
  let bribeFactoryImplementation: BribeFactoryUpgradeable;
  let bribeFactoryInstance: BribeFactoryUpgradeable;
  let clGaugeFactoryImplementation: CLGaugeFactoryUpgradeable;
  let clGaugeFactoryInstance: CLGaugeFactoryUpgradeable;
  let veArtProxyImplementation: VeArtProxyUpgradeable;
  let veArtProxyInstance: VeArtProxyUpgradeable;
  let pairFactoryMockInstance: PairFactoryMock;
  let rewardsDistributorInstance: RewardsDistributor;
  let proxyAdminInstance: ProxyAdmin;

  let usdcInstance: ERC20Mock;

  let deployer: HardhatEthersSigner;
  let governance: HardhatEthersSigner;
  let voterAdmin: HardhatEthersSigner;
  let otheruser: HardhatEthersSigner;
  let otheruser2: HardhatEthersSigner;

  let snapshot: SnapshotRestorer;

  async function createGauge(): Promise<CLGaugeUpgradeable> {
    let pool = await UniswapV2PoolMock.deploy();
    await pool.setToken0(await fenixInstance.getAddress());
    await pool.setToken1(await usdcInstance.getAddress());
    await pool.setSymbol('FNX-USDC Mock');

    await pairFactoryMockInstance.setIsPair(await pool.getAddress(), true);

    let result = await voterInstance.connect(governance).createGauge.staticCall(pool, 0);
    await voterInstance.connect(governance).createGauge(pool, 0);

    return CLGaugeUpgradeable.attach(result[0]) as CLGaugeUpgradeable;
  }
  before(async function () {
    [deployer, governance, voterAdmin, otheruser, otheruser2] = await ethers.getSigners();
    ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    TransparentUpgradeableProxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    VotingEscrowUpgradeable = await ethers.getContractFactory('VotingEscrowUpgradeable');
    VoterUpgradeable = await ethers.getContractFactory('VoterUpgradeable');
    BribeFactoryUpgradeable = await ethers.getContractFactory('BribeFactoryUpgradeable');
    BribeUpgradeable = await ethers.getContractFactory('BribeUpgradeable');
    CLGaugeUpgradeable = await ethers.getContractFactory('CLGaugeUpgradeable');
    VeArtProxyUpgradeable = await ethers.getContractFactory('VeArtProxyUpgradeable');
    CLGaugeFactoryUpgradeable = await ethers.getContractFactory('CLGaugeFactoryUpgradeable');
    EmissionManagerUpgradeable = await ethers.getContractFactory('EmissionManagerUpgradeable');
    PermissionsRegistry = await ethers.getContractFactory('PermissionsRegistry');
    RewardsDistributor = await ethers.getContractFactory('RewardsDistributor');
    PairFactoryMock = await ethers.getContractFactory('PairFactoryMock');
    FenixFactory = await ethers.getContractFactory('Fenix');
    ERC20MockFactory = await ethers.getContractFactory('ERC20Mock');
    UniswapV2PoolMock = await ethers.getContractFactory('UniswapV2PoolMock');

    emissionManagerImplementation = await EmissionManagerUpgradeable.deploy();
    voterImplementation = await VoterUpgradeable.deploy();
    votingEscrowImplementation = await VotingEscrowUpgradeable.deploy();
    bribeImplementation = await BribeUpgradeable.deploy();
    clGaugeImplementation = await CLGaugeUpgradeable.deploy();
    bribeFactoryImplementation = await BribeFactoryUpgradeable.deploy();
    clGaugeFactoryImplementation = await CLGaugeFactoryUpgradeable.deploy();
    veArtProxyImplementation = await VeArtProxyUpgradeable.deploy();
    permissionRegistryInstance = await PermissionsRegistry.deploy();
    pairFactoryMockInstance = await PairFactoryMock.deploy();
    proxyAdminInstance = await ProxyAdmin.deploy();
    usdcInstance = (await ERC20MockFactory.deploy('USDC', 'USDC', 18)) as ERC20Mock;

    await permissionRegistryInstance.setRoleFor(voterAdmin.address, 'VOTER_ADMIN');
    await permissionRegistryInstance.setRoleFor(governance.address, 'GOVERNANCE');

    emissionManagerInstance = EmissionManagerUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(
          await emissionManagerImplementation.getAddress(),
          await proxyAdminInstance.getAddress(),
          '0x',
        )
      ).getAddress(),
    ) as EmissionManagerUpgradeable;

    fenixInstance = await FenixFactory.deploy(await emissionManagerInstance.getAddress());

    voterInstance = VoterUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await voterImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as VoterUpgradeable;
    votingEscrowInstance = VotingEscrowUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await votingEscrowImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as VotingEscrowUpgradeable;

    bribeFactoryInstance = BribeFactoryUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await bribeFactoryImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as BribeFactoryUpgradeable;
    clGaugeFactoryInstance = CLGaugeFactoryUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(
          await clGaugeFactoryImplementation.getAddress(),
          await proxyAdminInstance.getAddress(),
          '0x',
        )
      ).getAddress(),
    ) as CLGaugeFactoryUpgradeable;
    veArtProxyInstance = VeArtProxyUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await veArtProxyImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as VeArtProxyUpgradeable;

    await votingEscrowInstance.initialize(await fenixInstance.getAddress(), await veArtProxyInstance.getAddress());

    rewardsDistributorInstance = await RewardsDistributor.deploy(await votingEscrowInstance.getAddress());

    await voterInstance.initialize(
      await votingEscrowInstance.getAddress(),
      await bribeFactoryInstance.getAddress(),
      await permissionRegistryInstance.getAddress(),
      await emissionManagerInstance.getAddress(),
      [await fenixInstance.getAddress()],
      {
        gaugeFactory: await clGaugeFactoryInstance.getAddress(),
        pairFactory: await pairFactoryMockInstance.getAddress(),
      },
    );

    await emissionManagerInstance.initialize(
      await voterInstance.getAddress(),
      await votingEscrowInstance.getAddress(),
      await rewardsDistributorInstance.getAddress(),
    );

    await bribeFactoryInstance.initialize(
      await voterInstance.getAddress(),
      await permissionRegistryInstance.getAddress(),
      await bribeImplementation.getAddress(),
      [await fenixInstance.getAddress()],
    );
    await clGaugeFactoryInstance.initialize(await permissionRegistryInstance.getAddress(), await clGaugeImplementation.getAddress());

    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  describe('Deployment', async () => {
    describe('Should corect setup initial settings', async () => {
      it('Should corect setup initial settings', async () => {
        expect(await voterInstance.votingEscrow()).to.be.equal(await votingEscrowInstance.getAddress());
        expect(await voterInstance.emissionToken()).to.be.equal(await fenixInstance.getAddress());
        expect(await voterInstance.bribeFactory()).to.be.equal(await bribeFactoryInstance.getAddress());
        expect(await voterInstance.emissionManager()).to.be.equal(await emissionManagerInstance.getAddress());
        expect(await voterInstance.permissionRegistry()).to.be.equal(await permissionRegistryInstance.getAddress());
        expect(await voterInstance.voteDelay()).to.be.equal(ZERO);
        expect(await voterInstance.isWhitelisted(await fenixInstance.getAddress())).to.be.true;
        expect(await voterInstance.gaugeTypes(0)).to.be.deep.equal([
          await clGaugeFactoryInstance.getAddress(),
          await pairFactoryMockInstance.getAddress(),
        ]);
      });
    });
    it('Should fail if try initialize second time', async () => {
      await expect(
        voterInstance.initialize(
          await votingEscrowInstance.getAddress(),
          await bribeFactoryInstance.getAddress(),
          await permissionRegistryInstance.getAddress(),
          await emissionManagerInstance.getAddress(),
          [await fenixInstance.getAddress()],
          {
            pairFactory: await pairFactoryMockInstance.getAddress(),
            gaugeFactory: await clGaugeFactoryInstance.getAddress(),
          },
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should disable oportunity to call initializer on implementation', async () => {
      await expect(
        voterInstance.initialize(
          await votingEscrowInstance.getAddress(),
          await bribeFactoryInstance.getAddress(),
          await permissionRegistryInstance.getAddress(),
          await emissionManagerInstance.getAddress(),
          [await fenixInstance.getAddress()],
          {
            gaugeFactory: await clGaugeFactoryInstance.getAddress(),
            pairFactory: await pairFactoryMockInstance.getAddress(),
          },
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
  });
  describe('Voting process', async () => {
    describe('Should corect vote for pool', async () => {
      it('Should fail if call in delay time', async () => {
        expect.fail;
      });
      it('Should fail if from not token owner or approved address', async () => {
        expect.fail;
      });
      describe('Should corect vote for pool', async () => {
        it('Should corect update last voted time', async () => {
          expect.fail;
        });
        it('Should corect poke vote for current epoch', async () => {
          expect.fail;
        });
        it('Should corect change status on VotingEscrow', async () => {
          expect.fail;
        });
      });
    });
    describe('reset votes', async () => {
      it('Should fail if call in delay time', async () => {
        expect.fail;
      });
      it('Should fail if from not token owner or approved address', async () => {
        expect.fail;
      });
      describe('Should corect reset votes', async () => {
        it('Should corect update last voted time', async () => {
          expect.fail;
        });
        it('Should corect reset votes for current epoch', async () => {
          expect.fail;
        });
        it('Should corect change status on VotingEscrow', async () => {
          expect.fail;
        });
      });
    });
    describe('Should corect poke votes', async () => {
      it('Should fail if call in delay time', async () => {
        expect.fail;
      });
      it('Should fail if from not token owner or approved address', async () => {
        expect.fail;
      });
      describe('Should corect poke votes', async () => {
        it('Should corect update last voted time', async () => {
          expect.fail;
        });
        it('Should corect poke votes for current epoch', async () => {
          expect.fail;
        });
        it('Should corect change status on VotingEscrow', async () => {
          expect.fail;
        });
      });
    });
  });
  describe('Functions', async () => {
    describe('#setVoteDelay', async () => {
      it('Should fail if try setup incorrect vote delay', async () => {
        await expect(voterInstance.connect(voterAdmin).setVoteDelay(7 * 86400 + 1)).to.be.revertedWithCustomError(
          voterInstance,
          'MaxVoteDelayLimit',
        );
      });
      it('Should corect change vote delay and emit event', async () => {
        expect(await voterInstance.voteDelay()).to.be.equal(ZERO);
        let tx = await voterInstance.connect(voterAdmin).setVoteDelay(86400);
        await expect(tx).to.be.emit(voterInstance, 'SetVoteDelay').withArgs(0, 86400);
        expect(await voterInstance.voteDelay()).to.be.equal(86400);
      });
    });
    describe('#setEmissionManager', async () => {
      it('Should fail if try setup ZERO_ADDRESS', async () => {
        await expect(voterInstance.connect(voterAdmin).setEmissionManager(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          voterInstance,
          'ZeroAdress',
        );
      });
      it('Should fail if try setup not contract address', async () => {
        await expect(voterInstance.connect(voterAdmin).setEmissionManager(voterAdmin.address)).to.be.revertedWithCustomError(
          voterInstance,
          'NotContract',
        );
      });
      it('Should corect setup new emission manager and emit event', async () => {
        expect(await voterInstance.emissionManager()).to.be.equal(await emissionManagerInstance.getAddress());
        let tx = await voterInstance.connect(voterAdmin).setEmissionManager(await emissionManagerImplementation.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'SetEmissionManager')
          .withArgs(await emissionManagerInstance.getAddress(), await emissionManagerImplementation.getAddress());
        expect(await voterInstance.emissionManager()).to.be.equal(await emissionManagerImplementation.getAddress());
      });
    });
    describe('#setBribeFactory', async () => {
      it('Should fail if try setup ZERO_ADDRESS', async () => {
        await expect(voterInstance.connect(voterAdmin).setBribeFactory(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          voterInstance,
          'ZeroAdress',
        );
      });
      it('Should fail if try setup not contract address', async () => {
        await expect(voterInstance.connect(voterAdmin).setBribeFactory(voterAdmin.address)).to.be.revertedWithCustomError(
          voterInstance,
          'NotContract',
        );
      });
      it('Should corect setup new bribe factory and emit event', async () => {
        expect(await voterInstance.bribeFactory()).to.be.equal(await bribeFactoryInstance.getAddress());
        let tx = await voterInstance.connect(voterAdmin).setBribeFactory(await bribeFactoryImplementation.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'SetBribeFactory')
          .withArgs(await bribeFactoryInstance.getAddress(), await bribeFactoryImplementation.getAddress());
        expect(await voterInstance.bribeFactory()).to.be.equal(await bribeFactoryImplementation.getAddress());
      });
    });
    describe('#setPermissionsRegistry', async () => {
      it('Should fail if try setup ZERO_ADDRESS', async () => {
        await expect(voterInstance.connect(voterAdmin).setPermissionsRegistry(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          voterInstance,
          'ZeroAdress',
        );
      });
      it('Should fail if try setup not contract address', async () => {
        await expect(voterInstance.connect(voterAdmin).setPermissionsRegistry(voterAdmin.address)).to.be.revertedWithCustomError(
          voterInstance,
          'NotContract',
        );
      });
      it('Should corect setup new permission registry and emit event', async () => {
        expect(await voterInstance.permissionRegistry()).to.be.equal(await permissionRegistryInstance.getAddress());
        let deployedPermisison = await PermissionsRegistry.deploy();
        let tx = await voterInstance.connect(voterAdmin).setPermissionsRegistry(await deployedPermisison.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'SetPermissionRegistry')
          .withArgs(await permissionRegistryInstance.getAddress(), await deployedPermisison.getAddress());
        expect(await voterInstance.permissionRegistry()).to.be.equal(await deployedPermisison.getAddress());
      });
    });
    describe('#setNewBribes', async () => {
      it('Should fail if try setup ZERO_ADDRESS for any bribe type', async () => {
        let gauge = await createGauge();
        await expect(
          voterInstance.connect(voterAdmin).setNewBribes(await gauge.getAddress(), await bribeImplementation.getAddress(), ZERO_ADDRESS),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
        await expect(
          voterInstance.connect(voterAdmin).setNewBribes(await gauge.getAddress(), ZERO_ADDRESS, await bribeImplementation.getAddress()),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
      });
      it('Should fail if try setup not contract address', async () => {
        let gauge = await createGauge();
        await expect(
          voterInstance
            .connect(voterAdmin)
            .setNewBribes(await gauge.getAddress(), await bribeImplementation.getAddress(), voterAdmin.address),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
        await expect(
          voterInstance
            .connect(voterAdmin)
            .setNewBribes(await gauge.getAddress(), voterAdmin.address, await bribeImplementation.getAddress()),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
      });
      it('Should fail if try setup for not real gauge', async () => {
        await expect(
          voterInstance.connect(voterAdmin).setNewBribes(voterAdmin.address, await bribeImplementation.getAddress(), voterAdmin.address),
        ).to.be.revertedWithCustomError(voterInstance, 'NotGauge');
      });
      it('Should corect setup new internal and external bribe address for gauge', async () => {
        let gauge = await createGauge();

        let newIntBribe = await BribeUpgradeable.deploy();
        let newExtBribe = await BribeUpgradeable.deploy();

        let oldIntBribe = await gauge.internalBribe();
        let oldExtBribe = await gauge.externalBribe();

        expect(oldIntBribe).to.be.not.equal(await newIntBribe.getAddress());
        expect(oldExtBribe).to.be.not.equal(await newExtBribe.getAddress());

        let tx = voterInstance
          .connect(voterAdmin)
          .setNewBribes(await gauge.getAddress(), await newIntBribe.getAddress(), await newExtBribe.getAddress());

        await expect(tx)
          .to.be.emit(voterInstance, 'SetBribeFor')
          .withArgs(true, oldIntBribe, await newIntBribe.getAddress(), await gauge.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'SetBribeFor')
          .withArgs(false, oldExtBribe, await newExtBribe.getAddress(), await gauge.getAddress());

        expect(await voterInstance.externalBribe(await gauge.getAddress())).to.be.equal(await newExtBribe.getAddress());
        expect(await voterInstance.internalBribe(await gauge.getAddress())).to.be.equal(await newIntBribe.getAddress());
      });
    });
    describe('#setInternalBribeFor', async () => {
      it('Should fail if try setup ZERO_ADDRESS bribe ', async () => {
        let gauge = await createGauge();
        await expect(
          voterInstance.connect(voterAdmin).setInternalBribeFor(await gauge.getAddress(), ZERO_ADDRESS),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
      });
      it('Should fail if try setup not contract address', async () => {
        let gauge = await createGauge();
        await expect(
          voterInstance.connect(voterAdmin).setInternalBribeFor(await gauge.getAddress(), voterAdmin.address),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
      });
      it('Should fail if try setup for not real gauge', async () => {
        await expect(
          voterInstance.connect(voterAdmin).setInternalBribeFor(voterAdmin.address, voterAdmin.address),
        ).to.be.revertedWithCustomError(voterInstance, 'NotGauge');
      });
      it('Should corect setup new internal for gauge', async () => {
        let gauge = await createGauge();

        let newIntBribe = await BribeUpgradeable.deploy();

        let oldIntBribe = await gauge.internalBribe();

        expect(oldIntBribe).to.be.not.equal(await newIntBribe.getAddress());

        let tx = voterInstance.connect(voterAdmin).setInternalBribeFor(await gauge.getAddress(), await newIntBribe.getAddress());

        await expect(tx)
          .to.be.emit(voterInstance, 'SetBribeFor')
          .withArgs(true, oldIntBribe, await newIntBribe.getAddress(), await gauge.getAddress());
        expect(await voterInstance.internalBribe(await gauge.getAddress())).to.be.equal(await newIntBribe.getAddress());
      });
    });
    describe('#setExternalBribeFor', async () => {
      it('Should fail if try setup ZERO_ADDRESS bribe ', async () => {
        let gauge = await createGauge();
        await expect(
          voterInstance.connect(voterAdmin).setExternalBribeFor(await gauge.getAddress(), ZERO_ADDRESS),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
      });
      it('Should fail if try setup not contract address', async () => {
        let gauge = await createGauge();
        await expect(
          voterInstance.connect(voterAdmin).setExternalBribeFor(await gauge.getAddress(), voterAdmin.address),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
      });
      it('Should fail if try setup for not real gauge', async () => {
        await expect(
          voterInstance.connect(voterAdmin).setExternalBribeFor(voterAdmin.address, voterAdmin.address),
        ).to.be.revertedWithCustomError(voterInstance, 'NotGauge');
      });
      it('Should corect setup new internal for gauge', async () => {
        let gauge = await createGauge();

        let newExtBribe = await BribeUpgradeable.deploy();

        let oldExtBribe = await gauge.externalBribe();

        expect(oldExtBribe).to.be.not.equal(await newExtBribe.getAddress());

        let tx = voterInstance.connect(voterAdmin).setExternalBribeFor(await gauge.getAddress(), await newExtBribe.getAddress());

        await expect(tx)
          .to.be.emit(voterInstance, 'SetBribeFor')
          .withArgs(false, oldExtBribe, await newExtBribe.getAddress(), await gauge.getAddress());
        expect(await voterInstance.externalBribe(await gauge.getAddress())).to.be.equal(await newExtBribe.getAddress());
      });
    });
    describe('#addFactory', async () => {
      it('Should fail if try setup ZERO_ADDRESS ', async () => {
        await expect(
          voterInstance.connect(voterAdmin).addFactory([await pairFactoryMockInstance.getAddress(), ZERO_ADDRESS]),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
        await expect(
          voterInstance.connect(voterAdmin).addFactory([ZERO_ADDRESS, await pairFactoryMockInstance.getAddress()]),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
      });
      it('Should fail if try setup not contract address', async () => {
        await expect(
          voterInstance.connect(voterAdmin).addFactory([voterAdmin.address, await pairFactoryMockInstance.getAddress()]),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
        await expect(
          voterInstance.connect(voterAdmin).addFactory([await pairFactoryMockInstance.getAddress(), voterAdmin.address]),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
      });
      it('Should fail if try setup already exists factory', async () => {
        let newFactoryMock = await PairFactoryMock.deploy();

        await expect(
          voterInstance.connect(voterAdmin).addFactory([await clGaugeFactoryInstance.getAddress(), await newFactoryMock.getAddress()]),
        ).to.be.revertedWithCustomError(voterInstance, 'GaugeFactoryExist');

        await expect(
          voterInstance
            .connect(voterAdmin)
            .addFactory([await pairFactoryMockInstance.getAddress(), await clGaugeFactoryInstance.getAddress()]),
        ).to.be.revertedWithCustomError(voterInstance, 'PairFactoryExist');
      });
      it('Should corect add new factory', async () => {
        let gaugeNewFactory = await CLGaugeFactoryUpgradeable.deploy();
        let newFactoryMock = await PairFactoryMock.deploy();
        let tx = voterInstance.connect(voterAdmin).addFactory([await gaugeNewFactory.getAddress(), await newFactoryMock.getAddress()]);
        await expect(tx)
          .to.be.emit(voterInstance, 'AddFactories')
          .withArgs(await newFactoryMock.getAddress(), await gaugeNewFactory.getAddress());
      });
    });
    describe('#replaceFactory', async () => {
      it('Should fail if try setup ZERO_ADDRESS ', async () => {
        await expect(
          voterInstance.connect(voterAdmin).replaceFactory([await pairFactoryMockInstance.getAddress(), ZERO_ADDRESS], 0),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
        await expect(
          voterInstance.connect(voterAdmin).replaceFactory([ZERO_ADDRESS, await pairFactoryMockInstance.getAddress()], 0),
        ).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
      });
      it('Should fail if try setup not contract address', async () => {
        await expect(
          voterInstance.connect(voterAdmin).replaceFactory([voterAdmin.address, await pairFactoryMockInstance.getAddress()], 0),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
        await expect(
          voterInstance.connect(voterAdmin).replaceFactory([await pairFactoryMockInstance.getAddress(), voterAdmin.address], 0),
        ).to.be.revertedWithCustomError(voterInstance, 'NotContract');
      });
      it('Should fail if try setup to not exist position', async () => {
        let newFactoryMock = await PairFactoryMock.deploy();

        await expect(
          voterInstance.connect(voterAdmin).replaceFactory([await newFactoryMock.getAddress(), await newFactoryMock.getAddress()], 1),
        ).to.be.revertedWithPanic('0x32');
      });
      it('Should fail if replace by add exist factories', async () => {
        let newFactoryMock = await PairFactoryMock.deploy();

        await expect(
          voterInstance
            .connect(voterAdmin)
            .replaceFactory([await pairFactoryMockInstance.getAddress(), await newFactoryMock.getAddress()], 1),
        ).to.be.revertedWithCustomError(voterInstance, 'GaugeFactoryExist');
        await expect(
          voterInstance
            .connect(voterAdmin)
            .replaceFactory([await clGaugeFactoryInstance.getAddress(), await pairFactoryMockInstance.getAddress()], 1),
        ).to.be.revertedWithCustomError(voterInstance, 'PairFactoryExist');
      });
      it('Should corect replace gauge type factories to another', async () => {
        let newFactoryMock = await PairFactoryMock.deploy();
        let neCLGaugeFactory = await CLGaugeFactoryUpgradeable.deploy();

        expect(await voterInstance.factoryForGaugeTypeIsAdded(await pairFactoryMockInstance.getAddress())).to.be.true;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await clGaugeFactoryInstance.getAddress())).to.be.true;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await newFactoryMock.getAddress())).to.be.false;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await neCLGaugeFactory.getAddress())).to.be.false;

        expect(await voterInstance.gaugeTypes(0)).to.be.deep.equal([
          await clGaugeFactoryInstance.getAddress(),
          await pairFactoryMockInstance.getAddress(),
        ]);

        let tx = voterInstance
          .connect(voterAdmin)
          .replaceFactory([await neCLGaugeFactory.getAddress(), await newFactoryMock.getAddress()], 0);
        await expect(tx)
          .to.be.emit(voterInstance, 'SetGaugeFactory')
          .withArgs(await clGaugeFactoryInstance.getAddress(), await neCLGaugeFactory.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'SetPairFactory')
          .withArgs(await pairFactoryMockInstance.getAddress(), await newFactoryMock.getAddress());

        expect(await voterInstance.factoryForGaugeTypeIsAdded(await pairFactoryMockInstance.getAddress())).to.be.false;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await clGaugeFactoryInstance.getAddress())).to.be.false;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await newFactoryMock.getAddress())).to.be.true;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await neCLGaugeFactory.getAddress())).to.be.true;

        expect(await voterInstance.gaugeTypes(0)).to.be.deep.equal([
          await neCLGaugeFactory.getAddress(),
          await newFactoryMock.getAddress(),
        ]);
      });
    });
    describe('#removeFactory', async () => {
      it('Should fail if try remove not exist gauge type position', async () => {
        await expect(voterInstance.connect(voterAdmin).removeFactory(1)).to.be.revertedWithPanic('0x32');
      });
      it('Should corect remove gaugeType', async () => {
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await pairFactoryMockInstance.getAddress())).to.be.true;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await clGaugeFactoryInstance.getAddress())).to.be.true;
        expect(await voterInstance.gaugeTypes(0)).to.be.deep.equal([
          await clGaugeFactoryInstance.getAddress(),
          await pairFactoryMockInstance.getAddress(),
        ]);

        let tx = voterInstance.connect(voterAdmin).removeFactory(0);
        await expect(tx)
          .to.be.emit(voterInstance, 'SetGaugeFactory')
          .withArgs(await clGaugeFactoryInstance.getAddress(), ZERO_ADDRESS);
        await expect(tx)
          .to.be.emit(voterInstance, 'SetPairFactory')
          .withArgs(await pairFactoryMockInstance.getAddress(), ZERO_ADDRESS);

        expect(await voterInstance.factoryForGaugeTypeIsAdded(await pairFactoryMockInstance.getAddress())).to.be.false;
        expect(await voterInstance.factoryForGaugeTypeIsAdded(await clGaugeFactoryInstance.getAddress())).to.be.false;
        await expect(voterInstance.gaugeTypes(0)).to.be.reverted;
      });
    });
    describe('#whitelist', async () => {
      it('Should fail if try to add already whitelist token', async () => {
        let token = await ERC20MockFactory.deploy('T', 'T', 9);
        await expect(
          voterInstance.connect(governance).whitelist([await fenixInstance.getAddress(), await token.getAddress()]),
        ).to.be.revertedWithCustomError(voterInstance, 'TokenInWhitelist');
        await expect(
          voterInstance.connect(governance).whitelist([await token.getAddress(), await fenixInstance.getAddress()]),
        ).to.be.revertedWithCustomError(voterInstance, 'TokenInWhitelist');
      });
      it('Should fail if try to add not contract address', async () => {
        await expect(voterInstance.connect(governance).whitelist([governance.address])).to.be.revertedWithCustomError(
          voterInstance,
          'NotContract',
        );
      });
      it('Should corect add new token to whitelist and emit event', async () => {
        let token = await ERC20MockFactory.deploy('T', 'T', 9);

        expect(await voterInstance.isWhitelisted(await token.getAddress())).to.be.false;
        expect(await voterInstance.isWhitelisted(await usdcInstance.getAddress())).to.be.false;

        let tx = voterInstance.connect(governance).whitelist([await usdcInstance.getAddress(), await token.getAddress()]);
        await expect(tx)
          .to.be.emit(voterInstance, 'Whitelisted')
          .withArgs(governance.address, await token.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'Whitelisted')
          .withArgs(governance.address, await usdcInstance.getAddress());
        expect(await voterInstance.isWhitelisted(await token.getAddress())).to.be.true;
        expect(await voterInstance.isWhitelisted(await usdcInstance.getAddress())).to.be.true;
      });
    });
    describe('#createGauge', async () => {
      it('Should fail if try set pool which is not contract', async () => {
        await expect(voterInstance.connect(governance).createGauge(ZERO_ADDRESS, 0)).to.be.revertedWithCustomError(
          voterInstance,
          'NotContract',
        );

        let pool = await UniswapV2PoolMock.deploy();
        await pool.setToken0(await fenixInstance.getAddress());
        await pool.setToken1(await usdcInstance.getAddress());
        await pool.setSymbol('FNX-USDC Mock');

        await pairFactoryMockInstance.setIsPair(await pool.getAddress(), true);

        let result = await voterInstance.connect(governance).createGauge.staticCall(pool, 0);

        return CLGaugeUpgradeable.attach(result[0]) as CLGaugeUpgradeable;
      });
      it('Should fail if try to add not contract address', async () => {
        await expect(voterInstance.connect(governance).whitelist([governance.address])).to.be.revertedWithCustomError(
          voterInstance,
          'NotContract',
        );
      });
      it('Should corect add new token to whitelist and emit event', async () => {
        let token = await ERC20MockFactory.deploy('T', 'T', 9);

        expect(await voterInstance.isWhitelisted(await token.getAddress())).to.be.false;
        expect(await voterInstance.isWhitelisted(await usdcInstance.getAddress())).to.be.false;

        let tx = voterInstance.connect(governance).whitelist([await usdcInstance.getAddress(), await token.getAddress()]);
        await expect(tx)
          .to.be.emit(voterInstance, 'Whitelisted')
          .withArgs(governance.address, await token.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'Whitelisted')
          .withArgs(governance.address, await usdcInstance.getAddress());
        expect(await voterInstance.isWhitelisted(await token.getAddress())).to.be.true;
        expect(await voterInstance.isWhitelisted(await usdcInstance.getAddress())).to.be.true;
      });
    });
  });
  describe('Access control', async () => {
    describe('Should be called only from VOTER_ADMIN', async () => {
      describe('#setVoteDelay', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(voterInstance.connect(otheruser).setVoteDelay(500)).to.be.revertedWithCustomError(voterInstance, 'AccessDenied');
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          await voterInstance.connect(voterAdmin).setVoteDelay(50);
        });
      });
      describe('#setEmissionManager', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(voterInstance.connect(otheruser).setEmissionManager(otheruser.address)).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          await voterInstance.connect(voterAdmin).setEmissionManager(await emissionManagerImplementation.getAddress());
        });
      });
      describe('#setBribeFactory', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(voterInstance.connect(otheruser).setBribeFactory(otheruser.address)).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          await voterInstance.connect(voterAdmin).setBribeFactory(await bribeFactoryImplementation.getAddress());
        });
      });
      describe('#setPermissionsRegistry', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(voterInstance.connect(otheruser).setPermissionsRegistry(otheruser.address)).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          await voterInstance.connect(voterAdmin).setPermissionsRegistry(await permissionRegistryInstance.getAddress());
        });
      });
      describe('#setNewBribes', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(
            voterInstance.connect(otheruser).setNewBribes(otheruser.address, otheruser.address, otheruser.address),
          ).to.be.revertedWithCustomError(voterInstance, 'AccessDenied');
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          let gauge = await createGauge();
          let newIntBribe = await BribeUpgradeable.deploy();
          let newExtBribe = await BribeUpgradeable.deploy();
          await voterInstance
            .connect(voterAdmin)
            .setNewBribes(await gauge.getAddress(), await newIntBribe.getAddress(), await newExtBribe.getAddress());
        });
      });
      describe('#setInternalBribeFor', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(
            voterInstance.connect(otheruser).setInternalBribeFor(otheruser.address, otheruser.address),
          ).to.be.revertedWithCustomError(voterInstance, 'AccessDenied');
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          let gauge = await createGauge();

          let newExtBribe = await BribeUpgradeable.deploy();
          await voterInstance.connect(voterAdmin).setInternalBribeFor(await gauge.getAddress(), await newExtBribe.getAddress());
        });
      });
      describe('#setExternalBribeFor', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(
            voterInstance.connect(otheruser).setExternalBribeFor(otheruser.address, otheruser.address),
          ).to.be.revertedWithCustomError(voterInstance, 'AccessDenied');
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          let gauge = await createGauge();

          let newExtBribe = await BribeUpgradeable.deploy();
          await voterInstance.connect(voterAdmin).setExternalBribeFor(await gauge.getAddress(), await newExtBribe.getAddress());
        });
      });
      describe('#addFactory', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(voterInstance.connect(otheruser).addFactory([otheruser.address, otheruser.address])).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          let pairFactoryNew = await PairFactoryMock.deploy();
          await voterInstance.connect(voterAdmin).addFactory([await clGaugeImplementation.getAddress(), await pairFactoryNew.getAddress()]);
        });
      });
      describe('#replaceFactory', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(
            voterInstance.connect(otheruser).replaceFactory([otheruser.address, otheruser.address], 0),
          ).to.be.revertedWithCustomError(voterInstance, 'AccessDenied');
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          let clGaugeFactory = await CLGaugeFactoryUpgradeable.deploy();
          let mockPairFactory = await PairFactoryMock.deploy();

          await voterInstance.connect(voterAdmin).replaceFactory(
            {
              gaugeFactory: await clGaugeFactory.getAddress(),
              pairFactory: await mockPairFactory.getAddress(),
            },
            0,
          );
        });
      });
      describe('#removeFactory', async () => {
        it('Should fail if call from not VOTER_ADMIN address', async () => {
          await expect(voterInstance.connect(otheruser).removeFactory(0)).to.be.revertedWithCustomError(voterInstance, 'AccessDenied');
        });
        it('Should sucess if call from VOTER_ADMIN address', async () => {
          await voterInstance.connect(voterAdmin).removeFactory(0);
        });
      });
    });
    describe('Should be called only from GOVERNANCE', async () => {
      describe('#whitelist', async () => {
        it('Should fail if call from not GOVERNANCE address', async () => {
          await expect(voterInstance.connect(otheruser).whitelist([await usdcInstance.getAddress()])).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from GOVERNANCE address', async () => {
          await voterInstance.connect(governance).whitelist([await usdcInstance.getAddress()]);
        });
      });
      describe('#blacklist', async () => {
        it('Should fail if call from not GOVERNANCE address', async () => {
          await expect(voterInstance.connect(otheruser).blacklist([await usdcInstance.getAddress()])).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from GOVERNANCE address', async () => {
          await voterInstance.connect(governance).whitelist([await usdcInstance.getAddress()]);

          await voterInstance.connect(governance).blacklist([await usdcInstance.getAddress()]);
        });
      });
      describe('#killGauge', async () => {
        it('Should fail if call from not GOVERNANCE address', async () => {
          await expect(voterInstance.connect(otheruser).killGauge(otheruser.address)).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from GOVERNANCE address', async () => {
          let gauge = await createGauge();
          await voterInstance.connect(governance).killGauge(await gauge.getAddress());
        });
      });
      describe('#reviveGauge', async () => {
        it('Should fail if call from not GOVERNANCE address', async () => {
          await expect(voterInstance.connect(otheruser).reviveGauge(otheruser.address)).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from GOVERNANCE address', async () => {
          let gauge = await createGauge();
          await voterInstance.connect(governance).killGauge(await gauge.getAddress());
          await voterInstance.connect(governance).reviveGauge(await gauge.getAddress());
        });
      });
    });
    describe('Should be called only from EMISSION_MANAGER', async () => {
      describe('#notifyRewardAmount', async () => {
        it('Should fail if call from not EMISSION_MANAGER address', async () => {
          await expect(voterInstance.connect(otheruser).notifyRewardAmount(ONE_ETHER)).to.be.revertedWithCustomError(
            voterInstance,
            'AccessDenied',
          );
        });
        it('Should sucess if call from EMISSION_MANAGER address', async () => {
          expect.fail();
        });
      });
    });
  });
});

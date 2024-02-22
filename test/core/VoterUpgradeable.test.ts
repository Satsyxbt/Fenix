import { ethers } from 'hardhat';
import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable__factory,
  ERC20Mock,
  ERC20Mock__factory,
  Fenix,
  Fenix__factory,
  MinterUpgradeable,
  ProxyAdmin,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
  VeArtProxyUpgradeable,
  VeArtProxyUpgradeable__factory,
  VoterUpgradeable,
  VoterUpgradeable__factory,
  VotingEscrowUpgradeable,
  VotingEscrowUpgradeable__factory,
} from '../../typechain-types/index';
import { ERRORS, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';
import completeFixture, { CoreFixtureDeployed, SignersList, getSigners } from '../utils/coreFixture';
import { getSigner } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('VoterUpgradeable Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;
  let voterInstance: VoterUpgradeable;
  let votingEscrowInstance: VotingEscrowUpgradeable;
  let fenixInstance: Fenix;
  let emissionManagerInstance: MinterUpgradeable;
  let bribeFactoryInstance: BribeFactoryUpgradeable;

  before(async function () {
    signers = await getSigners();
    deployed = await loadFixture(completeFixture);
    voterInstance = deployed.voter;
    votingEscrowInstance = deployed.votingEscrow;
    emissionManagerInstance = deployed.minter;
    bribeFactoryInstance = deployed.bribeFactory;
  });

  describe('Deployment', async () => {
    describe('Should corect setup initial settings', async () => {
      it('Should corect setup initial settings', async () => {
        expect(await voterInstance._ve()).to.be.equal(await votingEscrowInstance.getAddress());
        expect(await voterInstance.bribefactory()).to.be.equal(await bribeFactoryInstance.getAddress());
        expect(await voterInstance.minter()).to.be.equal(await emissionManagerInstance.getAddress());
        expect(await voterInstance.VOTE_DELAY()).to.be.equal(ZERO);
        expect(await voterInstance.isWhitelisted(await fenixInstance.getAddress())).to.be.true;
        expect(await voterInstance.gaugeFactories()).to.be.deep.equal([deployed.gaugeFactory.target]);
        expect(await voterInstance.bribefactory()).to.be.deep.equal([deployed.bribeFactory.target]);
        expect(await voterInstance.factories()).to.be.deep.equal([deployed.v2PairFactory.target]);
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
        expect(await voterInstance.VOTE_DELAY()).to.be.equal(ZERO);
        let tx = await voterInstance.connect(voterAdmin).setVoteDelay(86400);
        await expect(tx).to.be.emit(voterInstance, 'SetVoteDelay').withArgs(0, 86400);
        expect(await voterInstance.VOTE_DELAY()).to.be.equal(86400);
      });
    });
    describe('#setEmissionManager', async () => {
      it('Should fail if try setup ZERO_ADDRESS', async () => {
        await expect(voterInstance.connect(voterAdmin).setMinter(ZERO_ADDRESS)).to.be.revertedWithCustomError(voterInstance, 'ZeroAdress');
      });
      it('Should fail if try setup not contract address', async () => {
        await expect(voterInstance.connect(voterAdmin).setMinter(voterAdmin.address)).to.be.revertedWithCustomError(
          voterInstance,
          'NotContract',
        );
      });
      it('Should corect setup new emission manager and emit event', async () => {
        expect(await voterInstance.minter()).to.be.equal(await emissionManagerInstance.getAddress());
        let tx = await voterInstance.connect(voterAdmin).setMinter(await emissionManagerImplementation.getAddress());
        await expect(tx)
          .to.be.emit(voterInstance, 'SetMinter')
          .withArgs(await emissionManagerInstance.getAddress(), await emissionManagerImplementation.getAddress());
        expect(await voterInstance.minter()).to.be.equal(await emissionManagerImplementation.getAddress());
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

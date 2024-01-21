import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { BEACON_IMPLEMENTATION_SLOT, ERRORS, ONE, ONE_ETHER, ONE_GWEI, ZERO, ZERO_ADDRESS } from './utils/constants';
import { ethers } from 'hardhat';
import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable,
  BribeUpgradeable__factory,
  ERC20Mock,
  PermissionsRegistry,
  PermissionsRegistry__factory,
  TransparentUpgradeableProxy__factory,
  VoteMock,
  VoteMock__factory,
  ImplementationMock,
} from '../typechain-types';
import { deployToken } from './utils/fixture';
import { token } from '../typechain-types/@openzeppelin/contracts';

describe('BribeFactoryUpgradeable Contract', function () {
  let deployer: HardhatEthersSigner;
  let fenixMultisig: HardhatEthersSigner;
  let proxyAdmin: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;
  let votinEscrow: HardhatEthersSigner;
  let minter: HardhatEthersSigner;

  let others: HardhatEthersSigner[];

  let bribeFactoryUpgradeableFactory: BribeFactoryUpgradeable__factory;
  let bribeFactoryUpgradeableImplementation: BribeFactoryUpgradeable;
  let bribeFactoryUpgradeableProxy: BribeFactoryUpgradeable;

  let factoryProxy: TransparentUpgradeableProxy__factory;

  let permissionRegistryFactory: PermissionsRegistry__factory;
  let permissionRegistry: PermissionsRegistry;

  let voteMockFactory: VoteMock__factory;
  let voteMock: VoteMock;

  let bribeUpgradeableFactory: BribeUpgradeable__factory;
  let bribeUpgradeableImpementation: BribeUpgradeable;

  let implementaionMockInstance: ImplementationMock;

  let token18: ERC20Mock;
  let token9: ERC20Mock;
  let token6: ERC20Mock;
  let token5: ERC20Mock;

  let snapshot: SnapshotRestorer;

  async function getNewBribeFactoryProxy() {
    let newProxy = await factoryProxy.deploy(await bribeFactoryUpgradeableImplementation.getAddress(), proxyAdmin.address, '0x');
    return bribeFactoryUpgradeableFactory.attach(await newProxy.getAddress()) as BribeFactoryUpgradeable;
  }

  async function createBribe(owner: string, token0: string, token1: string, typeStr: string) {
    await bribeFactoryUpgradeableProxy.createBribe(owner, token0, token1, typeStr);
    return bribeUpgradeableFactory.attach(await bribeFactoryUpgradeableProxy.lastBribe()) as BribeUpgradeable;
  }

  before(async function () {
    [deployer, fenixMultisig, proxyAdmin, otherUser, votinEscrow, minter, ...others] = await ethers.getSigners();

    factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;

    bribeFactoryUpgradeableFactory = await ethers.getContractFactory('BribeFactoryUpgradeable');
    bribeFactoryUpgradeableImplementation = (await bribeFactoryUpgradeableFactory.deploy()) as BribeFactoryUpgradeable;

    permissionRegistryFactory = await ethers.getContractFactory('PermissionsRegistry');
    permissionRegistry = await permissionRegistryFactory.connect(fenixMultisig).deploy();

    bribeUpgradeableFactory = await ethers.getContractFactory('BribeUpgradeable');
    bribeUpgradeableImpementation = (await bribeUpgradeableFactory.deploy()) as BribeUpgradeable;

    voteMockFactory = await ethers.getContractFactory('VoteMock');
    voteMock = (await voteMockFactory.deploy(votinEscrow.address, minter.address)) as VoteMock;

    implementaionMockInstance = (await (await ethers.getContractFactory('ImplementationMock')).deploy()) as ImplementationMock;

    bribeFactoryUpgradeableProxy = await getNewBribeFactoryProxy();
    token18 = await deployToken('Token18', 'T18', 18);
    token9 = await deployToken('Token9', 'T9', 9);
    token6 = await deployToken('Token6', 'T6', 6);
    token5 = await deployToken('Token5', 'T5', 5);

    await bribeFactoryUpgradeableProxy.initialize(
      await voteMock.getAddress(),
      await permissionRegistry.getAddress(),
      await bribeUpgradeableImpementation.getAddress(),
      [await token18.getAddress(), await token9.getAddress()],
    );

    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  describe('Deployment', async function () {
    it('Should fail if try call initialize on implementation', async function () {
      await expect(
        bribeFactoryUpgradeableImplementation.initialize(
          await voteMock.getAddress(),
          await permissionRegistry.getAddress(),
          await bribeUpgradeableImpementation.getAddress(),
          [await token18.getAddress(), await token9.getAddress()],
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should fail if try second time to initialize', async function () {
      await expect(
        bribeFactoryUpgradeableProxy.initialize(
          await voteMock.getAddress(),
          await permissionRegistry.getAddress(),
          await bribeUpgradeableImpementation.getAddress(),
          [await token18.getAddress(), await token9.getAddress()],
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should correct set initial settings', async function () {
      expect(await bribeFactoryUpgradeableProxy.owner()).to.be.equal(deployer.address);
      expect(await bribeFactoryUpgradeableProxy.voter()).to.be.equal(await voteMock.getAddress());
      expect(await bribeFactoryUpgradeableProxy.lastBribe()).to.be.equal(ZERO_ADDRESS);
      expect(await bribeFactoryUpgradeableProxy.permissionsRegistry()).to.be.equal(await permissionRegistry.getAddress());
      expect(await bribeFactoryUpgradeableProxy.implementation()).to.be.equal(await bribeUpgradeableImpementation.getAddress());
    });
    it('Should correct set default reward tokens', async function () {
      expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token18.getAddress())).to.be.true;
      expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token9.getAddress())).to.be.true;
      expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token6.getAddress())).to.be.false;
      expect(await bribeFactoryUpgradeableProxy.getDefaultRewardTokens()).to.be.deep.equal([
        await token18.getAddress(),
        await token9.getAddress(),
      ]);
    });
    it('Should fail if one of main address is zero', async function () {
      let proxy = await getNewBribeFactoryProxy();

      await expect(
        proxy.initialize(ZERO_ADDRESS, await permissionRegistry.getAddress(), await bribeFactoryUpgradeableImplementation.getAddress(), [
          await token18.getAddress(),
          await token9.getAddress(),
        ]),
      ).to.be.revertedWithCustomError(proxy, 'ZeroAddress');

      await expect(
        proxy.initialize(await voteMock.getAddress(), ZERO_ADDRESS, await bribeFactoryUpgradeableImplementation.getAddress(), [
          await token18.getAddress(),
          await token9.getAddress(),
        ]),
      ).to.be.revertedWithCustomError(proxy, 'ZeroAddress');

      await expect(
        proxy.initialize(
          await voteMock.getAddress(),
          await permissionRegistry.getAddress(),
          await bribeUpgradeableImpementation.getAddress(),
          [ZERO_ADDRESS],
        ),
      ).to.be.revertedWithCustomError(proxy, 'ZeroAddress');

      await expect(
        proxy.initialize(await voteMock.getAddress(), await permissionRegistry.getAddress(), ZERO_ADDRESS, [
          await token18.getAddress(),
          await token9.getAddress(),
        ]),
      ).to.be.revertedWithCustomError(proxy, 'AddressNotContract');
    });
    it('Should fail if provided equal default tokens addresses', async function () {
      let proxy = await getNewBribeFactoryProxy();

      await expect(
        proxy.initialize(
          await voteMock.getAddress(),
          await permissionRegistry.getAddress(),
          await bribeUpgradeableImpementation.getAddress(),
          [await token18.getAddress(), await token18.getAddress()],
        ),
      ).to.be.revertedWithCustomError(proxy, 'RewardTokenExist');
    });
  });
  describe('Upgrade bribes', async function () {
    it('Should corect upgrades all bribes to new implementation', async function () {
      expect(await bribeFactoryUpgradeableProxy.implementation()).to.be.equal(await bribeUpgradeableImpementation.getAddress());

      let bribe1 = await createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
      let bribe2 = await createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 2');
      let bribe3 = await createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 3');

      await bribeFactoryUpgradeableProxy.upgradeProxiesTo(await implementaionMockInstance.getAddress());

      let factory = await ethers.getContractFactory('ImplementationMock');
      expect(await (factory.attach(bribe1) as ImplementationMock).bribeVersion()).to.be.equal('Bribe Mock');
      expect(await (factory.attach(bribe2) as ImplementationMock).bribeVersion()).to.be.equal('Bribe Mock');
      expect(await (factory.attach(bribe3) as ImplementationMock).bribeVersion()).to.be.equal('Bribe Mock');

      expect(await bribeFactoryUpgradeableProxy.implementation()).to.be.equal(await implementaionMockInstance.getAddress());
    });
  });
  describe('Create bribe', async function () {
    it('Should fail if try to create bribe with incorrect parameter', async function () {
      await expect(
        bribeFactoryUpgradeableProxy.createBribe(ZERO_ADDRESS, await token18.getAddress(), await token9.getAddress(), 'Bribe Type 1'),
      ).to.be.reverted;
    });
    describe('Should corectly create new bribe', async function () {
      let deployedTx: any;
      let deployedBribeAddress: string;
      beforeEach(async function () {
        deployedBribeAddress = await bribeFactoryUpgradeableProxy.createBribe.staticCall(
          fenixMultisig.address,
          await token6.getAddress(),
          ZERO_ADDRESS,
          'Bribe Type 1',
        );
        deployedTx = await bribeFactoryUpgradeableProxy.createBribe(
          fenixMultisig.address,
          await token6.getAddress(),
          await token5.getAddress(),
          'Bribe Type 1',
        );
      });
      it('Should corect emit event after deploy new bribe', async function () {
        await expect(deployedTx).to.emit(bribeFactoryUpgradeableProxy, 'BribeCreated').withArgs(deployedBribeAddress);
      });
      it('Should corect return newBribe address', async function () {
        expect(await bribeFactoryUpgradeableProxy.lastBribe()).to.be.equal(deployedBribeAddress);
      });

      it('Should corect initialize deployead bribe', async function () {
        let bribe = bribeUpgradeableFactory.attach(deployedBribeAddress) as BribeUpgradeable;
        expect(await bribe.voter()).to.be.equal(await bribeFactoryUpgradeableProxy.voter());
        expect(await bribe.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe.bribeFactory()).to.be.equal(await bribeFactoryUpgradeableProxy.getAddress());
        expect(await bribe.TYPE()).to.be.equal('Bribe Type 1');

        expect(await bribe.getRewardTokens()).to.be.deep.equal([
          await token6.getAddress(),
          await token5.getAddress(),
          await token18.getAddress(),
          await token9.getAddress(),
        ]);
        expect(await bribe.getRewardTokens()).to.have.length(4);
      });
      it('Deployed bribe should get implementation from factory implementation slot', async function () {
        expect('0x' + (await ethers.provider.getStorage(deployedBribeAddress, BEACON_IMPLEMENTATION_SLOT)).substring(26)).to.be.equal(
          (await bribeFactoryUpgradeableProxy.getAddress()).toLowerCase(),
        );
      });
      it('Deployed bribe should be added to bribe list', async function () {
        expect(await bribeFactoryUpgradeableProxy.lastBribe()).to.be.equal(deployedBribeAddress);
        expect(await bribeFactoryUpgradeableProxy.length()).to.be.equal(1);
        expect(await bribeFactoryUpgradeableProxy.list(0, 10)).to.be.deep.equal([deployedBribeAddress]);
      });
    });
    describe('Should corectly create bribe without token1 and token2', async function () {
      let deployedBribeAddress: string;
      beforeEach(async function () {
        deployedBribeAddress = await bribeFactoryUpgradeableProxy.createBribe.staticCall(
          fenixMultisig.address,
          await token6.getAddress(),
          ZERO_ADDRESS,
          'Bribe Type 1',
        );
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'Bribe Type 1');
      });

      it('Should corect initialize deployead bribe', async function () {
        let bribe = bribeUpgradeableFactory.attach(deployedBribeAddress) as BribeUpgradeable;
        expect(await bribe.voter()).to.be.equal(await bribeFactoryUpgradeableProxy.voter());
        expect(await bribe.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe.bribeFactory()).to.be.equal(await bribeFactoryUpgradeableProxy.getAddress());
        expect(await bribe.TYPE()).to.be.equal('Bribe Type 1');
        expect(await bribe.getRewardTokens()).to.be.deep.equal([await token18.getAddress(), await token9.getAddress()]);
        expect(await bribe.getRewardTokens()).to.have.length(2);
      });
    });
  });
  describe('Functions', async function () {
    describe('#pushDefaultRewardToken', async function () {
      it('Should fail if reward token aldready exists', async function () {
        await expect(bribeFactoryUpgradeableProxy.pushDefaultRewardToken(await token18.getAddress())).to.be.revertedWithCustomError(
          bribeFactoryUpgradeableProxy,
          'RewardTokenExist',
        );
      });
      it('Should fail if try to add zero address', async function () {
        await expect(bribeFactoryUpgradeableProxy.pushDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          bribeFactoryUpgradeableProxy,
          'ZeroAddress',
        );
      });
      it('Should corectly add new token and start added to future bribes', async function () {
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token5.getAddress())).to.be.false;
        expect(await bribeFactoryUpgradeableProxy.pushDefaultRewardToken(await token5.getAddress()));
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token5.getAddress())).to.be.true;
        let bribe = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type');
        expect(await bribe.getRewardTokens()).to.be.deep.equal([
          await token18.getAddress(),
          await token9.getAddress(),
          await token5.getAddress(),
        ]);
        expect(await bribe.getRewardTokens()).to.have.length(3);

        expect(await bribeFactoryUpgradeableProxy.getDefaultRewardTokens()).to.be.deep.equal([
          await token18.getAddress(),
          await token9.getAddress(),
          await token5.getAddress(),
        ]);
      });
    });
    describe('#removeDefaultRewardToken', async function () {
      it('Should fail if reward token not exists', async function () {
        await expect(bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token5.getAddress())).to.be.revertedWithCustomError(
          bribeFactoryUpgradeableProxy,
          'RewardTokenNotExist',
        );
      });
      it('Should fail if try to remove zero address', async function () {
        await expect(bribeFactoryUpgradeableProxy.removeDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          bribeFactoryUpgradeableProxy,
          'ZeroAddress',
        );
      });
      it('Should corectly remove token and start skip for future bribes', async function () {
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token18.getAddress())).to.be.true;
        expect(await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress()));
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token18.getAddress())).to.be.false;

        let bribe = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type');

        expect(await bribe.getRewardTokens()).to.be.deep.equal([await token9.getAddress()]);
        expect(await bribeFactoryUpgradeableProxy.getDefaultRewardTokens()).to.be.deep.equal([await token9.getAddress()]);
      });
    });
    describe('#setPermissionsRegistry', async function () {
      it('Should fail if try to set zero address', async function () {
        await expect(bribeFactoryUpgradeableProxy.setPermissionsRegistry(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          bribeFactoryUpgradeableProxy,
          'ZeroAddress',
        );
      });
      it('Should corectly set new permisison registry address', async function () {
        let newRegistry = await permissionRegistryFactory.deploy();
        expect(await bribeFactoryUpgradeableProxy.permissionsRegistry()).to.be.equal(await permissionRegistry.getAddress());
        let tx = await bribeFactoryUpgradeableProxy.setPermissionsRegistry(await newRegistry.getAddress());
        expect(await bribeFactoryUpgradeableProxy.permissionsRegistry()).to.be.equal(await newRegistry.getAddress());

        await expect(tx)
          .to.be.emit(bribeFactoryUpgradeableProxy, 'SetPermissionRegistry')
          .withArgs(await newRegistry.getAddress());
      });
    });
    describe('#setVoter', async function () {
      it('Should fail if try to set zero address', async function () {
        await expect(bribeFactoryUpgradeableProxy.setVoter(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          bribeFactoryUpgradeableProxy,
          'ZeroAddress',
        );
      });
      it('Should corectly set new voter address', async function () {
        let voter = await voteMockFactory.deploy(votinEscrow.address, minter.address);
        expect(await bribeFactoryUpgradeableProxy.voter()).to.be.equal(await voteMock.getAddress());
        let tx = await bribeFactoryUpgradeableProxy.setVoter(await voter.getAddress());
        expect(await bribeFactoryUpgradeableProxy.voter()).to.be.equal(await voter.getAddress());

        await expect(tx)
          .to.be.emit(bribeFactoryUpgradeableProxy, 'SetVoter')
          .withArgs(await voter.getAddress());
      });
    });
    describe('#setBribesOwner', async function () {
      it('Should corectly set new bribe owner for list of bribes', async function () {
        let bribe = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');
        let bribe3 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 3');
        let bribe4 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 4');
        let bribe5 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 5');
        expect(await bribe.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe2.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe3.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe4.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe5.owner()).to.be.equal(fenixMultisig.address);

        await bribeFactoryUpgradeableProxy.setBribesOwner([await bribe2.getAddress(), await bribe4.getAddress()], deployer.address);

        expect(await bribe.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe2.owner()).to.be.equal(deployer.address);
        expect(await bribe3.owner()).to.be.equal(fenixMultisig.address);
        expect(await bribe4.owner()).to.be.equal(deployer.address);
        expect(await bribe5.owner()).to.be.equal(fenixMultisig.address);
      });
    });
    describe('#setBribesEmissionManager', async function () {
      it('Should corectly set new minter owner for list of bribes', async function () {
        let bribe = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');
        let bribe3 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 3');
        let bribe4 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 4');
        let bribe5 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 5');
        expect(await bribe.emissionManager()).to.be.equal(minter.address);
        expect(await bribe2.emissionManager()).to.be.equal(minter.address);
        expect(await bribe3.emissionManager()).to.be.equal(minter.address);
        expect(await bribe4.emissionManager()).to.be.equal(minter.address);
        expect(await bribe5.emissionManager()).to.be.equal(minter.address);

        await bribeFactoryUpgradeableProxy.setBribesEmissionManager(
          [await bribe3.getAddress(), await bribe5.getAddress()],
          deployer.address,
        );

        expect(await bribe.emissionManager()).to.be.equal(minter.address);
        expect(await bribe2.emissionManager()).to.be.equal(minter.address);
        expect(await bribe3.emissionManager()).to.be.equal(deployer.address);
        expect(await bribe4.emissionManager()).to.be.equal(minter.address);
        expect(await bribe5.emissionManager()).to.be.equal(deployer.address);
      });
    });
    describe('#setBribesVoter', async function () {
      it('Should corectly set new  voter for list of bribes', async function () {
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');
        let bribe3 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 3');
        let bribe4 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 4');
        let bribe5 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 5');
        expect(await bribe1.voter()).to.be.equal(await voteMock.getAddress());
        expect(await bribe2.voter()).to.be.equal(await voteMock.getAddress());
        expect(await bribe3.voter()).to.be.equal(await voteMock.getAddress());
        expect(await bribe4.voter()).to.be.equal(await voteMock.getAddress());
        expect(await bribe5.voter()).to.be.equal(await voteMock.getAddress());

        await bribeFactoryUpgradeableProxy.setBribesVoter([await bribe1.getAddress(), await bribe2.getAddress()], deployer.address);

        expect(await bribe1.voter()).to.be.equal(deployer.address);
        expect(await bribe2.voter()).to.be.equal(deployer.address);
        expect(await bribe3.voter()).to.be.equal(await voteMock.getAddress());
        expect(await bribe4.voter()).to.be.equal(await voteMock.getAddress());
        expect(await bribe5.voter()).to.be.equal(await voteMock.getAddress());
      });
    });
    describe('#addRewardTokensToBribes', async function () {
      it('Should fail if provide arraies with mismtach array lenghh', async function () {
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe3 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');

        await expect(
          bribeFactoryUpgradeableProxy.addRewardTokensToBribes(
            [[await token18.getAddress(), await token5.getAddress()]],
            [await bribe1.getAddress(), await bribe3.getAddress()],
          ),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'MismatchArrayLen');
      });
      it('Should corectly add reward tokens to bribes', async function () {
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress());
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token9.getAddress());
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');
        let bribe3 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 3');
        expect(await bribe1.getRewardTokens()).to.be.deep.equal([]);
        expect(await bribe2.getRewardTokens()).to.be.deep.equal([]);
        expect(await bribe3.getRewardTokens()).to.be.deep.equal([]);

        await bribeFactoryUpgradeableProxy.addRewardTokensToBribes(
          [[await token18.getAddress(), await token5.getAddress()], [await token9.getAddress()]],
          [await bribe1.getAddress(), await bribe3.getAddress()],
        );
        expect(await bribe1.getRewardTokens()).to.be.deep.equal([await token18.getAddress(), await token5.getAddress()]);

        expect(await bribe2.getRewardTokens()).to.be.deep.equal([]);
        expect(await bribe3.getRewardTokens()).to.be.deep.equal([await token9.getAddress()]);
      });
    });
    describe('#addRewardTokensToBribe', async function () {
      it('Should corectly add reward tokens to bribe', async function () {
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress());
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token9.getAddress());
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        expect(await bribe1.getRewardTokens()).to.be.deep.equal([]);

        await bribeFactoryUpgradeableProxy.addRewardTokensToBribe(
          [await token18.getAddress(), await token5.getAddress()],
          await bribe1.getAddress(),
        );

        expect(await bribe1.getRewardTokens()).to.be.deep.equal([await token18.getAddress(), await token5.getAddress()]);
      });
    });
    describe('#addRewardTokenToBribe', async function () {
      it('Should corectly add reward token to bribe', async function () {
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress());
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token9.getAddress());
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        expect(await bribe1.getRewardTokens()).to.be.deep.equal([]);

        await bribeFactoryUpgradeableProxy.addRewardTokenToBribe(token18.getAddress(), await bribe1.getAddress());
        expect(await bribe1.getRewardTokens()).to.be.deep.equal([await token18.getAddress()]);
      });
    });
    describe('#addRewardTokenToBribes', async function () {
      it('Should corectly add reward token to bribes', async function () {
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress());
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token9.getAddress());
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');

        expect(await bribe1.getRewardTokens()).to.be.deep.equal([]);
        expect(await bribe2.getRewardTokens()).to.be.deep.equal([]);

        await bribeFactoryUpgradeableProxy.addRewardTokenToBribes(token18.getAddress(), [
          await bribe1.getAddress(),
          await bribe2.getAddress(),
        ]);
        expect(await bribe1.getRewardTokens()).to.be.deep.equal([await token18.getAddress()]);
        expect(await bribe2.getRewardTokens()).to.be.deep.equal([await token18.getAddress()]);
      });
    });

    describe('#recoverERC20AndUpdateData', async function () {
      it('Should fail if provide arraies with mismtach array lenghh', async function () {
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');

        await expect(
          bribeFactoryUpgradeableProxy.recoverERC20AndUpdateData(
            [await bribe1.getAddress(), await bribe2.getAddress()],
            [await token18.getAddress()],
            [1],
          ),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'MismatchArrayLen');
        await expect(
          bribeFactoryUpgradeableProxy.recoverERC20AndUpdateData(
            [await bribe1.getAddress()],
            [await token18.getAddress(), await token9.getAddress()],
            [1],
          ),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'MismatchArrayLen');
        await expect(
          bribeFactoryUpgradeableProxy.recoverERC20AndUpdateData([await bribe1.getAddress()], [await token18.getAddress()], [1, 2]),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'MismatchArrayLen');
      });
      it('Should skip call if token amount is zero', async function () {
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');
        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);

        await bribeFactoryUpgradeableProxy.recoverERC20AndUpdateData(
          [await bribe1.getAddress(), await bribe2.getAddress()],
          [await token18.getAddress(), await token9.getAddress()],
          [0, 0],
        );
        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
      });
      it('Should corectly transfer ERC20 tokens from bribe to recipient', async function () {
        let newMinter = await (await ethers.getContractFactory('EmissionManagerUpgradeable')).deploy();
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');

        await token18.mint(deployer.address, ONE_ETHER);
        await token9.mint(deployer.address, ONE_GWEI);

        await token18.approve(await bribe1.getAddress(), ONE_ETHER);
        await token9.approve(await bribe2.getAddress(), ONE_GWEI);

        await bribeFactoryUpgradeableProxy.setBribesEmissionManager(
          [await bribe1.getAddress(), await bribe2.getAddress()],
          await newMinter.getAddress(),
        );

        await bribe1.notifyRewardAmount(await token18.getAddress(), ONE_ETHER);
        await bribe2.notifyRewardAmount(await token9.getAddress(), ONE_GWEI);

        expect(await token18.balanceOf(await bribe1.getAddress())).to.be.equal(ONE_ETHER);
        expect(await token9.balanceOf(await bribe2.getAddress())).to.be.equal(ONE_GWEI);

        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);

        let tx = bribeFactoryUpgradeableProxy.recoverERC20AndUpdateData(
          [await bribe1.getAddress(), await bribe2.getAddress()],
          [await token18.getAddress(), await token9.getAddress()],
          [1, 2],
        );
        await expect(tx).to.changeTokenBalances(token18, [await bribe1.getAddress(), fenixMultisig.address], [-1, +1]);
        await expect(tx).to.changeTokenBalances(token9, [await bribe2.getAddress(), fenixMultisig.address], [-2, +2]);
        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(1);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(2);
      });
    });
    describe('#emergencyRecoverERC20', async function () {
      it('Should fail if provide arraies with mismtach array lenghh', async function () {
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');

        await expect(
          bribeFactoryUpgradeableProxy.emergencyRecoverERC20(
            [await bribe1.getAddress(), await bribe2.getAddress()],
            [await token18.getAddress()],
            [1],
          ),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'MismatchArrayLen');
        await expect(
          bribeFactoryUpgradeableProxy.emergencyRecoverERC20(
            [await bribe1.getAddress()],
            [await token18.getAddress(), await token9.getAddress()],
            [1],
          ),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'MismatchArrayLen');
        await expect(
          bribeFactoryUpgradeableProxy.emergencyRecoverERC20([await bribe1.getAddress()], [await token18.getAddress()], [1, 2]),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'MismatchArrayLen');
      });
      it('Should skip call if token amount is zero', async function () {
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');
        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);

        await bribeFactoryUpgradeableProxy.emergencyRecoverERC20(
          [await bribe1.getAddress(), await bribe2.getAddress()],
          [await token18.getAddress(), await token9.getAddress()],
          [0, 0],
        );
        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
      });
      it('Should corectly transfer ERC20 tokens from bribe to recipient and update', async function () {
        let bribe1 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 1');
        let bribe2 = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type 2');
        await token18.mint(await bribe1.getAddress(), ONE_ETHER);
        await token9.mint(await bribe2.getAddress(), ONE_GWEI);

        expect(await token18.balanceOf(await bribe1.getAddress())).to.be.equal(ONE_ETHER);
        expect(await token9.balanceOf(await bribe2.getAddress())).to.be.equal(ONE_GWEI);

        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(ZERO);

        let tx = bribeFactoryUpgradeableProxy.emergencyRecoverERC20(
          [await bribe1.getAddress(), await bribe2.getAddress()],
          [await token18.getAddress(), await token9.getAddress()],
          [1, 2],
        );
        await expect(tx).to.changeTokenBalances(token18, [await bribe1.getAddress(), fenixMultisig.address], [-1, +1]);
        await expect(tx).to.changeTokenBalances(token9, [await bribe2.getAddress(), fenixMultisig.address], [-2, +2]);

        expect(await token18.balanceOf(fenixMultisig.address)).to.be.equal(1);
        expect(await token9.balanceOf(fenixMultisig.address)).to.be.equal(2);
      });
    });
  });
  describe('View functions', async function () {
    describe('#getDefaultRewardTokens', async function () {
      it('Should corectly return list after initialize', async function () {
        expect(await bribeFactoryUpgradeableProxy.getDefaultRewardTokens()).to.be.deep.equal([
          await token18.getAddress(),
          await token9.getAddress(),
        ]);
      });

      it('Should corectly return empty list', async function () {
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress());
        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token9.getAddress());
        expect(await bribeFactoryUpgradeableProxy.getDefaultRewardTokens()).to.be.empty;
      });
      it('Should corectly return list after added new default reward token', async function () {
        await bribeFactoryUpgradeableProxy.pushDefaultRewardToken(await token6.getAddress());
        expect(await bribeFactoryUpgradeableProxy.getDefaultRewardTokens()).to.be.deep.equal([
          await token18.getAddress(),
          await token9.getAddress(),
          await token6.getAddress(),
        ]);
      });
      it('Should corectly return list with 4 elements', async function () {
        await bribeFactoryUpgradeableProxy.pushDefaultRewardToken(await token6.getAddress());
        await bribeFactoryUpgradeableProxy.pushDefaultRewardToken(await token5.getAddress());

        expect(await bribeFactoryUpgradeableProxy.getDefaultRewardTokens()).to.be.deep.equal([
          await token18.getAddress(),
          await token9.getAddress(),
          await token6.getAddress(),
          await token5.getAddress(),
        ]);
      });
    });
    describe('#isDefaultRewardToken', async function () {
      it('Should corectly return status for not default reward token', async function () {
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token6.getAddress())).to.be.false;
      });
      it('Should corectly return status for default reward token', async function () {
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token18.getAddress())).to.be.true;
      });
      it('Should corectly return status for default reward token after push/remove', async function () {
        await bribeFactoryUpgradeableProxy.pushDefaultRewardToken(await token6.getAddress());
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token6.getAddress())).to.be.true;

        await bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress());
        expect(await bribeFactoryUpgradeableProxy.isDefaultRewardToken(await token18.getAddress())).to.be.false;
      });
    });
    describe('#length', async function () {
      it('Should corectly return length without existsing bribes', async function () {
        expect(await bribeFactoryUpgradeableProxy.length()).to.be.equal(0);
      });
      it('Should corectly return length of deployed bribes', async function () {
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        expect(await bribeFactoryUpgradeableProxy.length()).to.be.equal(1);
      });
      it('Should corectly return length after deployed new', async function () {
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        expect(await bribeFactoryUpgradeableProxy.length()).to.be.equal(3);
      });
    });
    describe('#list', async function () {
      it('Should corectly return empty list without bribes after initialzier', async function () {
        expect(await bribeFactoryUpgradeableProxy.list(0, 100)).to.be.empty;
      });
      it('Should corectly return bribes accroding to parameters', async function () {
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        let bribe1 = await bribeFactoryUpgradeableProxy.lastBribe();
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        let bribe2 = await bribeFactoryUpgradeableProxy.lastBribe();
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        let bribe3 = await bribeFactoryUpgradeableProxy.lastBribe();
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        let bribe4 = await bribeFactoryUpgradeableProxy.lastBribe();
        await bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, await token6.getAddress(), ZERO_ADDRESS, 'Bribe Type 1');
        let bribe5 = await bribeFactoryUpgradeableProxy.lastBribe();

        expect(await bribeFactoryUpgradeableProxy.list(0, 0)).to.be.empty;
        expect(await bribeFactoryUpgradeableProxy.list(0, 1)).to.be.deep.equal([bribe1]);
        expect(await bribeFactoryUpgradeableProxy.list(1, 1)).to.be.deep.equal([bribe2]);
        expect(await bribeFactoryUpgradeableProxy.list(0, 2)).to.be.deep.equal([bribe1, bribe2]);
        expect(await bribeFactoryUpgradeableProxy.list(1, 2)).to.be.deep.equal([bribe2, bribe3]);
        expect(await bribeFactoryUpgradeableProxy.list(0, 10)).to.be.deep.equal([bribe1, bribe2, bribe3, bribe4, bribe5]);
        expect(await bribeFactoryUpgradeableProxy.list(4, 10)).to.be.deep.equal([bribe5]);
        expect(await bribeFactoryUpgradeableProxy.list(3, 1)).to.be.deep.equal([bribe4]);
        expect(await bribeFactoryUpgradeableProxy.list(3, 2)).to.be.deep.equal([bribe4, bribe5]);

        expect(await bribeFactoryUpgradeableProxy.list(5, 10)).to.be.empty;
        expect(await bribeFactoryUpgradeableProxy.list(5, 0)).to.be.empty;
      });
      it("Shouldn' revert if set incorect offset_, or limit_ parameters", async function () {
        await expect(bribeFactoryUpgradeableProxy.list(1500, 0)).to.be.not.reverted;
      });
    });
  });
  describe('Check access control', async function () {
    describe('functions for only access from contract Owner', async function () {
      it('#upgradeProxiesTo - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).upgradeProxiesTo(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(bribeFactoryUpgradeableProxy.connect(fenixMultisig).upgradeProxiesTo(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#upgradeProxiesTo - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.upgradeProxiesTo(await bribeUpgradeableImpementation.getAddress())).to.be.not.reverted;
      });
      it('#recoverERC20AndUpdateData - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).recoverERC20AndUpdateData([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).recoverERC20AndUpdateData([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#recoverERC20AndUpdateData - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.recoverERC20AndUpdateData([], [], [])).to.be.not.reverted;
      });
      it('#emergencyRecoverERC20 - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).emergencyRecoverERC20([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).emergencyRecoverERC20([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#emergencyRecoverERC20 - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.emergencyRecoverERC20([], [], [])).to.be.not.reverted;
      });
      it('#setBribesOwner - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).setBribesOwner([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).setBribesOwner([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#setBribesOwner - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.setBribesOwner([], await deployer.getAddress())).to.be.not.reverted;
      });
      it('#setBribesEmissionManager - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).setBribesEmissionManager([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).setBribesEmissionManager([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#setBribesMinter - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.setBribesEmissionManager([], await deployer.getAddress())).to.be.not.reverted;
      });
      it('#setBribesVoter - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).setBribesVoter([otherUser.address], await voteMock.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).setBribesVoter([otherUser.address], await voteMock.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#setBribesVoter - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.setBribesVoter([], await deployer.getAddress())).to.be.not.reverted;
      });
      it('#removeDefaultRewardToken - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).removeDefaultRewardToken(await token18.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).removeDefaultRewardToken(await token18.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#removeDefaultRewardToken - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.removeDefaultRewardToken(await token18.getAddress())).to.be.not.reverted;
      });
      it('#pushDefaultRewardToken - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).pushDefaultRewardToken(await token18.getAddress())).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).pushDefaultRewardToken(await token18.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#pushDefaultRewardToken - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.pushDefaultRewardToken(await token6.getAddress())).to.be.not.reverted;
      });
      it('#setPermissionsRegistry - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).setPermissionsRegistry(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(bribeFactoryUpgradeableProxy.connect(fenixMultisig).setPermissionsRegistry(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#setPermissionsRegistry - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.setPermissionsRegistry(deployer.address)).to.be.not.reverted;
      });
      it('#setVoter - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).setVoter(await voteMock.getAddress())).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(bribeFactoryUpgradeableProxy.connect(fenixMultisig).setVoter(await voteMock.getAddress())).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#setVoter - Should success called from owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.setVoter(deployer.address)).to.be.not.reverted;
      });
    });
    describe('functions for only access from contract Owner or Vote address', async () => {
      it('#createBribe - Should fail if call from not owner or vote', async () => {
        await expect(
          bribeFactoryUpgradeableProxy
            .connect(otherUser)
            .createBribe(otherUser.address, await token18.getAddress(), await token9.getAddress(), 'Type'),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
        await expect(
          bribeFactoryUpgradeableProxy
            .connect(fenixMultisig)
            .createBribe(otherUser.address, await token18.getAddress(), await token9.getAddress(), 'Type'),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#createBribe - Should success called from owner or vote', async () => {
        await expect(bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'Typed')).to.be.not
          .reverted;
        await expect(
          voteMock.createBribe(await bribeFactoryUpgradeableProxy.getAddress(), fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'Typed'),
        ).to.be.not.reverted;

        await expect(bribeFactoryUpgradeableProxy.createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'Typed')).to.be.not;
      });
    });
    describe('functions for access from contract Owner or allowed admins from permission registry', async () => {
      it('#addRewardTokenToBribe - Should fail if call from not authorized user', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).addRewardTokenToBribe(otherUser.address, otherUser.address),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#addRewardTokensToBribe - Should success called from authorized user', async () => {
        let bribe = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type');
        await expect(bribeFactoryUpgradeableProxy.addRewardTokensToBribe([], await bribe.getAddress())).to.be.not.reverted;
      });
      it('#addRewardTokensToBribe - Should fail if call from not authorized user', async () => {
        let bribe = await createBribe(fenixMultisig.address, ZERO_ADDRESS, ZERO_ADDRESS, 'type');

        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).addRewardTokensToBribe([], await bribe.getAddress()),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#addRewardTokenToBribes - Should fail if call from not authorized user', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).addRewardTokenToBribes(otherUser.address, [otherUser.address]),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#addRewardTokenToBribes - Should success called from authorized user', async () => {
        await expect(bribeFactoryUpgradeableProxy.addRewardTokenToBribes(deployer.address, [])).to.be.not.reverted;
      });

      it('#addRewardTokensToBribes - Should fail if call from not authorized user', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).addRewardTokensToBribes([[otherUser.address]], [otherUser.address]),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#addRewardTokensToBribes - Should success called from authorized user', async () => {
        await expect(bribeFactoryUpgradeableProxy.addRewardTokensToBribes([], [])).to.be.not.reverted;
      });
    });
  });
});

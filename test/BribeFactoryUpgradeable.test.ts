import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { BEACON_IMPLEMENTATION_SLOT, ERRORS, ZERO_ADDRESS } from './utils/constants';
import { ethers } from 'hardhat';
import { ImplementationMock, ImplementationV2Mock } from '../typechain-types/contracts/mocks/ImplementationV2Mock.sol';
import {
  BaseFactoryUpgradeableMock,
  BaseFactoryUpgradeableMock__factory,
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable,
  BribeUpgradeable__factory,
  ERC20Mock,
  ImplementationMock__factory,
  ImplementationV2Mock__factory,
  PermissionsRegistry,
  PermissionsRegistry__factory,
  TransparentUpgradeableProxy__factory,
  VotingEscrowMock__factory,
} from '../typechain-types';
import { deployToken } from './utils/fixture';
import { VoteMock } from '../typechain-types';
import { VoteMock__factory } from '../typechain-types';

describe('BaseFactoryUpgradeable Contract', function () {
  let deployer: HardhatEthersSigner;
  let fenixMultisig: HardhatEthersSigner;
  let voter: HardhatEthersSigner;
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

  let token18: ERC20Mock;
  let token9: ERC20Mock;
  let token6: ERC20Mock;

  async function getNewBribeFactoryProxy() {
    let newProxy = await factoryProxy.deploy(await bribeFactoryUpgradeableImplementation.getAddress(), proxyAdmin.address, '0x');
    return bribeFactoryUpgradeableFactory.attach(await newProxy.getAddress()) as BribeFactoryUpgradeable;
  }

  beforeEach(async function () {
    [deployer, fenixMultisig, voter, proxyAdmin, otherUser, votinEscrow, minter, ...others] = await ethers.getSigners();

    factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;

    bribeFactoryUpgradeableFactory = await ethers.getContractFactory('BribeFactoryUpgradeable');
    bribeFactoryUpgradeableImplementation = (await bribeFactoryUpgradeableFactory.deploy()) as BribeFactoryUpgradeable;

    permissionRegistryFactory = await ethers.getContractFactory('PermissionsRegistry');
    permissionRegistry = await permissionRegistryFactory.connect(fenixMultisig).deploy();

    bribeUpgradeableFactory = await ethers.getContractFactory('BribeUpgradeable');
    bribeUpgradeableImpementation = (await bribeUpgradeableFactory.deploy()) as BribeUpgradeable;

    voteMockFactory = await ethers.getContractFactory('VoteMock');
    voteMock = (await voteMockFactory.deploy(votinEscrow.address, minter.address)) as VoteMock;

    bribeFactoryUpgradeableProxy = await getNewBribeFactoryProxy();
    token18 = await deployToken('Token18', 'T18', 18);
    token9 = await deployToken('Token9', 'T9', 9);
    token6 = await deployToken('Token6', 'T6', 6);

    await bribeFactoryUpgradeableProxy.initialize(
      await voteMock.getAddress(),
      await permissionRegistry.getAddress(),
      await bribeUpgradeableImpementation.getAddress(),
      [await token18.getAddress(), await token9.getAddress()],
    );
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
  describe('Create bribe', async function () {
    describe('Should corectly create new bribe', async function () {
      let deployedTx: any;
      let deployedBribeAddress: string;
      beforeEach(async function () {
        deployedBribeAddress = await bribeFactoryUpgradeableProxy.createBribe.staticCall(
          fenixMultisig.address,
          await token18.getAddress(),
          await token9.getAddress(),
          'Bribe Type 1',
        );
        deployedTx = await bribeFactoryUpgradeableProxy.createBribe(
          fenixMultisig.address,
          await token18.getAddress(),
          await token9.getAddress(),
          'Bribe Type 1',
        );
      });
      it('Should corect emit event after deploy new bribe', async function () {
        await expect(deployedTx).to.emit(bribeFactoryUpgradeableProxy, 'BribeCreated').withArgs(deployedBribeAddress);
      });
      it('Should corect return newBribe address', async function () {
        expect(await bribeFactoryUpgradeableProxy.lastBribe()).to.be.equal(deployedBribeAddress);
      });

      it('Should corect initialize deployead bribe', async function () {});
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
  });
  describe('View functions', async function () {});
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
      it('#upgradeProxiesTo - Should success called from owner', async () => {});
      it('#recoverERC20AndUpdateData - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).recoverERC20AndUpdateData([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).recoverERC20AndUpdateData([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#recoverERC20AndUpdateData - Should success called from owner', async () => {});
      it('#recoverERC20From - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).recoverERC20From([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).recoverERC20From([otherUser.address], [otherUser.address], [1]),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#recoverERC20From - Should success called from owner', async () => {});
      it('#setBribesOwner - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).setBribesOwner([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).setBribesOwner([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#setBribesOwner - Should success called from owner', async () => {});
      it('#setBribesMinter - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).setBribesMinter([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).setBribesMinter([otherUser.address], otherUser.address),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#setBribesMinter - Should success called from owner', async () => {});
      it('#setBribesVoter - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).setBribesVoter([otherUser.address], await voteMock.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).setBribesVoter([otherUser.address], await voteMock.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#setBribesVoter - Should success called from owner', async () => {});
      it('#removeDefaultRewardToken - Should fail if call from not owner', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).removeDefaultRewardToken(await token18.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).removeDefaultRewardToken(await token18.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#removeDefaultRewardToken - Should success called from owner', async () => {});
      it('#pushDefaultRewardToken - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).pushDefaultRewardToken(await token18.getAddress())).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(
          bribeFactoryUpgradeableProxy.connect(fenixMultisig).pushDefaultRewardToken(await token18.getAddress()),
        ).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('#pushDefaultRewardToken - Should success called from owner', async () => {});
      it('#setPermissionsRegistry - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).setPermissionsRegistry(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(bribeFactoryUpgradeableProxy.connect(fenixMultisig).setPermissionsRegistry(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#setPermissionsRegistry - Should success called from owner', async () => {});
      it('#setVoter - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).setVoter(await voteMock.getAddress())).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(bribeFactoryUpgradeableProxy.connect(fenixMultisig).setVoter(await voteMock.getAddress())).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#setVoter - Should success called from owner', async () => {});
      it('#upgradeProxiesTo - Should fail if call from not owner', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).upgradeProxiesTo(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(bribeFactoryUpgradeableProxy.connect(fenixMultisig).upgradeProxiesTo(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#upgradeProxiesTo - Should success called from owner', async () => {});
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
      it('#createBribe - Should success called from owner or vote', async () => {});
    });
    describe('functions for access from contract Owner or allowed admins from permission registry', async () => {
      it('#addRewardTokenToBribe - Should fail if call from not authorized user', async () => {
        await expect(bribeFactoryUpgradeableProxy.connect(otherUser).upgradeProxiesTo(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(bribeFactoryUpgradeableProxy.connect(fenixMultisig).upgradeProxiesTo(otherUser.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#addRewardTokensToBribe - Should success called from authorized user', async () => {});
      it('#addRewardTokensToBribe - Should fail if call from not authorized user', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).addRewardTokensToBribes([[otherUser.address]], [otherUser.address]),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#addRewardTokenToBribes - Should fail if call from not authorized user', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).addRewardTokenToBribes(otherUser.address, [otherUser.address]),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#addRewardTokenToBribes - Should success called from authorized user', async () => {});

      it('#addRewardTokensToBribes - Should fail if call from not authorized user', async () => {
        await expect(
          bribeFactoryUpgradeableProxy.connect(otherUser).addRewardTokensToBribes([[otherUser.address]], [otherUser.address]),
        ).to.be.revertedWithCustomError(bribeFactoryUpgradeableProxy, 'AccessDenied');
      });
      it('#addRewardTokensToBribes - Should success called from authorized user', async () => {});
    });
  });
});

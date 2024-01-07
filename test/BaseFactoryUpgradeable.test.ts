import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ERRORS, ZERO_ADDRESS } from './utils/constants';
import { ethers } from 'hardhat';
import { ImplementationMock, ImplementationV2Mock } from '../typechain-types/contracts/mocks/ImplementationV2Mock.sol';
import {
  BaseFactoryUpgradeableMock,
  BaseFactoryUpgradeableMock__factory,
  ImplementationMock__factory,
  ImplementationV2Mock__factory,
  TransparentUpgradeableProxy__factory,
} from '../typechain-types';

describe('BaseFactoryUpgradeable Contract', function () {
  let deployer: HardhatEthersSigner;
  let proxyAdmin: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;
  let others: HardhatEthersSigner[];

  let factory: BaseFactoryUpgradeableMock__factory;
  let baseFactoryImplementation: BaseFactoryUpgradeableMock;

  let factoryProxy: TransparentUpgradeableProxy__factory;
  let baseFactoryProxy: BaseFactoryUpgradeableMock;

  let factoryImplementaionMock: ImplementationMock__factory;
  let factoryImplementaionV2Mock: ImplementationV2Mock__factory;

  let implementaionMockInstance: ImplementationMock;
  let implementaionV2MockInstance: ImplementationV2Mock;

  async function getNewBaseFactoryProxy() {
    let newProxy = await factoryProxy.deploy(await baseFactoryImplementation.getAddress(), proxyAdmin.address, '0x');
    return factory.attach(await newProxy.getAddress()) as BaseFactoryUpgradeableMock;
  }

  beforeEach(async function () {
    [deployer, proxyAdmin, otherUser, ...others] = await ethers.getSigners();

    factory = (await ethers.getContractFactory('BaseFactoryUpgradeableMock')) as BaseFactoryUpgradeableMock__factory;
    baseFactoryImplementation = await factory.deploy();

    factoryProxy = (await ethers.getContractFactory('TransparentUpgradeableProxy')) as TransparentUpgradeableProxy__factory;
    factoryImplementaionMock = (await ethers.getContractFactory('ImplementationMock')) as ImplementationMock__factory;
    factoryImplementaionV2Mock = (await ethers.getContractFactory('ImplementationV2Mock')) as ImplementationV2Mock__factory;

    implementaionMockInstance = (await factoryImplementaionMock.deploy()) as ImplementationMock;
    implementaionV2MockInstance = (await factoryImplementaionV2Mock.deploy()) as ImplementationV2Mock;

    baseFactoryProxy = await getNewBaseFactoryProxy();
    await baseFactoryProxy.initialize(await implementaionMockInstance.getAddress());
  });

  describe('Deployment', function () {
    it('Should emit event with implementation address', async function () {
      let newProxy = await getNewBaseFactoryProxy();
      await expect(newProxy.initialize(await implementaionMockInstance.getAddress()))
        .to.emit(newProxy, 'Upgraded')
        .withArgs(await implementaionMockInstance.getAddress());
    });

    it('Should fail if try second time to initialize', async function () {
      await expect(baseFactoryProxy.initialize(await baseFactoryImplementation.getAddress())).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try to call __Base_Factory_init from not initializer', async function () {
      await expect(baseFactoryProxy.baseFactoryInit(await baseFactoryImplementation.getAddress())).to.be.revertedWith(
        ERRORS.Initializable.NotInitializing,
      );
    });
    it('Should fail if initial implementation is not contract or zero_address', async function () {
      let baseFactory = factory.attach(
        await factoryProxy.deploy(await baseFactoryImplementation.getAddress(), proxyAdmin.address, '0x'),
      ) as BaseFactoryUpgradeableMock;
      await expect(baseFactory.initialize(ZERO_ADDRESS)).to.be.revertedWithCustomError(baseFactory, 'AddressNotContract');
      await expect(baseFactory.initialize(otherUser.address)).to.be.revertedWithCustomError(baseFactory, 'AddressNotContract');
    });
  });
  describe('_setImplementation', function () {
    it('Should fail if initial implementation is not contract or zero_address', async function () {
      await expect(baseFactoryProxy.upgradeTo(ZERO_ADDRESS)).to.be.revertedWithCustomError(baseFactoryProxy, 'AddressNotContract');
      await expect(baseFactoryProxy.upgradeTo(otherUser.address)).to.be.revertedWithCustomError(baseFactoryProxy, 'AddressNotContract');
    });
    it('Should emit event with new implementation address', async function () {
      let t = baseFactoryProxy.upgradeTo(await implementaionV2MockInstance.getAddress());
      await expect(t)
        .to.emit(baseFactoryProxy, 'Upgraded')
        .withArgs(await implementaionV2MockInstance.getAddress());
    });
    it('Should corectly change implementation address', async function () {
      expect(await baseFactoryProxy.implementation()).to.be.equal(await implementaionMockInstance.getAddress());
      await baseFactoryProxy.upgradeTo(implementaionV2MockInstance.getAddress());
      expect(await baseFactoryProxy.implementation()).to.be.equal(await implementaionV2MockInstance.getAddress());
    });
    it('Should have effect on Beacon Proxies', async function () {
      let beaconProxyFactory = await ethers.getContractFactory('BeaconProxy');
      let bp = await beaconProxyFactory.deploy(baseFactoryProxy.getAddress(), '0x');

      let imMock = factoryImplementaionMock.attach(await bp.getAddress()) as ImplementationMock;
      expect(await imMock.version()).to.be.equal(1);

      await baseFactoryProxy.upgradeTo(implementaionV2MockInstance.getAddress());
      imMock = factoryImplementaionV2Mock.attach(await bp.getAddress()) as ImplementationV2Mock;
      expect(await imMock.versionV2()).to.be.equal(2);
    });
  });
  describe('implementation()', function () {
    it('Should return correct implementation', async function () {
      expect(await baseFactoryProxy.implementation()).to.be.equal(await implementaionMockInstance.getAddress());
    });
    it('Should return correct implementation after change implementation', async function () {
      await baseFactoryProxy.upgradeTo(implementaionV2MockInstance.getAddress());
      expect(await baseFactoryProxy.implementation()).to.be.equal(await implementaionV2MockInstance.getAddress());
    });
  });
});

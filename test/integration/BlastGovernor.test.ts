import { BlastMock } from '@cryptoalgebra/integral-core/typechain';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { setCode } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastGovernorMock, BlastMock__factory } from '../../typechain-types';
import { ERRORS, getAccessControlError } from '../utils/constants';

describe('BlastGovernorClaimableSetup Contract', function () {
  let deployer: HardhatEthersSigner;
  let proxyAdmin: HardhatEthersSigner;
  let blastGovernor: HardhatEthersSigner;
  let other: HardhatEthersSigner;
  let BlastGovernorProxy: BlastGovernorMock;
  let BlastGovernorImplementation: BlastGovernorMock;
  let BlastMock: BlastMock;

  async function newInstance() {
    let proxy = await ethers.deployContract('TransparentUpgradeableProxy', [BlastGovernorImplementation.target, proxyAdmin.address, '0x']);
    await proxy.waitForDeployment();
    let instance = await ethers.getContractAt('BlastGovernorMock', proxy.target);
    await instance.__mock_setBlast(BlastMock.target);
    return instance;
  }

  before(async function () {
    await setCode('0x4300000000000000000000000000000000000002', BlastMock__factory.bytecode);

    [deployer, proxyAdmin, blastGovernor, other] = await ethers.getSigners();

    BlastMock = await ethers.deployContract('BlastMock');
    await BlastMock.waitForDeployment();

    BlastGovernorImplementation = await ethers.deployContract('BlastGovernorMock', [blastGovernor.address]);
    await BlastGovernorImplementation.waitForDeployment();

    BlastGovernorProxy = await newInstance();

    await BlastMock.mockIsGovernor(true);
    await BlastGovernorProxy.__mock_setBlast(BlastMock.target);
    await BlastGovernorProxy.initialize();
    await BlastGovernorProxy.grantRole(await BlastGovernorProxy.GAS_HOLDER_ADDER_ROLE(), deployer.address);
    await BlastGovernorProxy.grantRole(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), deployer.address);
  });

  describe('deployment', async () => {
    it('fail if try initialzie on implementation', async () => {
      await expect(BlastGovernorImplementation.initialize()).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fail if try initialzie on proxy second time', async () => {
      await expect(BlastGovernorProxy.initialize()).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    describe('initial state', async () => {
      it('deployer should have DEFAULT_ADMIN_ROLE', async () => {
        expect(await BlastGovernorProxy.hasRole(ethers.ZeroHash, deployer.address)).to.be.true;
      });
      it('success register blast governor proxy contract in gas holders registry', async () => {
        expect(await BlastGovernorProxy.isRegisteredGasHolder(BlastGovernorProxy.target)).to.be.true;
      });
    });
  });

  describe('Add gas holder to register proccess', async () => {
    describe('fail if', async () => {
      it('without GAS HOLDER ADDER ROLE', async () => {
        await expect(BlastGovernorProxy.connect(other).addGasHolder(BlastGovernorProxy.target)).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_HOLDER_ADDER_ROLE(), other.address),
        );
      });
      it('provide zero address', async () => {
        await expect(BlastGovernorProxy.addGasHolder(ethers.ZeroAddress)).to.be.revertedWithCustomError(BlastGovernorProxy, 'AddressZero');
      });
      it('contractAddress not setup governor BlastGovernor on Blast contract', async () => {
        await BlastMock.mockIsGovernor(false);
        await expect(BlastGovernorProxy.addGasHolder(other.address)).to.be.revertedWithCustomError(BlastGovernorProxy, 'IncorrectGovernor');
      });
      it('contractAddress already added', async () => {
        await BlastMock.mockIsGovernor(true);
        await BlastGovernorProxy.grantRole(await BlastGovernorProxy.GAS_HOLDER_ADDER_ROLE(), deployer.address);
        await expect(BlastGovernorProxy.addGasHolder(BlastGovernorProxy.target)).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AlreadyRegistered',
        );
      });

      it('success register and emit event', async () => {
        let instance = await newInstance();
        await instance.initialize();
        await BlastMock.mockIsGovernor(true);
        await expect(BlastGovernorProxy.addGasHolder(instance.target))
          .to.be.emit(BlastGovernorProxy, 'AddGasHolder')
          .withArgs(instance.target);
      });
    });
  });

  describe('Claim gas flow', async () => {
    describe('fail if called from not GAS_WITHDRAWER_ROLE wallet', async () => {
      it('#claimAllGas', async () => {
        await expect(BlastGovernorProxy.connect(other).claimAllGas(other.address, 0, 0)).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address),
        );
      });
      it('#claimAllGasFromSpecifiedGasHolders', async () => {
        await expect(BlastGovernorProxy.connect(other).claimAllGasFromSpecifiedGasHolders(other.address, [])).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address),
        );
      });
      it('#claimGasAtMinClaimRate', async () => {
        await expect(BlastGovernorProxy.connect(other).claimGasAtMinClaimRate(other.address, 0, 0, 0)).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address),
        );
      });
      it('#claimGasAtMinClaimRateFromSpecifiedGasHolders', async () => {
        await expect(
          BlastGovernorProxy.connect(other).claimGasAtMinClaimRateFromSpecifiedGasHolders(other.address, 0, []),
        ).to.be.revertedWith(getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address));
      });
      it('#claimMaxGas', async () => {
        await expect(BlastGovernorProxy.connect(other).claimMaxGas(other.address, 0, 0)).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address),
        );
      });
      it('#claimMaxGasFromSpecifiedGasHolders', async () => {
        await expect(BlastGovernorProxy.connect(other).claimMaxGasFromSpecifiedGasHolders(other.address, [])).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address),
        );
      });
      it('#claimGas', async () => {
        await expect(BlastGovernorProxy.connect(other).claimGas(other.address, 0, 0, 0, 0)).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address),
        );
      });
      it('#claimGasFromSpecifiedGasHolders', async () => {
        await expect(BlastGovernorProxy.connect(other).claimGasFromSpecifiedGasHolders(other.address, 0, 0, [])).to.be.revertedWith(
          getAccessControlError(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), other.address),
        );
      });
    });
    describe('fail if try call and provide recipient equal zero address', async () => {
      it('#claimAllGas', async () => {
        await expect(BlastGovernorProxy.claimAllGas(ethers.ZeroAddress, 0, 0)).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AddressZero',
        );
      });
      it('#claimAllGasFromSpecifiedGasHolders', async () => {
        await expect(BlastGovernorProxy.claimAllGasFromSpecifiedGasHolders(ethers.ZeroAddress, [])).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AddressZero',
        );
      });
      it('#claimGasAtMinClaimRate', async () => {
        await expect(BlastGovernorProxy.claimGasAtMinClaimRate(ethers.ZeroAddress, 0, 0, 0)).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AddressZero',
        );
      });
      it('#claimGasAtMinClaimRateFromSpecifiedGasHolders', async () => {
        await expect(
          BlastGovernorProxy.claimGasAtMinClaimRateFromSpecifiedGasHolders(ethers.ZeroAddress, 0, []),
        ).to.be.revertedWithCustomError(BlastGovernorProxy, 'AddressZero');
      });
      it('#claimMaxGas', async () => {
        await expect(BlastGovernorProxy.claimMaxGas(ethers.ZeroAddress, 0, 0)).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AddressZero',
        );
      });
      it('#claimMaxGasFromSpecifiedGasHolders', async () => {
        await expect(BlastGovernorProxy.claimMaxGasFromSpecifiedGasHolders(ethers.ZeroAddress, [])).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AddressZero',
        );
      });
      it('#claimGas', async () => {
        await expect(BlastGovernorProxy.claimGas(ethers.ZeroAddress, 0, 0, 0, 0)).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AddressZero',
        );
      });
      it('#claimGasFromSpecifiedGasHolders', async () => {
        await expect(BlastGovernorProxy.claimGasFromSpecifiedGasHolders(ethers.ZeroAddress, 0, 0, [])).to.be.revertedWithCustomError(
          BlastGovernorProxy,
          'AddressZero',
        );
      });
    });
  });
  describe('#isRegisteredGasHolder', async () => {
    it('return false if contract not registered', async () => {
      let instance = await newInstance();
      expect(await instance.isRegisteredGasHolder(instance.target)).to.be.false;
    });
    it('return true if contract registered', async () => {
      let instance = await newInstance();
      await instance.__mock_setBlast(BlastMock.target);
      await instance.initialize();
      expect(await instance.isRegisteredGasHolder(instance.target)).to.be.true;
    });
  });

  describe('#listGasHolders', async () => {
    it('return correct list after deploy', async () => {
      expect(await (await newInstance()).listGasHolders(0, 100)).to.be.deep.eq([]);
    });
    it('return correct list after initialize', async () => {
      let instance = await newInstance();
      await instance.initialize();
      expect(await instance.listGasHolders(0, 100)).to.be.deep.eq([instance.target]);
    });

    it('different case with offset and limit, empty arrray', async () => {
      let instance = await newInstance();
      expect(await instance.listGasHolders(0, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(0, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(2, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 2)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 3)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(3, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(0, 3)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(3, 0)).to.be.deep.eq([]);
    });
    it('different case with offset and limit, 1 element in array', async () => {
      let instance = await newInstance();
      await instance.initialize();
      expect(await instance.listGasHolders(0, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(0, 1)).to.be.deep.eq([instance.target]);
      expect(await instance.listGasHolders(1, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(2, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 2)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 3)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(3, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(0, 3)).to.be.deep.eq([instance.target]);
      expect(await instance.listGasHolders(3, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(0, 2)).to.be.deep.eq([instance.target]);
    });
    it('different case with offset and limit, 6 element in array', async () => {
      let instance = await newInstance();
      let addrList = [
        instance.target,
        '0x0000000000000000000000000000000000000002',
        '0x0000000000000000000000000000000000000003',
        '0x0000000000000000000000000000000000000004',
        '0x0000000000000000000000000000000000000005',
        '0x0000000000000000000000000000000000000006',
      ];
      await instance.initialize();
      await instance.grantRole(await instance.GAS_HOLDER_ADDER_ROLE(), deployer.address);
      await instance.addGasHolder(addrList[1]);
      await instance.addGasHolder(addrList[2]);
      await instance.addGasHolder(addrList[3]);
      await instance.addGasHolder(addrList[4]);
      await instance.addGasHolder(addrList[5]);

      expect(await instance.listGasHolders(0, 100)).to.be.deep.eq(addrList);
      expect(await instance.listGasHolders(0, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(1, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(5, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(0, 1)).to.be.deep.eq([addrList[0]]);
      expect(await instance.listGasHolders(1, 1)).to.be.deep.eq([addrList[1]]);
      expect(await instance.listGasHolders(2, 1)).to.be.deep.eq([addrList[2]]);
      expect(await instance.listGasHolders(1, 2)).to.be.deep.eq([addrList[1], addrList[2]]);
      expect(await instance.listGasHolders(1, 3)).to.be.deep.eq([addrList[1], addrList[2], addrList[3]]);
      expect(await instance.listGasHolders(3, 1)).to.be.deep.eq([addrList[3]]);
      expect(await instance.listGasHolders(0, 3)).to.be.deep.eq([addrList[0], addrList[1], addrList[2]]);
      expect(await instance.listGasHolders(3, 0)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(0, 2)).to.be.deep.eq([addrList[0], addrList[1]]);
      expect(await instance.listGasHolders(5, 1)).to.be.deep.eq([addrList[5]]);
      expect(await instance.listGasHolders(5, 2)).to.be.deep.eq([addrList[5]]);
      expect(await instance.listGasHolders(6, 1)).to.be.deep.eq([]);
      expect(await instance.listGasHolders(6, 2)).to.be.deep.eq([]);
    });
  });
});

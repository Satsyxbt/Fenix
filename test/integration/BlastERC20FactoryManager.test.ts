import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  BlastERC20FactoryManagerMock,
  BlastERC20FactoryManagerMock__factory,
  BlastPointsMock,
  ERC20RebasingMock,
} from '../../typechain-types';
import { ERRORS, ZERO_ADDRESS } from '../utils/constants';
import { mockBlast } from '../utils/coreFixture';

describe('BlastERC20FactoryManager Contract', function () {
  let factory: BlastERC20FactoryManagerMock__factory;
  let instance: BlastERC20FactoryManagerMock;
  let blastPoints: BlastPointsMock;
  let testToken: ERC20RebasingMock;

  let deployer: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  before(async function () {
    blastPoints = await mockBlast();

    [deployer, operator, other] = await ethers.getSigners();

    factory = await ethers.getContractFactory('BlastERC20FactoryManagerMock');

    instance = await factory.deploy(deployer.address, blastPoints.target, operator.address);

    testToken = await ethers.deployContract('ERC20RebasingMock');
  });

  describe('#Deployment', async () => {
    it('fail if blastGovernor zero', async () => {
      await expect(factory.deploy(ZERO_ADDRESS, blastPoints.target, other.address)).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fail if blast points zero', async () => {
      await expect(factory.deploy(deployer.address, ZERO_ADDRESS, other.address)).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fail if blast points operator zero', async () => {
      await expect(factory.deploy(deployer.address, blastPoints.target, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        factory,
        'AddressZero',
      );
    });

    it('correct initialize default address', async () => {
      expect(await instance.defaultBlastGovernor()).to.be.eq(deployer.address);
      expect(await instance.defaultBlastPoints()).to.be.eq(blastPoints.target);
      expect(await instance.defaultBlastPointsOperator()).to.be.eq(operator.address);
    });

    describe('#_checkAccessForBlastFactoryManager', async () => {
      describe('#setDefaultBlastGovernor', async () => {
        it('fails if caller not owner', async () => {
          await expect(instance.connect(other).setDefaultBlastGovernor(other.address)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        });
        it('fails if try set ZERO_ADDRESS', async () => {
          await expect(instance.setDefaultBlastGovernor(ZERO_ADDRESS)).to.be.revertedWithCustomError(instance, 'AddressZero');
        });
        it('success set new default blast governor address and emit event', async () => {
          expect(await instance.defaultBlastGovernor()).to.be.eq(deployer.address);

          await expect(instance.connect(deployer).setDefaultBlastGovernor(other.address))
            .to.be.emit(instance, 'DefaultBlastGovernor')
            .withArgs(other.address);

          expect(await instance.defaultBlastGovernor()).to.be.eq(other.address);
        });
      });
      describe('#setDefaultBlastPoints', async () => {
        it('fails if caller not Owner', async () => {
          await expect(instance.connect(other).setDefaultBlastPoints(other.address)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        });
        it('fails if try set ZERO_ADDRESS', async () => {
          await expect(instance.setDefaultBlastPoints(ZERO_ADDRESS)).to.be.revertedWithCustomError(instance, 'AddressZero');
        });
        it('success set new default blast points address and emit event', async () => {
          expect(await instance.defaultBlastPoints()).to.be.eq(blastPoints.target);

          await expect(instance.connect(deployer).setDefaultBlastPoints(other.address))
            .to.be.emit(instance, 'DefaultBlastPoints')
            .withArgs(other.address);

          expect(await instance.defaultBlastPoints()).to.be.eq(other.address);
        });
      });
      describe('#setDefaultBlastPointsOperator', async () => {
        it('fails if caller not Owner', async () => {
          await expect(instance.connect(other).setDefaultBlastPointsOperator(other.address)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
        });
        it('fails if try set ZERO_ADDRESS', async () => {
          await expect(instance.setDefaultBlastPointsOperator(ZERO_ADDRESS)).to.be.revertedWithCustomError(instance, 'AddressZero');
        });
        it('success set new default blast points operator address and emit event', async () => {
          expect(await instance.defaultBlastPointsOperator()).to.be.eq(operator.address);

          await expect(instance.connect(deployer).setDefaultBlastPointsOperator(other.address))
            .to.be.emit(instance, 'DefaultBlastPointsOperator')
            .withArgs(other.address);

          expect(await instance.defaultBlastPointsOperator()).to.be.eq(other.address);
        });
      });
      describe('#setConfigurationForRebaseToken', async () => {
        it('fails if caller not Owner', async () => {
          await expect(instance.connect(other).setConfigurationForRebaseToken(testToken.target, true, 1)).to.be.revertedWith(
            ERRORS.Ownable.NotOwner,
          );
        });

        it('success set configuration and change states', async () => {
          expect(await instance.isRebaseToken(testToken.target)).to.be.false;
          expect(await instance.configurationForBlastRebaseTokens(testToken.target)).to.be.eq(0);

          await expect(instance.setConfigurationForRebaseToken(testToken.target, true, 2))
            .to.be.emit(instance, 'ConfigurationForRebaseToken')
            .withArgs(testToken.target, true, 2);

          expect(await instance.isRebaseToken(testToken.target)).to.be.true;
          expect(await instance.configurationForBlastRebaseTokens(testToken.target)).to.be.eq(2);

          await expect(instance.setConfigurationForRebaseToken(testToken.target, false, 0))
            .to.be.emit(instance, 'ConfigurationForRebaseToken')
            .withArgs(testToken.target, false, 0);

          expect(await instance.isRebaseToken(testToken.target)).to.be.false;
          expect(await instance.configurationForBlastRebaseTokens(testToken.target)).to.be.eq(0);
        });
      });
    });
  });
});

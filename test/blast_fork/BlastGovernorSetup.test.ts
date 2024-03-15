import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastGovernorSetupMock__factory, IBlastMock } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import constants, { BLAST_PREDEPLOYED_ADDRESS, DEAD_ADDRESS } from '../utils/constants';

describe('BlastGovernorSetup Contract', function () {
  let factory: BlastGovernorSetupMock__factory;
  let deployer: HardhatEthersSigner;
  let governor: HardhatEthersSigner;
  let blast: IBlastMock;
  if (process.env.BLAST_FORK === 'true') {
    before(async function () {
      [deployer, governor] = await ethers.getSigners();

      factory = await ethers.getContractFactory('BlastGovernorSetupMock');
      blast = await ethers.getContractAt('IBlastMock', BLAST_PREDEPLOYED_ADDRESS);
    });

    it('Should fail if provide zero governor address', async () => {
      await expect(factory.connect(deployer).deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('Should corect set governor address', async () => {
      let mock = await factory.connect(deployer).deploy(governor.address);
      expect(await blast.governorMap(mock.target)).to.be.equal(governor.address);
    });
    it('Governor address can configure contract gas and yield config', async () => {
      let mock = await factory.connect(deployer).deploy(governor.address);

      expect(await blast.connect(governor).isAuthorized(mock.target)).to.be.true;

      expect(await blast.governorMap(mock.target)).to.be.equal(governor.address);

      let result = await blast.readGasParams(mock.target);
      expect(result.etherBalance).to.be.equal(constants.ZERO);
      expect(result[3]).to.be.equal(0);

      expect(await blast.connect(governor).isAuthorized(mock.target)).to.be.true;

      await blast.connect(governor).configureClaimableGasOnBehalf(mock.target);

      result = await blast.readGasParams(mock.target);
      expect(result.etherBalance).to.be.equal(constants.ZERO);
      expect(result[3]).to.be.equal(1);
    });
    it('Not autorized contract can\t change configuration', async () => {
      let mock = await factory.connect(deployer).deploy(DEAD_ADDRESS.toLowerCase());
      expect((await blast.governorMap(mock.target)).toLowerCase()).to.be.equal(DEAD_ADDRESS);
      await expect(blast.configureClaimableYieldOnBehalf(mock.target)).to.be.revertedWith('not authorized to configure contract');
      await expect(blast.configureClaimableGasOnBehalf(mock.target)).to.be.revertedWith('not authorized to configure contract');
    });
  } else {
    it('Skip if not blast fork', async () => {});
  }
});

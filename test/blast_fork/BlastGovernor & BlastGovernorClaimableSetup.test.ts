import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastGovernorSetupMock__factory, BlastGovernorUpgradeable, IBlastFull, IBlastMock } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import constants, { BLAST_PREDEPLOYED_ADDRESS, DEAD_ADDRESS, GasMode } from '../utils/constants';

describe('BlastGovernor & BlastGovernorClaimableSetup Contract', function () {
  if (process.env.BLAST_FORK === 'true') {
    let deployer: HardhatEthersSigner;
    let proxyAdmin: HardhatEthersSigner;
    let blastGovernor: HardhatEthersSigner;
    let other: HardhatEthersSigner;

    let BlastGovernorProxy: BlastGovernorUpgradeable;
    let BlastGovernorImplementation: BlastGovernorUpgradeable;
    let Blast: IBlastFull;

    before(async () => {
      [deployer, proxyAdmin, blastGovernor, other] = await ethers.getSigners();

      Blast = await ethers.getContractAt('IBlastFull', BLAST_PREDEPLOYED_ADDRESS);

      BlastGovernorImplementation = await ethers.deployContract('BlastGovernorUpgradeable', [blastGovernor.address]);
      await BlastGovernorImplementation.waitForDeployment();

      let proxy = await ethers.deployContract('TransparentUpgradeableProxy', [
        BlastGovernorImplementation.target,
        proxyAdmin.address,
        '0x',
      ]);
      await proxy.waitForDeployment();
      BlastGovernorProxy = await ethers.getContractAt('BlastGovernorUpgradeable', proxy.target);

      await BlastGovernorProxy.initialize();
      await BlastGovernorProxy.grantRole(await BlastGovernorProxy.GAS_HOLDER_ADDER_ROLE(), deployer.address);
      await BlastGovernorProxy.grantRole(await BlastGovernorProxy.GAS_WITHDRAWER_ROLE(), deployer.address);

      await Blast.configureGovernorOnBehalf(BlastGovernorImplementation.target, BlastGovernorProxy.target);

      await BlastGovernorProxy.addGasHolder(BlastGovernorImplementation.target);
    });

    it('should correct setup governor mode and governor on implementation', async () => {
      expect(await Blast.governorMap(BlastGovernorImplementation.target)).to.be.eq(BlastGovernorProxy.target);
      let gasParams = await Blast.readGasParams(BlastGovernorImplementation.target);
      expect(gasParams[3]).to.be.eq(GasMode.CLAIMABLE);
    });
    it('should correct setup governor mode and governor on proxy', async () => {
      expect(await Blast.governorMap(BlastGovernorImplementation.target)).to.be.eq(BlastGovernorImplementation.target);
      let gasParams = await Blast.readGasParams(BlastGovernorImplementation.target);
      expect(gasParams[3]).to.be.eq(GasMode.CLAIMABLE);
    });

    it('should sucess add implementation to registry', async () => {
      expect(await BlastGovernorProxy.isRegisteredGasHolder(BlastGovernorImplementation.target)).to.be.true;
      expect(await BlastGovernorProxy.listGasHolders(0, 10)).to.be.deep.eq([BlastGovernorProxy.target, BlastGovernorImplementation.target]);
    });

    it('should sucess add proxy to registry', async () => {
      expect(await BlastGovernorProxy.isRegisteredGasHolder(BlastGovernorProxy.target)).to.be.true;
    });
  } else {
    it.skip('SKIP: Only for blast fork tests');
  }
});

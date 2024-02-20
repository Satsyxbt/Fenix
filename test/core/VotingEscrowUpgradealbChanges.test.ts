import { expect } from 'chai';
import { ERRORS, ZERO_ADDRESS } from '../utils/constants';
import { ethers } from 'hardhat';
import { ERC20Mock, VotingEscrowUpgradeable, VotingEscrowUpgradeable__factory } from '../../typechain-types';
import { Fenix } from '../../typechain-types';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('VotingEscrowUpgradeableEarlyExit', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;

  let factory: VotingEscrowUpgradeable__factory;
  let votingEscrowImplementation: VotingEscrowUpgradeable;
  let votingEscrow: VotingEscrowUpgradeable;

  let fenix: Fenix;
  let tokenTR6: ERC20Mock;
  let tokenTR18: ERC20Mock;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = deployed.fenix;

    tokenTR6 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);
    tokenTR18 = await deployERC20MockToken(signers.deployer, 'TR18', 'TR18', 18);

    factory = (await ethers.getContractFactory('VotingEscrowUpgradeable')) as VotingEscrowUpgradeable__factory;
    votingEscrowImplementation = await factory.deploy();

    votingEscrow = deployed.votingEscrow;
  });

  describe('Deployment', function () {
    it('Should fail if try initialize on implementation', async function () {
      let t = await factory.deploy();
      await expect(t.initialize(signers.blastGovernor.address, await fenix.getAddress(), ZERO_ADDRESS)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try second time to initialize', async function () {
      await expect(votingEscrow.initialize(signers.blastGovernor.address, await fenix.getAddress(), ZERO_ADDRESS)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should corect set initial parameters', async function () {
      expect(await votingEscrow.token()).to.be.equal(await fenix.getAddress());
      expect(await votingEscrow.team()).to.be.equal(signers.deployer.address);
      expect(await votingEscrow.voter()).to.be.equal(deployed.voter.target);
      expect(await votingEscrow.artProxy()).to.be.equal(deployed.veArtProxy.target);
    });
  });
});

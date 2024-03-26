import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { setCode } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastMock__factory, Fenix } from '../../typechain-types/index';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ONE, ONE_ETHER, ZERO } from '../utils/constants';

describe('Fenix Contract', function () {
  let fenixInstance: Fenix;
  let emissionManager: HardhatEthersSigner;
  let blastGovernor: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;
  let deployer: HardhatEthersSigner;

  let tokenSetting = {
    name: 'Fenix',
    symbol: 'FNX',
    decimals: 18,
    initialTotalSupply: ethers.parseEther('7500000'),
  };

  before(async function () {
    await setCode(BLAST_PREDEPLOYED_ADDRESS, BlastMock__factory.bytecode);

    const Fenix = await ethers.getContractFactory('Fenix');
    [deployer, emissionManager, blastGovernor, otherUser] = await ethers.getSigners();
    fenixInstance = (await Fenix.deploy(blastGovernor.address, await emissionManager.getAddress())) as Fenix;
  });

  describe('Deployment', function () {
    it('Should set the right emission manager like owner', async function () {
      expect(await fenixInstance.owner()).to.equal(await emissionManager.getAddress());
    });
    it('Should correct set default token settings', async function () {
      expect(await fenixInstance.name()).to.equal(tokenSetting.name);
      expect(await fenixInstance.symbol()).to.equal(tokenSetting.symbol);
      expect(await fenixInstance.decimals()).to.equal(tokenSetting.decimals);
      expect(await fenixInstance.totalSupply()).to.equal(tokenSetting.initialTotalSupply);
    });
    it('Should correct mint initial supply to deployer', async function () {
      expect(await fenixInstance.balanceOf(deployer.address)).to.be.equal(tokenSetting.initialTotalSupply);
    });
  });

  describe('Minting', function () {
    it('Should mint new tokens and increase totalSupply correctly', async function () {
      expect(await fenixInstance.totalSupply()).to.equal(tokenSetting.initialTotalSupply);
      expect(await fenixInstance.balanceOf(await otherUser.getAddress())).to.equal(ZERO);

      await fenixInstance.connect(emissionManager).mint(await otherUser.getAddress(), 1);

      expect(await fenixInstance.balanceOf(await otherUser.getAddress())).to.equal(ONE);

      expect(await fenixInstance.totalSupply()).to.equal(tokenSetting.initialTotalSupply + ONE);

      await fenixInstance.connect(emissionManager).mint(await deployer.getAddress(), ONE_ETHER);
      expect(await fenixInstance.balanceOf(await deployer.getAddress())).to.equal(tokenSetting.initialTotalSupply + ONE_ETHER);
      expect(await fenixInstance.totalSupply()).to.equal(tokenSetting.initialTotalSupply + ONE_ETHER + ONE);
    });

    it('Should be fail, if called from not owner', async function () {
      await expect(fenixInstance.connect(otherUser).mint(await otherUser.getAddress(), ONE_ETHER)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
  });
});

import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Fenix } from '../../typechain-types/index';
import { Signer } from 'ethers';
import { ZERO, ONE_ETHER, ERRORS, ONE } from './utils/constants';

describe('Fenix Contract', function () {
  let fenixInstance: Fenix;
  let emissionManager: Signer;
  let otherUser: Signer;
  let deployer: Signer;

  let tokenSetting = {
    name: 'Fenix',
    symbol: 'FNX',
    decimals: 18,
    initialTotalSupply: ZERO,
  };

  before(async function () {
    const Fenix = await ethers.getContractFactory('Fenix');
    [deployer, emissionManager, otherUser] = await ethers.getSigners();
    fenixInstance = (await Fenix.deploy(await emissionManager.getAddress())) as Fenix;
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
  });

  describe('Minting', function () {
    it('Should mint new tokens and increase totalSupply correctly', async function () {
      expect(await fenixInstance.totalSupply()).to.equal(tokenSetting.initialTotalSupply);
      expect(await fenixInstance.balanceOf(await otherUser.getAddress())).to.equal(ZERO);

      await fenixInstance.connect(emissionManager).mint(await otherUser.getAddress(), 1);

      expect(await fenixInstance.balanceOf(await otherUser.getAddress())).to.equal(tokenSetting.initialTotalSupply + ONE);

      expect(await fenixInstance.totalSupply()).to.equal(tokenSetting.initialTotalSupply + ONE);

      await fenixInstance.connect(emissionManager).mint(await deployer.getAddress(), ONE_ETHER);
      expect(await fenixInstance.balanceOf(await deployer.getAddress())).to.equal(ONE_ETHER);
      expect(await fenixInstance.totalSupply()).to.equal(tokenSetting.initialTotalSupply + ONE_ETHER + ONE);
    });

    it('Should be fail, if called from not owner', async function () {
      await expect(fenixInstance.connect(otherUser).mint(await otherUser.getAddress(), ONE_ETHER)).to.be.revertedWith(
        ERRORS.Ownable.NotOwner,
      );
    });
  });
});

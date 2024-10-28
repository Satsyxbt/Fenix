import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS } from '../utils/constants';

import { ManualFNXPriceProvider } from '../../typechain-types';
import { getSigners, mockBlast } from '../utils/coreFixture';

describe('ManualFNXPriceProvider', function () {
  let instance: ManualFNXPriceProvider;
  let initialPrice = ethers.parseEther('1');
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;

  before(async function () {
    await mockBlast();
    let signers = await getSigners();
    [owner, user] = [signers.deployer, signers.otherUser1];
    instance = await ethers.deployContract('ManualFNXPriceProvider', [owner.address, initialPrice]);
  });

  describe('Deployment', function () {
    it('success setup deployer, like owner', async () => {
      expect(await instance.owner()).to.be.eq(owner.address);
    });
    it('success setup initial price', async () => {
      expect(await instance.price()).to.be.eq(initialPrice);
      expect(await instance.getUsdToFNXPrice()).to.be.eq(initialPrice);
    });
  });

  describe('#setFnxPrice', async () => {
    it('fail if call from not owner', async () => {
      await expect(instance.connect(user).setFnxPrice(1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
    });

    it('success update price and emit events', async () => {
      await expect(instance.setFnxPrice(initialPrice)).to.be.emit(instance, 'SetPrice').withArgs(initialPrice, initialPrice);
      expect(await instance.getUsdToFNXPrice()).to.be.eq(initialPrice);
      expect(await instance.price()).to.be.eq(initialPrice);

      await expect(instance.setFnxPrice(1)).to.be.emit(instance, 'SetPrice').withArgs(initialPrice, 1);
      expect(await instance.getUsdToFNXPrice()).to.be.eq(1);
      expect(await instance.price()).to.be.eq(1);

      await expect(instance.setFnxPrice(0)).to.be.emit(instance, 'SetPrice').withArgs(1, 0);
      await expect(instance.getUsdToFNXPrice()).to.be.revertedWithCustomError(instance, 'PriceNotSetup');
      expect(await instance.price()).to.be.eq(0);

      await expect(instance.setFnxPrice(ethers.parseEther('1.23456789')))
        .to.be.emit(instance, 'SetPrice')
        .withArgs(0, ethers.parseEther('1.23456789'));
      expect(await instance.getUsdToFNXPrice()).to.be.eq(ethers.parseEther('1.23456789'));
      expect(await instance.price()).to.be.eq(ethers.parseEther('1.23456789'));
    });
  });

  describe('#getUsdToFNXPrice', async () => {
    it('fail if price eq = 0', async () => {
      await instance.setFnxPrice(0);
      expect(await instance.price()).to.be.eq(0);
      await expect(instance.getUsdToFNXPrice()).to.be.revertedWithCustomError(instance, 'PriceNotSetup');
    });

    it('return actual price', async () => {
      await instance.setFnxPrice(initialPrice);
      expect(await instance.getUsdToFNXPrice()).to.be.eq(initialPrice);
      await instance.setFnxPrice(1);
      expect(await instance.getUsdToFNXPrice()).to.be.eq(1);
      await instance.setFnxPrice(11);
      expect(await instance.getUsdToFNXPrice()).to.be.eq(11);
      await instance.setFnxPrice(ethers.parseEther('1.23456789'));
      expect(await instance.getUsdToFNXPrice()).to.be.eq(ethers.parseEther('1.23456789'));
    });
  });
});

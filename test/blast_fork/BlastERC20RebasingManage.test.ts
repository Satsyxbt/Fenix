import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastERC20RebasingManageMock, BlastERC20RebasingManageMock__factory, IERC20RebasingMock } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { WETH_PREDEPLOYED_ADDRESS, ERRORS, USDB_PREDEPLOYED_ADDRESS, ONE_ETHER, ONE, ZERO } from '../utils/constants';
import { setBalance } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('BlastERC20RebasingManage Contract', function () {
  const BLAST_POINTS_TESTNET_CONTRACT = '0x2fc95838c71e76ec69ff817983BFf17c710F34E0';
  let factory: BlastERC20RebasingManageMock__factory;
  let rebasingManage: BlastERC20RebasingManageMock;
  let wethRebasing: IERC20RebasingMock;
  let usdbRebasing: IERC20RebasingMock;

  let deployer: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  if (process.env.BLAST_FORK === 'true') {
    before(async function () {
      [deployer, operator, other] = await ethers.getSigners();
      factory = await ethers.getContractFactory('BlastERC20RebasingManageMock');
      rebasingManage = await factory.deploy(deployer.address, BLAST_POINTS_TESTNET_CONTRACT, operator.address);
      wethRebasing = (await ethers.getContractAt('IERC20RebasingMock', WETH_PREDEPLOYED_ADDRESS)) as any as IERC20RebasingMock;
      usdbRebasing = (await ethers.getContractAt('IERC20RebasingMock', USDB_PREDEPLOYED_ADDRESS)) as any as IERC20RebasingMock;
    });
    describe('Deployment', async () => {
      it('Should corect setup blast points operator', async () => {
        let points = await ethers.getContractAt('BlastPointsMock', BLAST_POINTS_TESTNET_CONTRACT);
        expect(await points.operatorMap(rebasingManage.target)).to.be.eq(operator.address);
      });
      it('Default Yield mode for USDB is Automatic', async () => {
        expect(await usdbRebasing.getConfiguration(rebasingManage.target)).to.be.eq(0);
      });
      it('Default Yield mode for WETH is Automatic', async () => {
        expect(await wethRebasing.getConfiguration(rebasingManage.target)).to.be.eq(0);
      });
      it('Try get claimable amount should revert ', async () => {
        await expect(usdbRebasing.getClaimableAmount(rebasingManage.target)).to.be.revertedWithCustomError(
          usdbRebasing,
          'NotClaimableAccount',
        );
      });
      it('Claimable amount WETH is zero', async () => {
        await expect(wethRebasing.getClaimableAmount(rebasingManage.target)).to.be.revertedWithCustomError(
          usdbRebasing,
          'NotClaimableAccount',
        );
      });
    });
    describe('#configure', async () => {
      it('Should fail if user not pass access check', async () => {
        await expect(rebasingManage.connect(other).configure(wethRebasing.target, 1)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('Should success change configuration for WETH', async () => {
        await expect(rebasingManage.configure(wethRebasing.target, 1)).to.be.not.reverted;
        expect(await wethRebasing.getConfiguration(rebasingManage.target)).to.be.eq(1);
      });
      it('Should success change configuration for USDB', async () => {
        await expect(rebasingManage.configure(usdbRebasing.target, 2)).to.be.not.reverted;
        expect(await usdbRebasing.getConfiguration(rebasingManage.target)).to.be.eq(2);
      });
      it('Should success return clamaibed amoutn if set Claimable mode', async () => {
        expect(await usdbRebasing.getClaimableAmount(rebasingManage.target)).to.be.eq(0);
      });
    });

    describe('#claim', async () => {
      it('Should fail if user not pass access check', async () => {
        await expect(rebasingManage.connect(other).claim(wethRebasing.target, other.address, 1)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('Should fail if claimable amount is zero ', async () => {
        await expect(rebasingManage.configure(usdbRebasing.target, 2)).to.be.not.reverted;

        await expect(rebasingManage.claim(usdbRebasing.target, other.address, 1)).to.be.revertedWithCustomError(
          usdbRebasing,
          'InsufficientBalance',
        );
      });
      it('Should success claim and return clamabl amount if balance not zero ', async () => {
        await expect(rebasingManage.configure(wethRebasing.target, 2)).to.be.not.reverted;

        expect(await wethRebasing.getClaimableAmount(rebasingManage.target)).to.be.eq(0);
        expect(await wethRebasing.balanceOf(rebasingManage.target)).to.be.eq(0);

        await deployer.sendTransaction({ to: wethRebasing.target, value: ONE_ETHER });
        await wethRebasing.transfer(rebasingManage.target, ONE_ETHER);

        expect(await wethRebasing.balanceOf(rebasingManage.target)).to.be.eq(ONE_ETHER);

        await setBalance(
          await wethRebasing.getAddress(),
          (await ethers.provider.getBalance(wethRebasing.target)) + ONE_ETHER * BigInt(100),
        );

        expect(await wethRebasing.balanceOf(rebasingManage.target)).to.be.eq(ONE_ETHER);

        let clamableAmount = await wethRebasing.getClaimableAmount(rebasingManage.target);

        expect(clamableAmount).to.be.greaterThan(ZERO);

        const balanceBefore = await wethRebasing.balanceOf('0x1100000000000000000000000000000000000111');

        await rebasingManage.claim(wethRebasing.target, '0x1100000000000000000000000000000000000111', clamableAmount);

        const balanceAfter = await wethRebasing.balanceOf('0x1100000000000000000000000000000000000111');

        expect(balanceAfter - balanceBefore).to.be.eq(clamableAmount);

        expect(await wethRebasing.getClaimableAmount(rebasingManage.target)).to.be.eq(ZERO);
      });
    });
  } else {
    it('Skip if not blast fork', async () => {});
  }
});

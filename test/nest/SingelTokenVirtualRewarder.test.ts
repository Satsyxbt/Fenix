import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SingelTokenVirtualRewarderUpgradeable, SingelTokenVirtualRewarderUpgradeable__factory } from '../../typechain-types';
import { ERRORS, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { SignersList, deployTransaperntUpgradeableProxy, getSigners, mockBlast } from '../utils/coreFixture';

describe('SingelTokenVirtualRewarder Contract', function () {
  let signers: SignersList;
  let strategy: HardhatEthersSigner;

  let rewarder: SingelTokenVirtualRewarderUpgradeable;
  let factory: SingelTokenVirtualRewarderUpgradeable__factory;
  let rewarderImpl: SingelTokenVirtualRewarderUpgradeable;

  const _WEEK = 86400 * 7;

  async function currentEpoch() {
    return Math.floor(Math.floor((await time.latest()) / _WEEK) * _WEEK);
  }

  async function nextEpoch() {
    return Math.floor((await currentEpoch()) + _WEEK);
  }

  async function previuesEpoch() {
    return Math.floor((await currentEpoch()) - _WEEK);
  }

  beforeEach(async function () {
    await mockBlast();
    signers = await getSigners();
    strategy = signers.fenixTeam;

    factory = await ethers.getContractFactory('SingelTokenVirtualRewarderUpgradeable');
    rewarderImpl = await factory.deploy(signers.deployer.address);

    rewarder = factory.attach(
      (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await rewarderImpl.getAddress())).target,
    ) as any as SingelTokenVirtualRewarderUpgradeable;

    await rewarder.initialize(signers.blastGovernor.address, strategy.address);
  });

  describe('Deployment', async () => {
    it('fail if try initialize on implementatrion', async () => {
      await expect(rewarderImpl.initialize(signers.blastGovernor.address, strategy.address)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });

    it('fail if try initialize second time', async () => {
      await expect(rewarder.initialize(signers.blastGovernor.address, strategy.address)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });

    it('fail if `strategy` is zero address', async () => {
      let newRewarder = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await rewarderImpl.getAddress())).target,
      ) as any as SingelTokenVirtualRewarderUpgradeable;

      await expect(newRewarder.initialize(signers.blastGovernor.address, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        newRewarder,
        'AddressZero',
      );
    });

    it('correct set `strategy`', async () => {
      expect(await rewarder.strategy()).to.be.eq(strategy.address);
    });
  });

  describe('#empty state', async () => {
    it('totalSupply', async () => {
      expect(await rewarder.totalSupply()).to.be.eq(ZERO);
    });

    it('balanceOf', async () => {
      expect(await rewarder.balanceOf(0)).to.be.eq(ZERO);
      expect(await rewarder.balanceOf(1)).to.be.eq(ZERO);
      expect(await rewarder.balanceOf(2)).to.be.eq(ZERO);
    });

    it('calculateAvailableRewardsAmount', async () => {
      expect(await rewarder.balanceOf(1)).to.be.eq(ZERO);
      expect(await rewarder.balanceOf(0)).to.be.eq(ZERO);
    });

    it('totalSupplyCheckpointLastIndex', async () => {
      expect(await rewarder.totalSupplyCheckpointLastIndex()).to.be.eq(ZERO);
    });

    it('totalSupplyCheckpoints', async () => {
      expect(await rewarder.totalSupplyCheckpoints(0)).to.be.deep.eq([0, 0]);
      expect(await rewarder.totalSupplyCheckpoints(1)).to.be.deep.eq([0, 0]);
    });

    it('tokensInfo', async () => {
      expect(await rewarder.tokensInfo(0)).to.be.deep.eq([0, 0, 0]);
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([0, 0, 0]);
    });

    it('tokensInfo.checkpoints', async () => {
      expect(await rewarder.balanceCheckpoints(0, 0)).to.be.deep.eq([0, 0]);
      expect(await rewarder.balanceCheckpoints(1, 0)).to.be.deep.eq([0, 0]);
    });

    it('rewardsPerEpoch', async () => {
      expect(await rewarder.rewardsPerEpoch(0)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(1)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(ZERO);
    });
  });
  describe('#deposit', async () => {
    it('fail if call from not `strategy` wallet', async () => {
      await expect(rewarder.deposit(1, 1)).to.be.revertedWithCustomError(rewarder, 'AccessDenied');
    });

    it('fail if call with zero amount param', async () => {
      await expect(rewarder.connect(strategy).deposit(1, 0)).to.be.revertedWithCustomError(rewarder, 'ZeroAmount');
    });

    describe('correct first user deposit', async () => {
      let tx: any;
      let depositedAmount = BigInt(10);
      let tokenId = 1;

      beforeEach(async () => {
        expect(await rewarder.balanceOf(tokenId)).to.be.eq(ZERO);
        expect(await rewarder.totalSupply()).to.be.eq(ZERO);
        expect(await rewarder.tokensInfo(tokenId)).to.be.deep.eq([0, 0, 0]);
        expect(await rewarder.balanceCheckpoints(tokenId, 0)).to.be.deep.eq([0, 0]);
        expect(await rewarder.balanceCheckpoints(tokenId, 1)).to.be.deep.eq([0, 0]);

        tx = await rewarder.connect(strategy).deposit(tokenId, depositedAmount);
      });

      it(`correct deposit and emit  event`, async () => {
        await expect(tx)
          .to.be.emit(rewarder, 'Deposit')
          .withArgs(tokenId, depositedAmount, await currentEpoch());
      });
      it(`correct change user balance`, async () => {
        expect(await rewarder.balanceOf(tokenId)).to.be.eq(depositedAmount);
      });

      it(`correct change totalSupply`, async () => {
        expect(await rewarder.totalSupply()).to.be.eq(depositedAmount);
      });

      it(`initialize checkpoints`, async () => {
        expect(await rewarder.balanceCheckpoints(tokenId, 0)).to.be.deep.eq([0, 0]);
        expect(await rewarder.balanceCheckpoints(tokenId, 1)).to.be.deep.eq([await currentEpoch(), depositedAmount]);
        expect(await rewarder.tokensInfo(tokenId)).to.be.deep.eq([depositedAmount, 1, 0]);
      });
    });
  });
  describe('#withdraw', async () => {
    it('fail if call from not `strategy` wallet', async () => {
      await expect(rewarder.withdraw(1, 1)).to.be.revertedWithCustomError(rewarder, 'AccessDenied');
    });

    it('fail if call with zero amount param', async () => {
      await expect(rewarder.connect(strategy).withdraw(1, 0)).to.be.revertedWithCustomError(rewarder, 'ZeroAmount');
    });

    it('fail if call without deposite', async () => {
      await expect(rewarder.connect(strategy).withdraw(1, 10)).to.be.revertedWithCustomError(rewarder, 'ZeroAmount');
    });

    it('fail if try withdraw more then deposited', async () => {
      await rewarder.connect(strategy).deposit(1, 10);
      await expect(rewarder.connect(strategy).withdraw(1, 11)).to.be.reverted;
    });

    describe('correct full withdraw', async () => {
      let tx: any;
      let depositedAmount = BigInt(10);
      let tokenId = 1;

      beforeEach(async () => {
        expect(await rewarder.totalSupply()).to.be.eq(ZERO);
        await rewarder.connect(strategy).deposit(tokenId, depositedAmount);

        await time.increaseTo(await nextEpoch());

        tx = await rewarder.connect(strategy).withdraw(tokenId, depositedAmount);
      });

      it(`correct deposit and emit  event`, async () => {
        await expect(tx)
          .to.be.emit(rewarder, 'Withdraw')
          .withArgs(tokenId, depositedAmount, await currentEpoch());
      });

      it(`correct change user balance`, async () => {
        expect(await rewarder.balanceOf(tokenId)).to.be.eq(ZERO);
      });
      it(`correct balanceOfAt`, async () => {
        expect(await rewarder.balanceOfAt(tokenId, await previuesEpoch())).to.be.eq(depositedAmount);
        expect(await rewarder.balanceOfAt(tokenId, await currentEpoch())).to.be.eq(ZERO);
      });
      it(`correct change totalSupply`, async () => {
        expect(await rewarder.totalSupply()).to.be.eq(ZERO);
        expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(ZERO);
        expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(depositedAmount);
      });

      it(`initialize checkpoints`, async () => {
        expect(await rewarder.balanceCheckpoints(tokenId, 0)).to.be.deep.eq([0, 0]);
        expect(await rewarder.balanceCheckpoints(tokenId, 1)).to.be.deep.eq([await previuesEpoch(), depositedAmount]);
        expect(await rewarder.balanceCheckpoints(tokenId, 2)).to.be.deep.eq([await currentEpoch(), ZERO]);

        expect(await rewarder.tokensInfo(tokenId)).to.be.deep.eq([ZERO, 2, 0]);
      });
    });

    describe('correct partial withdraw', async () => {
      let tx: any;
      let depositedAmount = ethers.parseEther('1');
      let partialWithdraw = ethers.parseEther('0.3');
      let rest = ethers.parseEther('0.7');
      let depositedEpoch: number;
      let withdrawEpoch: number;
      let tokenId = 1;

      beforeEach(async () => {
        expect(await rewarder.totalSupply()).to.be.eq(ZERO);

        depositedEpoch = await currentEpoch();

        await rewarder.connect(strategy).deposit(tokenId, depositedAmount);

        await time.increase(await nextEpoch());

        withdrawEpoch = await currentEpoch();

        tx = await rewarder.connect(strategy).withdraw(tokenId, partialWithdraw);
      });

      it(`correct deposit and emit  event`, async () => {
        await expect(tx)
          .to.be.emit(rewarder, 'Withdraw')
          .withArgs(tokenId, partialWithdraw, await currentEpoch());
      });

      it(`correct change user balance`, async () => {
        expect(await rewarder.balanceOf(tokenId)).to.be.eq(rest);
      });

      it(`correct balanceOfAt`, async () => {
        expect(await rewarder.balanceOfAt(tokenId, await previuesEpoch())).to.be.eq(depositedAmount);
        expect(await rewarder.balanceOfAt(tokenId, await currentEpoch())).to.be.eq(rest);
      });

      it(`correct change totalSupply`, async () => {
        expect(await rewarder.totalSupply()).to.be.eq(rest);
        expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
        expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(depositedAmount);
        expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(rest);
      });

      it(`initialize checkpoints`, async () => {
        expect(await rewarder.tokensInfo(tokenId)).to.be.deep.eq([rest, 2, 0]);
        expect(await rewarder.balanceCheckpoints(tokenId, 0)).to.be.deep.eq([0, 0]);
        expect(await rewarder.balanceCheckpoints(tokenId, 1)).to.be.deep.eq([depositedEpoch, depositedAmount]);
        expect(await rewarder.balanceCheckpoints(tokenId, 2)).to.be.deep.eq([withdrawEpoch, rest]);
      });
    });
  });

  describe('#withdraw & #deposit', async () => {
    it('correct totalSupply changes', async () => {
      expect(await rewarder.totalSupply()).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(0);

      await rewarder.connect(strategy).deposit(1, 1);

      expect(await rewarder.totalSupply()).to.be.eq(1);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(1);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(1);

      await rewarder.connect(strategy).deposit(2, 10);

      expect(await rewarder.totalSupply()).to.be.eq(11);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(11);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(11);

      await rewarder.connect(strategy).deposit(1, 10);

      expect(await rewarder.totalSupply()).to.be.eq(21);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(21);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(21);

      await time.increase(await nextEpoch());

      expect(await rewarder.totalSupply()).to.be.eq(21);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(21);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(21);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(21);

      await rewarder.connect(strategy).withdraw(1, 11);

      expect(await rewarder.totalSupply()).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(21);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(10);

      await rewarder.connect(strategy).deposit(3, 5);
      await rewarder.connect(strategy).withdraw(2, 5);

      expect(await rewarder.totalSupply()).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(21);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(10);

      await time.increase(await nextEpoch());

      expect(await rewarder.totalSupply()).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(10);

      await rewarder.connect(strategy).withdraw(2, 5);
      await rewarder.connect(strategy).withdraw(3, 5);

      expect(await rewarder.totalSupply()).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(10);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(0);

      await time.increase(await nextEpoch());

      expect(await rewarder.totalSupply()).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(0)).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await previuesEpoch())).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await currentEpoch())).to.be.eq(0);
      expect(await rewarder.totalSupplyAt(await nextEpoch())).to.be.eq(0);
    });

    it('correct balanceOf history', async () => {
      expect(await rewarder.balanceOf(1)).to.be.eq(0);
      expect(await rewarder.balanceOf(2)).to.be.eq(0);
      expect(await rewarder.balanceOfAt(1, 0)).to.be.eq(0);
      expect(await rewarder.balanceOfAt(2, 0)).to.be.eq(0);

      expect(await rewarder.balanceOfAt(1, await currentEpoch())).to.be.eq(0);
      expect(await rewarder.balanceOfAt(2, await currentEpoch())).to.be.eq(0);

      await rewarder.connect(strategy).deposit(1, 1);

      expect(await rewarder.balanceOf(1)).to.be.eq(1);
      expect(await rewarder.balanceOf(2)).to.be.eq(0);

      expect(await rewarder.balanceOfAt(1, (await currentEpoch()) - 1)).to.be.eq(0);
      expect(await rewarder.balanceOfAt(1, await currentEpoch())).to.be.eq(1);
      expect(await rewarder.balanceOfAt(2, await currentEpoch())).to.be.eq(0);

      await rewarder.connect(strategy).deposit(2, 10);

      expect(await rewarder.balanceOf(1)).to.be.eq(1);
      expect(await rewarder.balanceOf(2)).to.be.eq(10);

      expect(await rewarder.balanceOfAt(1, (await currentEpoch()) - 1)).to.be.eq(0);
      expect(await rewarder.balanceOfAt(1, await currentEpoch())).to.be.eq(1);
      expect(await rewarder.balanceOfAt(2, (await currentEpoch()) - 1)).to.be.eq(0);
      expect(await rewarder.balanceOfAt(2, await currentEpoch())).to.be.eq(10);

      await rewarder.connect(strategy).deposit(1, 10);

      expect(await rewarder.balanceOf(1)).to.be.eq(11);
      expect(await rewarder.balanceOf(2)).to.be.eq(10);

      expect(await rewarder.balanceOfAt(1, (await currentEpoch()) - 1)).to.be.eq(0);
      expect(await rewarder.balanceOfAt(1, await currentEpoch())).to.be.eq(11);
      expect(await rewarder.balanceOfAt(2, (await currentEpoch()) - 1)).to.be.eq(0);
      expect(await rewarder.balanceOfAt(2, await currentEpoch())).to.be.eq(10);

      await time.increase(await nextEpoch());

      expect(await rewarder.balanceOf(1)).to.be.eq(11);
      expect(await rewarder.balanceOf(2)).to.be.eq(10);

      expect(await rewarder.balanceOfAt(1, (await currentEpoch()) - 1)).to.be.eq(11);
      expect(await rewarder.balanceOfAt(1, await currentEpoch())).to.be.eq(11);
      expect(await rewarder.balanceOfAt(2, (await currentEpoch()) - 1)).to.be.eq(10);
      expect(await rewarder.balanceOfAt(2, await currentEpoch())).to.be.eq(10);

      await rewarder.connect(strategy).withdraw(1, 11);

      expect(await rewarder.balanceOf(1)).to.be.eq(0);
      expect(await rewarder.balanceOf(2)).to.be.eq(10);

      expect(await rewarder.balanceOfAt(1, (await currentEpoch()) - 1)).to.be.eq(11);
      expect(await rewarder.balanceOfAt(1, await currentEpoch())).to.be.eq(0);
      expect(await rewarder.balanceOfAt(2, (await currentEpoch()) - 1)).to.be.eq(10);
      expect(await rewarder.balanceOfAt(2, await currentEpoch())).to.be.eq(10);
    });
  });

  describe('#notifyRewardAmount', async () => {
    it('fail if call from not `strategy` wallet', async () => {
      await expect(rewarder.notifyRewardAmount(1)).to.be.revertedWithCustomError(rewarder, 'AccessDenied');
    });

    it('fail if call with zero amount param', async () => {
      await expect(rewarder.connect(strategy).notifyRewardAmount(0)).to.be.revertedWithCustomError(rewarder, 'ZeroAmount');
    });

    it('correct call and add amount to rewards per epoch', async () => {
      expect(await rewarder.rewardsPerEpoch(0)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(ZERO);

      await expect(rewarder.connect(strategy).notifyRewardAmount(100))
        .to.be.emit(rewarder, 'NotifyReward')
        .withArgs(100, await currentEpoch());

      expect(await rewarder.rewardsPerEpoch(0)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(100);
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(ZERO);

      await expect(rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('1')))
        .to.be.emit(rewarder, 'NotifyReward')
        .withArgs(ethers.parseEther('1'), await currentEpoch());

      expect(await rewarder.rewardsPerEpoch(0)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(ethers.parseEther('1') + BigInt(100));
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.rewardsPerEpoch(0)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(0)).to.be.eq(ZERO);

      expect(await rewarder.rewardsPerEpoch((await previuesEpoch()) - _WEEK)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(ethers.parseEther('1') + BigInt(100));
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(ZERO);

      await expect(rewarder.connect(strategy).notifyRewardAmount(143e6))
        .to.be.emit(rewarder, 'NotifyReward')
        .withArgs(143e6, await currentEpoch());

      expect(await rewarder.rewardsPerEpoch((await previuesEpoch()) - _WEEK)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(ethers.parseEther('1') + BigInt(100));
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(143e6);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(ZERO);
    });
  });

  describe('#calculateAvailableRewardsAmount', async () => {
    it('return zero for tokenId without deposit', async () => {
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
    });
    it('return zero for tokenId without deposit but rewards for epcoh ', async () => {
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([0, 0, 0]);
      await rewarder.connect(strategy).notifyRewardAmount(100);
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      await time.increaseTo(await nextEpoch());
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([0, 0, 0]);
    });
    it('solo deposit rewards in the same epoch', async () => {
      await rewarder.connect(strategy).deposit(1, 1);

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([1, 1, 0]);
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(0);
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(0);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(0);

      await rewarder.connect(strategy).notifyRewardAmount(20);
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(0);
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(20);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(0);
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([1, 1, 0]);
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());
      expect(await rewarder.rewardsPerEpoch(await previuesEpoch())).to.be.eq(20);
      expect(await rewarder.rewardsPerEpoch(await currentEpoch())).to.be.eq(0);
      expect(await rewarder.rewardsPerEpoch(await nextEpoch())).to.be.eq(0);
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([1, 1, 0]);
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
    });

    it('solo deposit with rewards in next epoch', async () => {
      await rewarder.connect(strategy).notifyRewardAmount(10);

      await rewarder.connect(strategy).deposit(1, 100);

      await time.increaseTo(await nextEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(20);

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(20);

      await rewarder.connect(strategy).notifyRewardAmount(40);

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(60);

      await time.increaseTo(await nextEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(5);

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(65);

      await rewarder.connect(strategy).withdraw(1, 100);

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(65);

      await time.increaseTo(await nextEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(100);

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(65);

      await rewarder.connect(strategy).deposit(1, 50);

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(65);

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(65);

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(65);
    });

    it('multiply user with splits rewards', async () => {
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('100'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await rewarder.connect(strategy).deposit(1, ethers.parseEther('1'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('16'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('16'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await rewarder.connect(strategy).deposit(2, ethers.parseEther('3'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('16'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ZERO);
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('18.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('7.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('21'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('15'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await rewarder.connect(strategy).deposit(3, ethers.parseEther('6'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('21'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('15'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ZERO);

      await time.increaseTo(await nextEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('22'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('18'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('6'));

      await time.increaseTo(await nextEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('23'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('21'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('12'));

      await rewarder.connect(strategy).withdraw(1, ethers.parseEther('0.5'));
      await rewarder.connect(strategy).deposit(2, ethers.parseEther('0.5'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('23'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('21'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('12'));

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('23'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('21'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('12'));

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('23.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('24.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('18'));

      await rewarder.connect(strategy).harvest(2);

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('23.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('0'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('18'));

      await time.increaseTo(await nextEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('24'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('3.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('24'));

      await rewarder.connect(strategy).harvest(1);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('0'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('7'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('30'));

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('0'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('7'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('30'));

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('0.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(2)).to.be.eq(ethers.parseEther('10.5'));
      expect(await rewarder.calculateAvailableRewardsAmount(3)).to.be.eq(ethers.parseEther('36'));
    });
  });

  describe('#harvest', async () => {
    it('fail if call from not `strategy` wallet', async () => {
      await expect(rewarder.harvest(1)).to.be.revertedWithCustomError(rewarder, 'AccessDenied');
    });

    it('should correct update lastEarnEpoch and emit event without rewards', async () => {
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([0, 0, 0]);
      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, 0, await currentEpoch());
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([0, 0, await currentEpoch()]);
    });

    it('harvest rewards and update to actual last earn epoch', async () => {
      await rewarder.connect(strategy).deposit(1, ethers.parseEther('1'));

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([ethers.parseEther('1'), 1, 0]);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(0);

      await time.increaseTo(await nextEpoch());
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(0);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('5'));
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(ethers.parseEther('5'));

      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, ethers.parseEther('5'), await currentEpoch());

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([ethers.parseEther('1'), 1, await currentEpoch()]);
    });
    it('not recive tokens if notify after harvest call during epoch', async () => {
      await rewarder.connect(strategy).deposit(1, ethers.parseEther('1'));

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([ethers.parseEther('1'), 1, 0]);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));
      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(0);

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(0);

      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, 0, await currentEpoch());

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('5'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(0);

      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, 0, await currentEpoch());

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([ethers.parseEther('1'), 1, await currentEpoch()]);
    });

    it('user harvest before deposit', async () => {
      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([0, 0, 0]);

      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, 0, await currentEpoch());

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([0, 0, await currentEpoch()]);

      await rewarder.connect(strategy).deposit(1, ethers.parseEther('1'));

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([ethers.parseEther('1'), 1, await currentEpoch()]);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('10'));

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(0);

      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, 0, await currentEpoch());

      await time.increaseTo(await nextEpoch());

      expect(await rewarder.calculateAvailableRewardsAmount(1)).to.be.eq(0);

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([ethers.parseEther('1'), 1, await previuesEpoch()]);

      await rewarder.connect(strategy).notifyRewardAmount(ethers.parseEther('66'));

      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, ethers.parseEther('66'), await currentEpoch());

      expect(await rewarder.tokensInfo(1)).to.be.deep.eq([ethers.parseEther('1'), 1, await currentEpoch()]);

      expect(await rewarder.connect(strategy).harvest(1))
        .to.be.emit(rewarder, 'Harvest')
        .withArgs(1, 0, await currentEpoch());
    });
  });
});

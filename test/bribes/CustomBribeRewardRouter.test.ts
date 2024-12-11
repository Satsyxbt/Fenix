import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, getAccessControlError, WEEK, ZERO_ADDRESS } from '../utils/constants';

import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable,
  BribeVeFNXRewardToken,
  CustomBribeRewardRouter,
  ERC20Mock,
  Fenix,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  deployVoter,
} from '../utils/coreFixture';
import { ContractTransactionResponse, EtherSymbol } from 'ethers';

describe('CustomBribeRewardRouter Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;

  let BribeVeFNXRewardToken: BribeVeFNXRewardToken;
  let CustomBribeRewardRouter: CustomBribeRewardRouter;
  let CustomBribeRewardRouter_Implementation: CustomBribeRewardRouter;
  let Fenix: Fenix;
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let Voter: VoterUpgradeableV2;
  let token18: ERC20Mock;
  let externalBribe: BribeUpgradeable;
  let pool0: string;
  let pool1: string;
  let externalBribe1: BribeUpgradeable;

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    VotingEscrow = deployed.votingEscrow;
    Voter = deployed.voter;
    Fenix = deployed.fenix;

    let BribeVeFNXRewardToken_Implementation = await ethers.deployContract('BribeVeFNXRewardToken', [signers.blastGovernor]);

    let Proxy = await ethers.deployContract('TransparentUpgradeableProxy', [
      BribeVeFNXRewardToken_Implementation,
      signers.proxyAdmin,
      '0x',
    ]);

    BribeVeFNXRewardToken = await ethers.getContractAt('BribeVeFNXRewardToken', Proxy.target);
    await BribeVeFNXRewardToken.initialize(signers.blastGovernor, deployed.votingEscrow);

    CustomBribeRewardRouter_Implementation = await ethers.deployContract('CustomBribeRewardRouter', [signers.blastGovernor]);

    Proxy = await ethers.deployContract('TransparentUpgradeableProxy', [CustomBribeRewardRouter_Implementation, signers.proxyAdmin, '0x']);

    CustomBribeRewardRouter = await ethers.getContractAt('CustomBribeRewardRouter', Proxy.target);

    await CustomBribeRewardRouter.initialize(signers.blastGovernor, Voter, BribeVeFNXRewardToken);

    await BribeVeFNXRewardToken.grantRole(await BribeVeFNXRewardToken.MINTER_ROLE(), CustomBribeRewardRouter);

    token18 = await deployERC20MockToken(signers.deployer, 'Token18', 'T18', 18);
    await deployed.v2PairFactory.createPair(token18, Fenix, false);
    await deployed.v2PairFactory.createPair(token18, Fenix, true);
    pool0 = await deployed.v2PairFactory.getPair(token18, Fenix, false);
    pool1 = await deployed.v2PairFactory.getPair(token18, Fenix, true);

    await deployed.voter.createV2Gauge(pool0);
    await deployed.voter.createV2Gauge(pool1);

    let gauge = await deployed.voter.poolToGauge(pool0);
    let gaugeState = await deployed.voter.gaugesState(gauge);
    externalBribe = await ethers.getContractAt('BribeUpgradeable', gaugeState.externalBribe);

    gauge = await deployed.voter.poolToGauge(pool1);
    gaugeState = await deployed.voter.gaugesState(gauge);
    externalBribe1 = await ethers.getContractAt('BribeUpgradeable', gaugeState.externalBribe);

    await VotingEscrow.updateAddress('customBribeRewardRouter', CustomBribeRewardRouter.target);
  });

  describe('Deployment', async () => {
    describe('Should fail if', async () => {
      it('initialzie second time', async () => {
        await expect(CustomBribeRewardRouter.initialize(signers.blastGovernor, Voter, BribeVeFNXRewardToken)).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
      it('initialzie on implementation', async () => {
        await expect(
          CustomBribeRewardRouter_Implementation.initialize(signers.blastGovernor, Voter, BribeVeFNXRewardToken),
        ).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });
    });

    describe('Success initialize', async () => {
      it('containes roles', async () => {
        expect(await BribeVeFNXRewardToken.DEFAULT_ADMIN_ROLE()).to.be.eq(ethers.ZeroHash);
      });

      it('func disable by default', async () => {
        expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector)).to.be.false;
        expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx.fragment.selector)).to.be.false;
      });

      it('grant roles', async () => {
        expect(await CustomBribeRewardRouter.hasRole(await BribeVeFNXRewardToken.DEFAULT_ADMIN_ROLE(), signers.deployer)).to.be.true;
      });

      it('voter', async () => {
        expect(await CustomBribeRewardRouter.voter()).to.be.eq(Voter);
      });

      it('bribeVeFnxRewardToken', async () => {
        expect(await CustomBribeRewardRouter.bribeVeFnxRewardToken()).to.be.eq(BribeVeFNXRewardToken);
      });
    });
  });

  describe('#setupFuncEnable', async () => {
    it('should fail if call from not authorized user (DEFAULT_ADMIN_ROLE)', async () => {
      await expect(
        CustomBribeRewardRouter.connect(signers.otherUser1).setupFuncEnable(
          CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector,
          true,
        ),
      ).to.be.revertedWith(getAccessControlError(await CustomBribeRewardRouter.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address));
    });

    it('success enable func', async () => {
      expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector)).to.be.false;

      await expect(CustomBribeRewardRouter.setupFuncEnable(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector, true))
        .to.be.emit(CustomBribeRewardRouter, 'FuncEnabled')
        .withArgs(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector, true);

      expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector)).to.be.true;
      expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx.fragment.selector)).to.be.false;

      await expect(CustomBribeRewardRouter.setupFuncEnable(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector, false))
        .to.be.emit(CustomBribeRewardRouter, 'FuncEnabled')
        .withArgs(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector, false);
      expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector)).to.be.false;
      expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx.fragment.selector)).to.be.false;
    });
  });

  describe('#notifyRewardFNXInVeFNX', async () => {
    describe('Should fail if', async () => {
      it('func disabled', async () => {
        expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector)).to.be.false;

        await expect(
          CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardFNXInVeFNX(ethers.ZeroAddress, 1),
        ).to.be.revertedWithCustomError(CustomBribeRewardRouter, 'FunctionDisabled');
      });

      describe('enable function call', async () => {
        beforeEach(async () => {
          await CustomBribeRewardRouter.setupFuncEnable(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector, true);
        });

        it('user not approve FNX token', async () => {
          await expect(
            CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardFNXInVeFNX(ethers.ZeroAddress, 1),
          ).to.be.revertedWith(ERRORS.ERC20.InsufficientAllowance);
        });

        it('user not have enought FNX token', async () => {
          await Fenix.connect(signers.otherUser1).approve(CustomBribeRewardRouter, ethers.MaxUint256);
          await expect(
            CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardFNXInVeFNX(ethers.ZeroAddress, 1),
          ).to.be.revertedWith(ERRORS.ERC20.InsufficientBalance);
        });

        it('gauge not exist for target pool', async () => {
          await Fenix.approve(CustomBribeRewardRouter, ethers.MaxUint256);
          await expect(CustomBribeRewardRouter.notifyRewardFNXInVeFNX(ethers.ZeroAddress, 1)).to.be.revertedWithCustomError(
            CustomBribeRewardRouter,
            'InvalidPool',
          );
        });
        it('gauge is killed', async () => {
          await Voter.killGauge(await Voter.poolToGauge(pool0));
          await Fenix.approve(CustomBribeRewardRouter, ethers.MaxUint256);
          await expect(CustomBribeRewardRouter.notifyRewardFNXInVeFNX(pool0, 1)).to.be.revertedWithCustomError(
            CustomBribeRewardRouter,
            'InvalidPool',
          );
        });
        it('rewards token not allowed', async () => {
          await Fenix.approve(CustomBribeRewardRouter, ethers.MaxUint256);
          await expect(CustomBribeRewardRouter.notifyRewardFNXInVeFNX(pool0, 1)).to.be.revertedWith('reward token not verified');
        });
      });
    });

    describe('Success provive FNX as veFNX token bribe', async () => {
      let tx: ContractTransactionResponse;

      beforeEach(async () => {
        await externalBribe.addRewardToken(BribeVeFNXRewardToken);
        await CustomBribeRewardRouter.setupFuncEnable(CustomBribeRewardRouter.notifyRewardFNXInVeFNX.fragment.selector, true);
        await Fenix.approve(CustomBribeRewardRouter, ethers.parseEther('1'));
        tx = await CustomBribeRewardRouter.notifyRewardFNXInVeFNX(pool0, ethers.parseEther('1'));
      });

      it('success emit events', async () => {
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(signers.deployer, CustomBribeRewardRouter, ethers.parseEther('1'));
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(CustomBribeRewardRouter, BribeVeFNXRewardToken, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(ethers.ZeroAddress, CustomBribeRewardRouter, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(CustomBribeRewardRouter, externalBribe, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(externalBribe, 'RewardAdded')
          .withArgs(BribeVeFNXRewardToken, ethers.parseEther('1'), await deployed.minter.active_period());
        await expect(tx)
          .to.be.emit(CustomBribeRewardRouter, 'NotifyRewardFNXInVeFnx')
          .withArgs(signers.deployer, pool0, externalBribe, ethers.parseEther('1'));
      });

      it('zero allowance after all', async () => {
        expect(await Fenix.allowance(signers.deployer, CustomBribeRewardRouter)).to.be.eq(0);
        expect(await Fenix.allowance(CustomBribeRewardRouter, BribeVeFNXRewardToken)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe)).to.be.eq(0);
      });

      it('success change balances', async () => {
        expect(await Fenix.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
        expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('1'));
      });

      it('success add brVeFnx as reward in brib', async () => {
        let rewardData = await externalBribe.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
        expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('1'));
        expect(rewardData.lastUpdateTime).to.be.eq((await tx.getBlock())!.timestamp);
      });

      describe('Success provive second rewards amount FNX as veFNX token bribe to the same pool', async () => {
        let tx: ContractTransactionResponse;

        beforeEach(async () => {
          await Fenix.transfer(signers.otherUser1, ethers.parseEther('2'));
          await Fenix.connect(signers.otherUser1).approve(CustomBribeRewardRouter, ethers.parseEther('2'));
          tx = await CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardFNXInVeFNX(pool0, ethers.parseEther('2'));
        });

        it('success emit events', async () => {
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(signers.otherUser1, CustomBribeRewardRouter, ethers.parseEther('2'));
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(CustomBribeRewardRouter, BribeVeFNXRewardToken, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
            .withArgs(ethers.ZeroAddress, CustomBribeRewardRouter, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
            .withArgs(CustomBribeRewardRouter, externalBribe, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(externalBribe, 'RewardAdded')
            .withArgs(BribeVeFNXRewardToken, ethers.parseEther('2'), await deployed.minter.active_period());
          await expect(tx)
            .to.be.emit(CustomBribeRewardRouter, 'NotifyRewardFNXInVeFnx')
            .withArgs(signers.otherUser1, pool0, externalBribe, ethers.parseEther('2'));
        });

        it('zero allowance after all', async () => {
          expect(await Fenix.allowance(signers.otherUser1, CustomBribeRewardRouter)).to.be.eq(0);
          expect(await Fenix.allowance(signers.deployer, CustomBribeRewardRouter)).to.be.eq(0);
          expect(await Fenix.allowance(CustomBribeRewardRouter, BribeVeFNXRewardToken)).to.be.eq(0);
          expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe)).to.be.eq(0);
        });

        it('success change balances', async () => {
          expect(await Fenix.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
          expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('3'));

          expect(await BribeVeFNXRewardToken.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
          expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('3'));
          expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('3'));
        });

        it('success add brVeFnx as reward in bribe', async () => {
          let rewardData = await externalBribe.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
          expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('3'));
          expect(rewardData.lastUpdateTime).to.be.eq((await tx.getBlock())!.timestamp);
        });
        describe('Success provive third rewards amount FNX as veFNX token bribe to the another pool', async () => {
          let tx: ContractTransactionResponse;

          beforeEach(async () => {
            await externalBribe1.addRewardToken(BribeVeFNXRewardToken);
            await Fenix.transfer(signers.otherUser1, ethers.parseEther('2'));
            await Fenix.connect(signers.otherUser1).approve(CustomBribeRewardRouter, ethers.parseEther('2'));
            tx = await CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardFNXInVeFNX(pool1, ethers.parseEther('2'));
          });

          it('success emit events', async () => {
            await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(signers.otherUser1, CustomBribeRewardRouter, ethers.parseEther('2'));
            await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(CustomBribeRewardRouter, BribeVeFNXRewardToken, ethers.parseEther('2'));
            await expect(tx)
              .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
              .withArgs(ethers.ZeroAddress, CustomBribeRewardRouter, ethers.parseEther('2'));
            await expect(tx)
              .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
              .withArgs(CustomBribeRewardRouter, externalBribe1, ethers.parseEther('2'));
            await expect(tx)
              .to.be.emit(externalBribe1, 'RewardAdded')
              .withArgs(BribeVeFNXRewardToken, ethers.parseEther('2'), await deployed.minter.active_period());
            await expect(tx)
              .to.be.emit(CustomBribeRewardRouter, 'NotifyRewardFNXInVeFnx')
              .withArgs(signers.otherUser1, pool1, externalBribe1, ethers.parseEther('2'));
          });

          it('zero allowance after all', async () => {
            expect(await Fenix.allowance(signers.otherUser1, CustomBribeRewardRouter)).to.be.eq(0);
            expect(await Fenix.allowance(signers.deployer, CustomBribeRewardRouter)).to.be.eq(0);
            expect(await Fenix.allowance(CustomBribeRewardRouter, BribeVeFNXRewardToken)).to.be.eq(0);
            expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe)).to.be.eq(0);
            expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe1)).to.be.eq(0);
          });

          it('success change balances', async () => {
            expect(await Fenix.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
            expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('5'));

            expect(await BribeVeFNXRewardToken.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
            expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('5'));
            expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('3'));
            expect(await BribeVeFNXRewardToken.balanceOf(externalBribe1)).to.be.eq(ethers.parseEther('2'));
          });

          it('success add brVeFnx as reward in bribe', async () => {
            let rewardData = await externalBribe.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
            expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('3'));

            rewardData = await externalBribe1.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
            expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('2'));
            expect(rewardData.lastUpdateTime).to.be.eq((await tx.getBlock())!.timestamp);
          });
          describe('Claim rewards flow', async () => {
            let voteLock1: bigint;
            let voteLock2: bigint;

            beforeEach(async () => {
              expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('5'));
              expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('5'));
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('3'));
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe1)).to.be.eq(ethers.parseEther('2'));
              await Fenix.approve(VotingEscrow, ethers.parseEther('30'));
              await VotingEscrow.createLockFor(ethers.parseEther('20'), 0, signers.otherUser1, false, true, 0);
              voteLock1 = await VotingEscrow.lastMintedTokenId();
              await VotingEscrow.createLockFor(ethers.parseEther('10'), 0, signers.otherUser2, false, true, 0);
              voteLock2 = await VotingEscrow.lastMintedTokenId();

              await Voter.connect(signers.otherUser1).vote(voteLock1, [pool0], [100]);
              await Voter.connect(signers.otherUser2).vote(voteLock2, [pool0, pool1], [100, 100]);

              await time.increase(86400 * 7);
              await Voter.distributeAll();

              await BribeVeFNXRewardToken.updateCreateLockParams({
                lockDuration: 182 * 24 * 60 * 60,
                withPermanentLock: true,
                managedTokenIdForAttach: 0,
                shouldBoosted: false,
              });
            });

            it('success claim brVeFnx rewards in veFNX form', async () => {
              let mintedToken;
              let tx = await Voter.connect(signers.otherUser1)['claimBribes(address[],address[][])'](
                [externalBribe],
                [[BribeVeFNXRewardToken]],
              );

              mintedToken = await VotingEscrow.lastMintedTokenId();

              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(externalBribe, signers.otherUser1, ethers.parseEther('2.4'));
              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(signers.otherUser1, ethers.ZeroAddress, ethers.parseEther('2.4'));
              await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(BribeVeFNXRewardToken, VotingEscrow, ethers.parseEther('2.4'));
              await expect(tx).to.be.emit(VotingEscrow, 'Supply').withArgs(ethers.parseEther('30'), ethers.parseEther('32.4'));
              await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedToken);
              await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser1, mintedToken);

              await expect(tx)
                .to.be.emit(VotingEscrow, 'Deposit')
                .withArgs(
                  BribeVeFNXRewardToken,
                  mintedToken,
                  ethers.parseEther('2.4'),
                  (t: any) => {
                    return true;
                  },
                  1,

                  (
                    await tx.getBlock()
                  )?.timestamp,
                );

              expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(voteLock2 + 1n);
              expect(await VotingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);
              expect(await VotingEscrow.ownerOf(mintedToken)).to.be.eq(signers.otherUser1);

              expect((await VotingEscrow.getNftState(mintedToken)).locked.isPermanentLocked).to.be.true;
              expect((await VotingEscrow.getNftState(mintedToken)).locked.amount).to.be.eq(ethers.parseEther('2.4'));

              tx = await Voter.connect(signers.otherUser2)['claimBribes(address[],address[][])'](
                [externalBribe, externalBribe1],
                [[BribeVeFNXRewardToken], [BribeVeFNXRewardToken]],
              );

              expect(await Fenix.balanceOf(VotingEscrow)).to.be.eq(ethers.parseEther('35'));
              expect(await Fenix.balanceOf(signers.otherUser1)).to.be.eq(0);
              expect(await Fenix.balanceOf(signers.otherUser2)).to.be.eq(0);
              expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(0);
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(0);
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe1)).to.be.eq(0);
              expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(0);

              let mintedToken2 = (await VotingEscrow.lastMintedTokenId()) - 1n;
              let mintedToken3 = await VotingEscrow.lastMintedTokenId();

              await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser2, mintedToken2);
              await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser2, mintedToken3);

              await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(BribeVeFNXRewardToken, VotingEscrow, ethers.parseEther('2.0'));
              await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(BribeVeFNXRewardToken, VotingEscrow, ethers.parseEther('0.6'));
              await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedToken2);
              await expect(tx)
                .to.be.emit(VotingEscrow, 'Deposit')
                .withArgs(
                  BribeVeFNXRewardToken,
                  mintedToken2,
                  ethers.parseEther('0.6'),
                  (t: any) => {
                    return true;
                  },
                  1,

                  (
                    await tx.getBlock()
                  )?.timestamp,
                );
              await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedToken3);
              await expect(tx)
                .to.be.emit(VotingEscrow, 'Deposit')
                .withArgs(
                  BribeVeFNXRewardToken,
                  mintedToken3,
                  ethers.parseEther('2.0'),
                  (t: any) => {
                    return true;
                  },
                  1,

                  (
                    await tx.getBlock()
                  )?.timestamp,
                );

              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(externalBribe1, signers.otherUser2, ethers.parseEther('2'));
              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(externalBribe, signers.otherUser2, ethers.parseEther('0.6'));
              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(signers.otherUser2, ethers.ZeroAddress, ethers.parseEther('2.0'));
              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(signers.otherUser2, ethers.ZeroAddress, ethers.parseEther('0.6'));

              expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(voteLock2 + 3n);

              expect(await VotingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);
              expect(await VotingEscrow.balanceOf(signers.otherUser2)).to.be.eq(3);

              expect(await VotingEscrow.ownerOf(mintedToken)).to.be.eq(signers.otherUser1);
              expect(await VotingEscrow.ownerOf(mintedToken2)).to.be.eq(signers.otherUser2);
              expect(await VotingEscrow.ownerOf(mintedToken3)).to.be.eq(signers.otherUser2);

              expect((await VotingEscrow.getNftState(mintedToken2)).locked.isPermanentLocked).to.be.true;
              expect((await VotingEscrow.getNftState(mintedToken2)).locked.amount).to.be.eq(ethers.parseEther('0.6'));
              expect((await VotingEscrow.getNftState(mintedToken3)).locked.isPermanentLocked).to.be.true;
              expect((await VotingEscrow.getNftState(mintedToken3)).locked.amount).to.be.eq(ethers.parseEther('2'));
            });
          });
        });
      });
    });
  });

  describe('#notifyRewardVeFNXInVeFnx', async () => {
    let lock1Id: bigint;
    let lock2Id: bigint;
    let lock3Id: bigint;

    beforeEach(async () => {
      await Fenix.approve(VotingEscrow, ethers.parseEther('10'));
      await VotingEscrow.createLockFor(ethers.parseEther('1'), 0, signers.deployer, false, true, 0);
      lock1Id = await VotingEscrow.lastMintedTokenId();

      await VotingEscrow.createLockFor(ethers.parseEther('2'), 0, signers.otherUser1, false, true, 0);
      lock2Id = await VotingEscrow.lastMintedTokenId();

      await VotingEscrow.createLockFor(ethers.parseEther('2'), 182 * 24 * 60 * 60, signers.otherUser1, true, false, 0);
      lock3Id = await VotingEscrow.lastMintedTokenId();
    });

    describe('Should fail if', async () => {
      it('func disabled', async () => {
        expect(await CustomBribeRewardRouter.funcEnabled(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx.fragment.selector)).to.be.false;

        await expect(
          CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardVeFNXInVeFnx(ethers.ZeroAddress, 1),
        ).to.be.revertedWithCustomError(CustomBribeRewardRouter, 'FunctionDisabled');
      });

      describe('enable function call', async () => {
        beforeEach(async () => {
          await CustomBribeRewardRouter.setupFuncEnable(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx.fragment.selector, true);
        });

        it('call for invalid lock id', async () => {
          await expect(
            CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardVeFNXInVeFnx(ethers.ZeroAddress, 10),
          ).to.be.revertedWith('ERC721: invalid token ID');
        });
        it('user not approve lock for CustomBribeRewardRouter', async () => {
          await expect(
            CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardVeFNXInVeFnx(ethers.ZeroAddress, lock2Id),
          ).to.be.revertedWith('ERC721: caller is not token owner or approved');
        });

        it('gauge not exist for target pool', async () => {
          await VotingEscrow.approve(CustomBribeRewardRouter, lock1Id);
          await expect(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx(ethers.ZeroAddress, lock1Id)).to.be.revertedWithCustomError(
            CustomBribeRewardRouter,
            'InvalidPool',
          );
        });
        it('gauge is killed', async () => {
          await Voter.killGauge(await Voter.poolToGauge(pool0));
          await VotingEscrow.approve(CustomBribeRewardRouter, lock1Id);
          await expect(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx(pool0, 1)).to.be.revertedWithCustomError(
            CustomBribeRewardRouter,
            'InvalidPool',
          );
        });
        it('rewards token not allowed', async () => {
          await VotingEscrow.approve(CustomBribeRewardRouter, lock1Id);
          await expect(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx(pool0, 1)).to.be.revertedWith('reward token not verified');
        });
      });
    });

    describe('Success provive veFNX as veFNX token bribe', async () => {
      let tx: ContractTransactionResponse;

      beforeEach(async () => {
        await externalBribe.addRewardToken(BribeVeFNXRewardToken);
        await CustomBribeRewardRouter.setupFuncEnable(CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx.fragment.selector, true);
        await VotingEscrow.approve(CustomBribeRewardRouter, lock1Id);
        tx = await CustomBribeRewardRouter.notifyRewardVeFNXInVeFnx(pool0, lock1Id);
      });

      it('success emit events', async () => {
        await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(signers.deployer, CustomBribeRewardRouter, lock1Id);
        await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(CustomBribeRewardRouter, ethers.ZeroAddress, lock1Id);

        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(VotingEscrow, CustomBribeRewardRouter, ethers.parseEther('1'));
        await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(CustomBribeRewardRouter, BribeVeFNXRewardToken, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(ethers.ZeroAddress, CustomBribeRewardRouter, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
          .withArgs(CustomBribeRewardRouter, externalBribe, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(externalBribe, 'RewardAdded')
          .withArgs(BribeVeFNXRewardToken, ethers.parseEther('1'), await deployed.minter.active_period());
        await expect(tx)
          .to.be.emit(CustomBribeRewardRouter, 'NotifyRewardVeFNXInVeFnx')
          .withArgs(signers.deployer, pool0, externalBribe, lock1Id, ethers.parseEther('1'));
      });

      it('zero allowance after all', async () => {
        expect(await Fenix.allowance(signers.deployer, CustomBribeRewardRouter)).to.be.eq(0);
        expect(await Fenix.allowance(CustomBribeRewardRouter, BribeVeFNXRewardToken)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe)).to.be.eq(0);
      });

      it('success change balances', async () => {
        expect(await Fenix.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
        expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('1'));

        expect(await BribeVeFNXRewardToken.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
        expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('1'));
        expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('1'));
      });

      it('success add brVeFnx as reward in brib', async () => {
        let rewardData = await externalBribe.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
        expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('1'));
        expect(rewardData.lastUpdateTime).to.be.eq((await tx.getBlock())!.timestamp);
      });

      describe('Success provive second rewards amount FNX as veFNX token bribe to the same pool', async () => {
        let tx: ContractTransactionResponse;

        beforeEach(async () => {
          await VotingEscrow.connect(signers.otherUser1).approve(CustomBribeRewardRouter, lock2Id);
          tx = await CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardVeFNXInVeFnx(pool0, lock2Id);
        });

        it('success emit events', async () => {
          await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(signers.otherUser1, CustomBribeRewardRouter, lock2Id);
          await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(CustomBribeRewardRouter, ethers.ZeroAddress, lock2Id);

          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(VotingEscrow, CustomBribeRewardRouter, ethers.parseEther('2'));
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(CustomBribeRewardRouter, BribeVeFNXRewardToken, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
            .withArgs(ethers.ZeroAddress, CustomBribeRewardRouter, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
            .withArgs(CustomBribeRewardRouter, externalBribe, ethers.parseEther('2'));
          await expect(tx)
            .to.be.emit(externalBribe, 'RewardAdded')
            .withArgs(BribeVeFNXRewardToken, ethers.parseEther('2'), await deployed.minter.active_period());
          await expect(tx)
            .to.be.emit(CustomBribeRewardRouter, 'NotifyRewardVeFNXInVeFnx')
            .withArgs(signers.otherUser1, pool0, externalBribe, lock2Id, ethers.parseEther('2'));
        });

        it('zero allowance after all', async () => {
          expect(await Fenix.allowance(signers.otherUser1, CustomBribeRewardRouter)).to.be.eq(0);
          expect(await Fenix.allowance(signers.deployer, CustomBribeRewardRouter)).to.be.eq(0);
          expect(await Fenix.allowance(CustomBribeRewardRouter, BribeVeFNXRewardToken)).to.be.eq(0);
          expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe)).to.be.eq(0);
        });

        it('success change balances', async () => {
          expect(await Fenix.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
          expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('3'));

          expect(await BribeVeFNXRewardToken.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
          expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('3'));
          expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('3'));
        });

        it('success add brVeFnx as reward in bribe', async () => {
          let rewardData = await externalBribe.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
          expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('3'));
          expect(rewardData.lastUpdateTime).to.be.eq((await tx.getBlock())!.timestamp);
        });
        describe('Success provive third rewards amount FNX as veFNX token bribe to the another pool', async () => {
          let tx: ContractTransactionResponse;

          beforeEach(async () => {
            await externalBribe1.addRewardToken(BribeVeFNXRewardToken);
            await VotingEscrow.connect(signers.otherUser1).approve(CustomBribeRewardRouter, lock3Id);
            tx = await CustomBribeRewardRouter.connect(signers.otherUser1).notifyRewardVeFNXInVeFnx(pool1, lock3Id);
          });

          it('success emit events', async () => {
            await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(signers.otherUser1, CustomBribeRewardRouter, lock3Id);
            await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(CustomBribeRewardRouter, ethers.ZeroAddress, lock3Id);

            await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(VotingEscrow, CustomBribeRewardRouter, ethers.parseEther('2'));
            await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(CustomBribeRewardRouter, BribeVeFNXRewardToken, ethers.parseEther('2'));
            await expect(tx)
              .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
              .withArgs(ethers.ZeroAddress, CustomBribeRewardRouter, ethers.parseEther('2'));
            await expect(tx)
              .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
              .withArgs(CustomBribeRewardRouter, externalBribe1, ethers.parseEther('2'));
            await expect(tx)
              .to.be.emit(externalBribe1, 'RewardAdded')
              .withArgs(BribeVeFNXRewardToken, ethers.parseEther('2'), await deployed.minter.active_period());
            await expect(tx)
              .to.be.emit(CustomBribeRewardRouter, 'NotifyRewardVeFNXInVeFnx')
              .withArgs(signers.otherUser1, pool1, externalBribe1, lock3Id, ethers.parseEther('2'));
          });

          it('zero allowance after all', async () => {
            expect(await Fenix.allowance(signers.otherUser1, CustomBribeRewardRouter)).to.be.eq(0);
            expect(await Fenix.allowance(signers.deployer, CustomBribeRewardRouter)).to.be.eq(0);
            expect(await Fenix.allowance(CustomBribeRewardRouter, BribeVeFNXRewardToken)).to.be.eq(0);
            expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe)).to.be.eq(0);
            expect(await BribeVeFNXRewardToken.allowance(CustomBribeRewardRouter, externalBribe1)).to.be.eq(0);
          });

          it('success change balances', async () => {
            expect(await Fenix.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
            expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('5'));

            expect(await BribeVeFNXRewardToken.balanceOf(CustomBribeRewardRouter)).to.be.eq(0);
            expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('5'));
            expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('3'));
            expect(await BribeVeFNXRewardToken.balanceOf(externalBribe1)).to.be.eq(ethers.parseEther('2'));
          });

          it('success add brVeFnx as reward in bribe', async () => {
            let rewardData = await externalBribe.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
            expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('3'));

            rewardData = await externalBribe1.rewardData(BribeVeFNXRewardToken, await deployed.minter.active_period());
            expect(rewardData.rewardsPerEpoch).to.be.eq(ethers.parseEther('2'));
            expect(rewardData.lastUpdateTime).to.be.eq((await tx.getBlock())!.timestamp);
          });

          describe('Claim rewards flow', async () => {
            let voteLock1: bigint;
            let voteLock2: bigint;

            beforeEach(async () => {
              expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(ethers.parseEther('5'));
              expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(ethers.parseEther('5'));
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(ethers.parseEther('3'));
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe1)).to.be.eq(ethers.parseEther('2'));
              await Fenix.approve(VotingEscrow, ethers.parseEther('30'));
              await VotingEscrow.createLockFor(ethers.parseEther('20'), 0, signers.otherUser1, false, true, 0);
              voteLock1 = await VotingEscrow.lastMintedTokenId();
              await VotingEscrow.createLockFor(ethers.parseEther('10'), 0, signers.otherUser2, false, true, 0);
              voteLock2 = await VotingEscrow.lastMintedTokenId();

              await Voter.connect(signers.otherUser1).vote(voteLock1, [pool0], [100]);
              await Voter.connect(signers.otherUser2).vote(voteLock2, [pool0, pool1], [100, 100]);

              await time.increase(86400 * 7);
              await Voter.distributeAll();

              await BribeVeFNXRewardToken.updateCreateLockParams({
                lockDuration: 182 * 24 * 60 * 60,
                withPermanentLock: true,
                managedTokenIdForAttach: 0,
                shouldBoosted: false,
              });
            });

            it('success claim brVeFnx rewards in veFNX form', async () => {
              let mintedToken;
              let tx = await Voter.connect(signers.otherUser1)['claimBribes(address[],address[][])'](
                [externalBribe],
                [[BribeVeFNXRewardToken]],
              );

              mintedToken = await VotingEscrow.lastMintedTokenId();

              expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(voteLock2 + 1n);

              expect(await VotingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);
              expect(await VotingEscrow.ownerOf(mintedToken)).to.be.eq(signers.otherUser1);

              expect((await VotingEscrow.getNftState(mintedToken)).locked.isPermanentLocked).to.be.true;
              expect((await VotingEscrow.getNftState(mintedToken)).locked.amount).to.be.eq(ethers.parseEther('2.4'));

              tx = await Voter.connect(signers.otherUser2)['claimBribes(address[],address[][])'](
                [externalBribe, externalBribe1],
                [[BribeVeFNXRewardToken], [BribeVeFNXRewardToken]],
              );

              expect(await Fenix.balanceOf(VotingEscrow)).to.be.eq(ethers.parseEther('35'));
              expect(await Fenix.balanceOf(signers.otherUser1)).to.be.eq(0);
              expect(await Fenix.balanceOf(signers.otherUser2)).to.be.eq(0);
              expect(await Fenix.balanceOf(BribeVeFNXRewardToken)).to.be.eq(0);
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe)).to.be.eq(0);
              expect(await BribeVeFNXRewardToken.balanceOf(externalBribe1)).to.be.eq(0);
              expect(await BribeVeFNXRewardToken.totalSupply()).to.be.eq(0);

              let mintedToken2 = (await VotingEscrow.lastMintedTokenId()) - 1n;
              let mintedToken3 = await VotingEscrow.lastMintedTokenId();

              await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser2, mintedToken2);
              await expect(tx).to.be.emit(VotingEscrow, 'Transfer').withArgs(ethers.ZeroAddress, signers.otherUser2, mintedToken3);

              await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(BribeVeFNXRewardToken, VotingEscrow, ethers.parseEther('2.0'));
              await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(BribeVeFNXRewardToken, VotingEscrow, ethers.parseEther('0.6'));
              await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedToken2);
              await expect(tx)
                .to.be.emit(VotingEscrow, 'Deposit')
                .withArgs(
                  BribeVeFNXRewardToken,
                  mintedToken2,
                  ethers.parseEther('0.6'),
                  (t: any) => {
                    return true;
                  },
                  1,

                  (
                    await tx.getBlock()
                  )?.timestamp,
                );
              await expect(tx).to.be.emit(VotingEscrow, 'LockPermanent').withArgs(BribeVeFNXRewardToken, mintedToken3);
              await expect(tx)
                .to.be.emit(VotingEscrow, 'Deposit')
                .withArgs(
                  BribeVeFNXRewardToken,
                  mintedToken3,
                  ethers.parseEther('2.0'),
                  (t: any) => {
                    return true;
                  },
                  1,

                  (
                    await tx.getBlock()
                  )?.timestamp,
                );

              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(externalBribe1, signers.otherUser2, ethers.parseEther('2'));
              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(externalBribe, signers.otherUser2, ethers.parseEther('0.6'));
              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(signers.otherUser2, ethers.ZeroAddress, ethers.parseEther('2.0'));
              await expect(tx)
                .to.be.emit(BribeVeFNXRewardToken, 'Transfer')
                .withArgs(signers.otherUser2, ethers.ZeroAddress, ethers.parseEther('0.6'));
              expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(voteLock2 + 3n);

              expect(await VotingEscrow.balanceOf(signers.otherUser1)).to.be.eq(2);
              expect(await VotingEscrow.balanceOf(signers.otherUser2)).to.be.eq(3);

              expect(await VotingEscrow.ownerOf(mintedToken)).to.be.eq(signers.otherUser1);
              expect(await VotingEscrow.ownerOf(mintedToken2)).to.be.eq(signers.otherUser2);
              expect(await VotingEscrow.ownerOf(mintedToken3)).to.be.eq(signers.otherUser2);

              expect((await VotingEscrow.getNftState(mintedToken2)).locked.isPermanentLocked).to.be.true;
              expect((await VotingEscrow.getNftState(mintedToken2)).locked.amount).to.be.eq(ethers.parseEther('0.6'));
              expect((await VotingEscrow.getNftState(mintedToken3)).locked.isPermanentLocked).to.be.true;
              expect((await VotingEscrow.getNftState(mintedToken3)).locked.amount).to.be.eq(ethers.parseEther('2'));
            });
          });
        });
      });
    });
  });
});

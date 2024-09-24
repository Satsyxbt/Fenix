import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture, mine, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  ManagedNFTManagerMock,
  ManagedNFTManagerUpgradeable,
  MinimalLinearVestingUpgradeable,
  VeArtProxyUpgradeable,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import completeFixture, { deployERC20MockToken, mockBlast } from '../utils/coreFixture';

import { ContractTransactionResponse } from 'ethers';
import { ERRORS, ONE, ONE_ETHER } from '../utils/constants';
import { Contract } from '@ethersproject/contracts';
import { bigint } from 'hardhat/internal/core/params/argumentTypes';

type Signers = {
  deployer: HardhatEthersSigner;
  blastGovernor: HardhatEthersSigner;
  proxyAdmin: HardhatEthersSigner;
  user1: HardhatEthersSigner;
  user2: HardhatEthersSigner;
  others: HardhatEthersSigner[];
};

async function fixture() {
  await mockBlast();
  let signers = await ethers.getSigners();
  let MinimalLinearVesting_Implementation = await ethers.deployContract('MinimalLinearVestingUpgradeable', [signers[1].address]);

  let MinimalLinearVesting = (await ethers.deployContract('TransparentUpgradeableProxy', [
    MinimalLinearVesting_Implementation.target,
    signers[2].address,
    '0x',
  ])) as any;
  MinimalLinearVesting = await ethers.getContractAt('MinimalLinearVestingUpgradeable', MinimalLinearVesting.target);
  return {
    signers: {
      deployer: signers[0],
      blastGovernor: signers[1],
      proxyAdmin: signers[2],
      user1: signers[3],
      user2: signers[4],
      others: signers.slice(5, 10),
    },
    MinimalLinearVesting_Implementation: MinimalLinearVesting_Implementation,
    MinimalLinearVesting: MinimalLinearVesting,
  };
}

describe('MinimalLinearVestingUpgradeable', function () {
  let MinimalLinearVesting_Implementation: MinimalLinearVestingUpgradeable;
  let MinimalLinearVesting: MinimalLinearVestingUpgradeable;
  let signers: Signers;
  let token: ERC20Mock;
  let initializeTx: ContractTransactionResponse;
  let startTimestamp: number;
  let duration = 6 * 30 * 24 * 60 * 60;

  beforeEach(async () => {
    const deployed = await fixture();
    MinimalLinearVesting_Implementation = deployed.MinimalLinearVesting_Implementation;
    MinimalLinearVesting = deployed.MinimalLinearVesting;
    signers = deployed.signers;
    token = await deployERC20MockToken(signers.deployer, 'MOK', 'MOK', 18);
    startTimestamp = (await time.latest()) + 10000000;
    initializeTx = await MinimalLinearVesting.initialize(signers.blastGovernor.address, token.target, startTimestamp, duration);
  });

  describe('Deployment', async () => {
    describe('should fail if', async () => {
      it('try call initialize on implementation', async () => {
        await expect(
          MinimalLinearVesting_Implementation.initialize(signers.blastGovernor.address, token.target, startTimestamp, duration),
        ).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });
      it('try recall initialize on proxy', async () => {
        await expect(
          MinimalLinearVesting.initialize(signers.blastGovernor.address, token.target, startTimestamp, duration),
        ).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });
    });

    describe('state after deployment and initialization', async () => {
      it('should emit update vesting params event', async () => {
        await expect(initializeTx).to.be.emit(MinimalLinearVesting, 'UpdateVestingParams').withArgs(startTimestamp, duration);
      });

      it('caller should be owner', async () => {
        expect(await MinimalLinearVesting.owner()).to.be.eq(signers.deployer.address);
      });

      it('token', async () => {
        expect(await MinimalLinearVesting.token()).to.be.eq(token.target);
      });

      it('others params', async () => {
        expect(await MinimalLinearVesting.duration()).to.be.eq(duration);
        expect(await MinimalLinearVesting.startTimestamp()).to.be.eq(startTimestamp);
      });

      it('zero token balance', async () => {
        expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(0);
      });
    });
  });

  describe('isClaimPhase', async () => {
    it('should return false if call before claim phase', async () => {
      expect(await time.latest()).to.be.lessThan(startTimestamp);
      expect(await MinimalLinearVesting.isClaimPhase()).to.be.false;
    });

    it('should return true if call during claim phase', async () => {
      expect(await time.latest()).to.be.lessThan(startTimestamp);
      expect(await MinimalLinearVesting.isClaimPhase()).to.be.false;
      await time.increaseTo(startTimestamp);
      expect(await MinimalLinearVesting.isClaimPhase()).to.be.true;
      await time.increaseTo(startTimestamp + duration);
      expect(await MinimalLinearVesting.isClaimPhase()).to.be.true;
      await time.increaseTo(startTimestamp + duration + duration);
      expect(await MinimalLinearVesting.isClaimPhase()).to.be.true;
    });
  });

  describe('#setVestingParams', async () => {
    describe('should fail if', async () => {
      it('call from not owner', async () => {
        await expect(MinimalLinearVesting.connect(signers.user1).setVestingParams(0, 0)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('try call after claim phase', async () => {
        await time.increaseTo(startTimestamp);
        await expect(MinimalLinearVesting.connect(signers.deployer).setVestingParams(0, 0)).to.be.revertedWithCustomError(
          MinimalLinearVesting,
          'NotAvailableDuringClaimPhase',
        );
      });
    });

    it('success setup params and emit event', async () => {
      expect(await MinimalLinearVesting.duration()).to.be.eq(duration);
      expect(await MinimalLinearVesting.startTimestamp()).to.be.eq(startTimestamp);
      let newStartTimestamp = (await time.latest()) + 10000;
      let newDuration = 10000;
      await expect(MinimalLinearVesting.setVestingParams(newStartTimestamp, newDuration))
        .to.be.emit(MinimalLinearVesting, 'UpdateVestingParams')
        .withArgs(newStartTimestamp, newDuration);
      expect(await MinimalLinearVesting.duration()).to.be.not.eq(duration);
      expect(await MinimalLinearVesting.startTimestamp()).to.be.not.eq(startTimestamp);
      expect(await MinimalLinearVesting.duration()).to.be.eq(newDuration);
      expect(await MinimalLinearVesting.startTimestamp()).to.be.eq(newStartTimestamp);
    });
  });

  describe('#setWalletsAllocation', async () => {
    describe('should fail if', async () => {
      it('call from not owner', async () => {
        await expect(MinimalLinearVesting.connect(signers.user1).setWalletsAllocation([], [])).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('try call after claim phase', async () => {
        await time.increaseTo(startTimestamp);
        await expect(MinimalLinearVesting.setWalletsAllocation([], [])).to.be.revertedWithCustomError(
          MinimalLinearVesting,
          'NotAvailableDuringClaimPhase',
        );
      });

      it('one from arraies is empty', async () => {
        await expect(MinimalLinearVesting.setWalletsAllocation([], [])).to.be.revertedWithCustomError(
          MinimalLinearVesting,
          'ArrayLengthMismatch',
        );
      });
      it('different arraies length', async () => {
        await expect(MinimalLinearVesting.setWalletsAllocation([signers.user1.address], [1, 2])).to.be.revertedWithCustomError(
          MinimalLinearVesting,
          'ArrayLengthMismatch',
        );
      });
    });

    it('success transfer tokens', async () => {
      expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(0);
      await token.mint(signers.deployer.address, ethers.parseEther('1000'));
      await token.approve(MinimalLinearVesting.target, ethers.parseEther('1000'));
      await expect(MinimalLinearVesting.setWalletsAllocation([signers.user1.address], [ethers.parseEther('1')]))
        .to.be.emit(token, 'Transfer')
        .withArgs(signers.deployer.address, MinimalLinearVesting.target, ethers.parseEther('1'));
      expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(ethers.parseEther('1'));
      expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(ethers.parseEther('1'));

      await expect(MinimalLinearVesting.setWalletsAllocation([signers.user1.address], [0]))
        .to.be.emit(token, 'Transfer')
        .withArgs(MinimalLinearVesting.target, signers.deployer.address, ethers.parseEther('1'));
      expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(0);

      await expect(
        MinimalLinearVesting.setWalletsAllocation(
          [signers.user1.address, signers.user2.address],
          [ethers.parseEther('1'), ethers.parseEther('1')],
        ),
      )
        .to.be.emit(token, 'Transfer')
        .withArgs(signers.deployer.address, MinimalLinearVesting.target, ethers.parseEther('2'));
      expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(ethers.parseEther('2'));
      expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(ethers.parseEther('2'));

      await expect(
        MinimalLinearVesting.setWalletsAllocation(
          [signers.user1.address, signers.user2.address],
          [ethers.parseEther('1'), ethers.parseEther('0.5')],
        ),
      )
        .to.be.emit(token, 'Transfer')
        .withArgs(MinimalLinearVesting.target, signers.deployer.address, ethers.parseEther('0.5'));
      expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(ethers.parseEther('1.5'));
      expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(ethers.parseEther('1.5'));
    });

    it('success update totalAllocated', async () => {
      await token.mint(MinimalLinearVesting.target, ethers.parseEther('1'));
      await token.approve(MinimalLinearVesting.target, ethers.parseEther('10000'));
      expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(0);
      await MinimalLinearVesting.setWalletsAllocation([signers.user1.address, signers.user2.address, signers.deployer.address], [1, 2, 3]),
        expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(6);
      await MinimalLinearVesting.setWalletsAllocation([signers.user1.address], [0]),
        expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(5);
      await MinimalLinearVesting.setWalletsAllocation([signers.user1.address, signers.user2.address, signers.deployer.address], [1, 2, 3]),
        expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(6);
      await MinimalLinearVesting.setWalletsAllocation([signers.user1.address, signers.user2.address, signers.deployer.address], [0, 0, 0]),
        expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(0);
      await MinimalLinearVesting.setWalletsAllocation([signers.user1.address], [ethers.parseEther('1')]),
        expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(ONE_ETHER);
      await MinimalLinearVesting.setWalletsAllocation([signers.user1.address], [ethers.parseEther('0.5')]),
        expect(await MinimalLinearVesting.totalAllocated()).to.be.eq(ethers.parseEther('0.5'));
    });

    it('success set allocations for wallets and emit events', async () => {
      expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(0);
      expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(0);
      expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(0);
      await token.mint(MinimalLinearVesting.target, ethers.parseEther('1'));
      await expect(
        MinimalLinearVesting.setWalletsAllocation([signers.user1.address, signers.user2.address, signers.deployer.address], [1, 2, 3]),
      )
        .to.be.emit(MinimalLinearVesting, 'UpdateWalletsAllocation')
        .withArgs([signers.user1.address, signers.user2.address, signers.deployer.address], [1, 2, 3]);
      expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(1);
      expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(2);
      expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(3);
      await expect(MinimalLinearVesting.setWalletsAllocation([signers.user2.address, signers.deployer.address], [0, 5]))
        .to.be.emit(MinimalLinearVesting, 'UpdateWalletsAllocation')
        .withArgs([signers.user2.address, signers.deployer.address], [0, 5]);
      expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(1);
      expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(0);
      expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(5);
    });
  });

  describe('#claim', async () => {
    describe('should fail if', async () => {
      it('claim phase not started', async () => {
        await expect(MinimalLinearVesting.connect(signers.user1).claim()).to.be.revertedWithCustomError(
          MinimalLinearVesting,
          'ClaimPhaseNotStarted',
        );
        await MinimalLinearVesting.setVestingParams(0, 10000);
        await expect(MinimalLinearVesting.connect(signers.user1).claim()).to.be.revertedWithCustomError(
          MinimalLinearVesting,
          'ClaimPhaseNotStarted',
        );
      });
      it('user havent allocate', async () => {
        await time.increaseTo(startTimestamp);
        await expect(MinimalLinearVesting.connect(signers.user1).claim()).to.be.revertedWithCustomError(
          MinimalLinearVesting,
          'ZeroClaimAmount',
        );
      });
    });
    describe('succes claim', async () => {
      const user1Allocate = ethers.parseEther('1');
      const user2Allocate = ethers.parseEther('10');
      const deployerAllocate = ethers.parseEther('100');

      beforeEach(async () => {
        await token.mint(MinimalLinearVesting.target, deployerAllocate + user1Allocate + user2Allocate);
        await MinimalLinearVesting.setWalletsAllocation(
          [signers.user1.address, signers.user2.address, signers.deployer.address],
          [user1Allocate, user2Allocate, deployerAllocate],
        );
      });

      it('state before vesting passed on 10%', async () => {
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.eq(0);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.eq(0);
        expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(user1Allocate);
        expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(user2Allocate);
        expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(deployerAllocate);
        expect(await MinimalLinearVesting.claimed(signers.user1.address)).to.be.eq(0);
        expect(await MinimalLinearVesting.claimed(signers.user2.address)).to.be.eq(0);
        expect(await MinimalLinearVesting.claimed(signers.deployer.address)).to.be.eq(0);

        expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(user1Allocate + user2Allocate + deployerAllocate);
        expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(ethers.parseEther('111'));
        expect(await token.balanceOf(signers.user1.address)).to.be.eq(0);
        expect(await token.balanceOf(signers.user2.address)).to.be.eq(0);
        expect(await token.balanceOf(signers.deployer.address)).to.be.eq(0);
      });

      describe('vesting passed 10%', async () => {
        beforeEach(async () => {
          await time.increaseTo(startTimestamp + Math.floor(duration / 10));
        });

        it('state before claim', async () => {
          expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
            user1Allocate / BigInt(10),
            user1Allocate / BigInt(10000),
          );
          expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.closeTo(
            user2Allocate / BigInt(10),
            user2Allocate / BigInt(10000),
          );
          expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.closeTo(
            deployerAllocate / BigInt(10),
            deployerAllocate / BigInt(10000),
          );
        });

        describe('after claim from user1', async () => {
          let tx: ContractTransactionResponse;
          let claimAmount = user1Allocate / BigInt(10);
          let expectClaimAmount = user1Allocate / BigInt(10);
          let decimals = user1Allocate / BigInt(100000);

          beforeEach(async () => {
            tx = await MinimalLinearVesting.connect(signers.user1).claim();
            claimAmount = await token.balanceOf(signers.user1.address);
          });

          it('success tranfer tokens', async () => {
            let balance = await token.balanceOf(signers.user1.address);
            expect(balance).to.be.closeTo(expectClaimAmount, decimals);
            expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(ethers.parseEther('111') - claimAmount);
            await expect(tx).to.be.emit(token, 'Transfer').withArgs(MinimalLinearVesting.target, signers.user1.address, claimAmount);
          });

          it('success claim from user 1 and emit event', async () => {
            await expect(tx).to.be.emit(MinimalLinearVesting, 'Claim').withArgs(signers.user1.address, claimAmount);
            expect(await MinimalLinearVesting.claimed(signers.user1.address)).to.be.eq(claimAmount);
            expect(await MinimalLinearVesting.claimed(signers.user2.address)).to.be.eq(0);
            expect(await MinimalLinearVesting.claimed(signers.deployer.address)).to.be.eq(0);
            expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(user1Allocate);
            expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(user2Allocate);
            expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(deployerAllocate);
            expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
            expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.closeTo(
              user2Allocate / BigInt(10),
              user2Allocate / BigInt(10000),
            );
            expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.closeTo(
              deployerAllocate / BigInt(10),
              deployerAllocate / BigInt(10000),
            );
          });
          describe('vesting passed 50%', async () => {
            beforeEach(async () => {
              await time.increaseTo(startTimestamp + Math.floor(duration / 2));
            });

            it('state before claim', async () => {
              expect(await MinimalLinearVesting.claimed(signers.user1.address)).to.be.eq(claimAmount);
              expect(await MinimalLinearVesting.claimed(signers.user2.address)).to.be.eq(0);
              expect(await MinimalLinearVesting.claimed(signers.deployer.address)).to.be.eq(0);
              expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(user1Allocate);
              expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(user2Allocate);
              expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(deployerAllocate);
              expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
                user1Allocate / 2n - claimAmount,
                ethers.parseEther('0.00001'),
              );
              expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.closeTo(user2Allocate / 2n, decimals);
              expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.closeTo(
                deployerAllocate / BigInt(2),
                decimals,
              );
            });

            describe('after claim from user1 and user2', async () => {
              let tx1: ContractTransactionResponse;
              let tx2: ContractTransactionResponse;
              let expectClaimAmount = user1Allocate / BigInt(2) - claimAmount;
              let expectUser2ClaimAmount = user2Allocate / BigInt(2);
              let precision = ethers.parseEther('0.001');

              beforeEach(async () => {
                tx1 = await MinimalLinearVesting.connect(signers.user1).claim();
                tx2 = await MinimalLinearVesting.connect(signers.user2).claim();
              });

              it('success tranfer tokens', async () => {
                expect(await token.balanceOf(signers.user1.address)).to.be.closeTo(expectClaimAmount + claimAmount, precision);
                expect(await token.balanceOf(signers.user2.address)).to.be.closeTo(expectUser2ClaimAmount, precision);
                expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.closeTo(
                  ethers.parseEther('111') - ethers.parseEther('5.5'),
                  precision,
                );
              });

              it('success claim and emit event', async () => {
                await expect(tx).to.be.emit(MinimalLinearVesting, 'Claim').withArgs(signers.user1.address, claimAmount);
                expect(await MinimalLinearVesting.claimed(signers.user1.address)).to.be.closeTo(ethers.parseEther('0.5'), precision);
                expect(await MinimalLinearVesting.claimed(signers.user2.address)).to.be.closeTo(ethers.parseEther('5'), precision);
                expect(await MinimalLinearVesting.claimed(signers.deployer.address)).to.be.eq(0);
                expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(user1Allocate);
                expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(user2Allocate);
                expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(deployerAllocate);
                expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.lessThan(precision);
                expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.lessThan(precision);
                expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.closeTo(
                  deployerAllocate / BigInt(2),
                  precision,
                );
              });

              describe('vesting passed 100%', async () => {
                beforeEach(async () => {
                  await time.increaseTo(startTimestamp + duration);
                });

                it('state before claim', async () => {
                  expect(await MinimalLinearVesting.claimed(signers.user1.address)).to.be.closeTo(user1Allocate / BigInt(2), precision);
                  expect(await MinimalLinearVesting.claimed(signers.user2.address)).to.be.closeTo(user2Allocate / BigInt(2), precision);
                  expect(await MinimalLinearVesting.claimed(signers.deployer.address)).to.be.eq(0);
                  expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(user1Allocate);
                  expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(user2Allocate);
                  expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(deployerAllocate);
                  expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
                    user1Allocate / BigInt(2),
                    precision,
                  );
                  expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.closeTo(
                    user2Allocate / BigInt(2),
                    precision,
                  );
                  expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.eq(deployerAllocate);
                });

                describe('after claim from user1 and user2', async () => {
                  let tx1: ContractTransactionResponse;
                  let tx2: ContractTransactionResponse;
                  let tx3: ContractTransactionResponse;

                  beforeEach(async () => {
                    tx1 = await MinimalLinearVesting.connect(signers.user1).claim();
                    tx2 = await MinimalLinearVesting.connect(signers.user2).claim();
                    tx3 = await MinimalLinearVesting.connect(signers.deployer).claim();
                  });

                  it('state after claim', async () => {
                    expect(await MinimalLinearVesting.claimed(signers.user1.address)).to.be.eq(user1Allocate);
                    expect(await MinimalLinearVesting.claimed(signers.user2.address)).to.be.eq(user2Allocate);
                    expect(await MinimalLinearVesting.claimed(signers.deployer.address)).to.be.eq(deployerAllocate);
                    expect(await MinimalLinearVesting.allocation(signers.user1.address)).to.be.eq(user1Allocate);
                    expect(await MinimalLinearVesting.allocation(signers.user2.address)).to.be.eq(user2Allocate);
                    expect(await MinimalLinearVesting.allocation(signers.deployer.address)).to.be.eq(deployerAllocate);
                    expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
                    expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.eq(0);
                    expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.eq(0);
                    expect(await token.balanceOf(MinimalLinearVesting.target)).to.be.eq(0);
                    expect(await token.balanceOf(signers.user1.address)).to.be.eq(user1Allocate);
                    expect(await token.balanceOf(signers.user2.address)).to.be.eq(user2Allocate);
                    expect(await token.balanceOf(signers.deployer.address)).to.be.eq(deployerAllocate);
                  });
                });
              });
            });
          });
        });
      });
    });
    describe('#calculateUnlockAmount', async () => {
      it('should return full amount, if unlcok time passed', async () => {
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 100, 100)).to.be.eq(ONE_ETHER);
      });
      it('should return 0, if passed vesting time is zero', async () => {
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 0, 100)).to.be.eq(0);
      });
      it('should return correct amount', async () => {
        expect(await MinimalLinearVesting.calculateUnlockAmount(0, 0, 0, 0)).to.be.eq(0);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 0, 0)).to.be.eq(ONE_ETHER);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 1, 0, 0)).to.be.eq(0);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 1, 0)).to.be.eq(ONE_ETHER);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 0, 1)).to.be.eq(0);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 1, 1)).to.be.eq(ONE_ETHER);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 1, 1, 1)).to.be.eq(0);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 1, 2, 1)).to.be.eq(ONE_ETHER);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 1, 10)).to.be.eq(ONE_ETHER / BigInt(10));
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 10, 10)).to.be.eq(ONE_ETHER);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 100000, 200000, 100000)).to.be.eq(ONE_ETHER);
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 100000, 150000, 100000)).to.be.eq(ONE_ETHER / BigInt(2));
        expect(await MinimalLinearVesting.calculateUnlockAmount(ONE_ETHER, 0, 99, 100)).to.be.eq(ethers.parseEther('0.99'));
      });
    });
  });
  describe('#getAvailableForClaim', async () => {
    describe('should return zero if', async () => {
      it('startTimestamp is zero', async () => {
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
      });
      it('user allocate is zero and claim phase started', async () => {
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
      });
      it('allocate is zero', async () => {
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
      });
    });

    describe('correct return', async () => {
      const user1Allocate = ethers.parseEther('1');
      const user2Allocate = ethers.parseEther('10');
      const deployerAllocate = ethers.parseEther('100');

      beforeEach(async () => {
        await token.mint(MinimalLinearVesting.target, deployerAllocate + user1Allocate + user2Allocate);
        await MinimalLinearVesting.setWalletsAllocation(
          [signers.user1.address, signers.user2.address, signers.deployer.address],
          [user1Allocate, user2Allocate, deployerAllocate],
        );
      });

      it('retun zero before vesting start', async () => {
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.eq(0);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.eq(0);
      });

      it('retun full amount after vesting passed', async () => {
        await time.increaseTo(startTimestamp + duration + duration);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(user1Allocate);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.eq(user2Allocate);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.eq(deployerAllocate);
      });

      it('retun part after 50% vesting passed', async () => {
        await time.increaseTo(startTimestamp + duration / 2);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(user1Allocate / BigInt(2));
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user2.address)).to.be.eq(user2Allocate / BigInt(2));
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.deployer.address)).to.be.eq(deployerAllocate / BigInt(2));
      });

      it('return correct amount during all vesting for user1', async () => {
        await time.increaseTo(startTimestamp + duration / 10);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(user1Allocate / BigInt(10));

        await MinimalLinearVesting.connect(signers.user1).claim();

        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);

        await time.increaseTo(startTimestamp + duration / 5);

        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
          user1Allocate / BigInt(10),
          ethers.parseEther('0.000001'),
        );

        await MinimalLinearVesting.connect(signers.user1).claim();

        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);

        await time.increaseTo(startTimestamp + duration / 2);

        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
          ethers.parseEther('0.3'),
          ethers.parseEther('0.000001'),
        );

        await time.increase(duration / 10);

        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
          ethers.parseEther('0.4'),
          ethers.parseEther('0.000001'),
        );

        await time.increase(duration);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
          ethers.parseEther('0.8'),
          ethers.parseEther('0.000001'),
        );
        await time.increase(duration);
        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.closeTo(
          ethers.parseEther('0.8'),
          ethers.parseEther('0.000001'),
        );

        await MinimalLinearVesting.connect(signers.user1).claim();

        expect(await MinimalLinearVesting.getAvailableForClaim(signers.user1.address)).to.be.eq(0);
      });
    });
  });
});

import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

import {
  BlastPointsMock,
  BribeFactoryUpgradeable,
  BribeUpgradeable,
  ERC20Mock,
  FeesVaultFactoryUpgradeable,
  FeesVaultUpgradeable,
  GaugeFactoryUpgradeable,
  GaugeRewarder,
  GaugeRewarder__factory,
  GaugeUpgradeable,
  ManagedNFTManagerUpgradeable,
  MerklGaugeMiddleman,
  MerklGaugeMiddleman__factory,
  MerkleDistributionCreatorMock,
  Pair,
  PairFactoryUpgradeable,
  PoolMock,
  PoolMock__factory,
  VeArtProxyUpgradeable,
  VeBoostUpgradeable,
  VeFnxDistributorUpgradeable,
  VoterUpgradeableV2,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import { ERRORS, getAccessControlError, ONE_ETHER, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';
import { ContractTransactionResponse } from 'ethers';

describe('GaugeRewarder Contract', function () {
  let signers: SignersList;
  let fenix: ERC20Mock;
  let factory: GaugeRewarder__factory;
  let implementation: GaugeRewarder;
  let GAUGE_ADDRESS_1 = '0x0000000000000000000000000000000000000001';
  let GAUGE_ADDRESS_2 = '0x0000000000000000000000000000000000000002';
  let currentMinterPeriod = 0n;

  let deployed: CoreFixtureDeployed;
  let instance: GaugeRewarder;

  async function newInstance() {
    let proxy = await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x']);
    return await ethers.getContractAt('GaugeRewarder', proxy.target);
  }

  async function createSignature(signer: HardhatEthersSigner, user: string, totalAmount: bigint, deadline: number) {
    const domain = {
      name: 'GaugeRewarder',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await instance.getAddress(),
    };
    const types = {
      Claim: [
        { name: 'user', type: 'address' },
        { name: 'totalAmount', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };
    const value = {
      user: user,
      totalAmount: totalAmount,
      deadline: deadline,
    };

    return await signer.signTypedData(domain, types, value);
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    fenix = deployed.fenix;

    factory = await ethers.getContractFactory('GaugeRewarder');

    implementation = await factory.deploy(signers.blastGovernor.address);

    instance = await newInstance();

    await instance.initialize(signers.blastGovernor.address, fenix.target, deployed.voter.target, deployed.minter.target);

    currentMinterPeriod = await deployed.minter.active_period();
  });

  describe('Deployments', async () => {
    it('should correct set token', async () => {
      expect(await instance.token()).to.be.eq(fenix.target);
    });

    it('should correct set deployer as DEFAULT_ADMIN_ROLE in contract', async () => {
      expect(await instance.hasRole(await instance.DEFAULT_ADMIN_ROLE(), signers.deployer.address)).to.be.true;
    });

    it('should correct set minter', async () => {
      expect(await instance.minter()).to.be.eq(deployed.minter.target);
    });

    it('signer is zero address', async () => {
      expect(await instance.signer()).to.be.eq(ethers.ZeroAddress);
    });

    it('variables is zero', async () => {
      expect(await instance.totalRewardDistributed()).to.be.eq(ethers.ZeroAddress);
      expect(await instance.totalRewardClaimed()).to.be.eq(ethers.ZeroAddress);
      expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
    });

    describe('should fail if', async () => {
      it('try initialize on implementations', async () => {
        await expect(
          implementation.initialize(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress),
        ).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });

      it('try initialize second time on proxy', async () => {
        await expect(
          instance.initialize(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress),
        ).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });

      it('provide zero blastGovernor address ', async () => {
        let newInst = await newInstance();
        await expect(
          newInst.initialize(ethers.ZeroAddress, fenix.target, deployed.voter.target, deployed.minter.target),
        ).to.be.revertedWithCustomError(newInst, 'AddressZero');
      });

      it('provide zero token address ', async () => {
        let newInst = await newInstance();
        await expect(
          newInst.initialize(signers.blastGovernor.address, ethers.ZeroAddress, deployed.voter.target, deployed.minter.target),
        ).to.be.revertedWithCustomError(newInst, 'AddressZero');
      });
      it('provide zero voter address ', async () => {
        let newInst = await newInstance();
        await expect(
          newInst.initialize(signers.blastGovernor.address, fenix.target, ethers.ZeroAddress, deployed.minter.target),
        ).to.be.revertedWithCustomError(newInst, 'AddressZero');
      });
      it('provide zero minter address ', async () => {
        let newInst = await newInstance();
        await expect(
          newInst.initialize(signers.blastGovernor.address, fenix.target, deployed.voter.target, ethers.ZeroAddress),
        ).to.be.revertedWithCustomError(newInst, 'AddressZero');
      });
    });
  });

  describe('#setSigner', async () => {
    it('should fail if try set signer from caller without DEFAULT_ADMIN_ROLE', async () => {
      await expect(instance.connect(signers.otherUser1).setSigner(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await instance.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
      );
    });

    it('success set signer and emit events', async () => {
      expect(await instance.signer()).to.be.eq(ethers.ZeroAddress);
      await expect(instance.setSigner(signers.otherUser1.address)).to.be.emit(instance, 'SetSigner').withArgs(signers.otherUser1.address);
      expect(await instance.signer()).to.be.eq(signers.otherUser1.address);
      await expect(instance.setSigner(signers.otherUser2.address)).to.be.emit(instance, 'SetSigner').withArgs(signers.otherUser2.address);
      expect(await instance.signer()).to.be.eq(signers.otherUser2.address);
    });
  });

  describe('notifyReward', async () => {
    describe('should fail if', async () => {
      it('try call from not gauge or without rewarder role', async () => {
        await expect(instance.notifyReward(ethers.ZeroAddress, 0)).to.be.revertedWithCustomError(instance, 'AccessDenied');
      });
      it('fail if available balance is zero', async () => {
        await instance.grantRole(ethers.id('REWARDER_ROLE'), signers.deployer.address);
        await expect(instance.notifyReward(ethers.ZeroAddress, 0)).to.be.revertedWithCustomError(instance, 'ZeroRewardAmount');
      });
    });

    describe('success notifyReward from wallet with REWARDER role', async () => {
      let tx: ContractTransactionResponse;

      beforeEach(async () => {
        await fenix.transfer(instance.target, ONE_ETHER);
        await instance.grantRole(ethers.id('REWARDER_ROLE'), signers.otherUser1.address);

        tx = await instance.connect(signers.otherUser1).notifyReward(GAUGE_ADDRESS_1, ONE_ETHER);
      });

      it('token balance', async () => {
        expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('1'));
      });

      it('emit event', async () => {
        await expect(tx)
          .to.be.emit(instance, 'NotifyReward')
          .withArgs(signers.otherUser1.address, GAUGE_ADDRESS_1, currentMinterPeriod, ONE_ETHER);
      });

      it('update counters variables', async () => {
        expect(await instance.totalRewardDistributed()).to.be.eq(ONE_ETHER);
        expect(await instance.totalRewardClaimed()).to.be.eq(ethers.ZeroAddress);
        expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ONE_ETHER);
        expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
        expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
      });

      describe('second notifyReward', async () => {
        it('should fail if try notify without available balance', async () => {
          await expect(instance.connect(signers.otherUser1).notifyReward(GAUGE_ADDRESS_1, ONE_ETHER)).to.be.revertedWithCustomError(
            instance,
            'InsufficientAvailableBalance',
          );
        });
        describe('success notifyReward from wallet with REWARDER role', async () => {
          let tx: ContractTransactionResponse;

          beforeEach(async () => {
            await fenix.transfer(instance.target, ONE_ETHER);
            tx = await instance.connect(signers.otherUser1).notifyReward(GAUGE_ADDRESS_2, ethers.parseEther('0.5'));
          });

          it('token balance', async () => {
            expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('2'));
          });

          it('emit event', async () => {
            await expect(tx)
              .to.be.emit(instance, 'NotifyReward')
              .withArgs(signers.otherUser1.address, GAUGE_ADDRESS_2, currentMinterPeriod, ethers.parseEther('0.5'));
          });

          it('update counters variables', async () => {
            expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('1.5'));
            expect(await instance.totalRewardClaimed()).to.be.eq(ethers.ZeroAddress);
            expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('1.5'));
            expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
            expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('0.5'));
          });

          describe('second notifyReward', async () => {
            it('should fail if try notify with more then available balance', async () => {
              await expect(
                instance.connect(signers.otherUser1).notifyReward(GAUGE_ADDRESS_1, ethers.parseEther('0.5') + 1n),
              ).to.be.revertedWithCustomError(instance, 'InsufficientAvailableBalance');
            });
            describe('success notifyReward from wallet with REWARDER role', async () => {
              let tx: ContractTransactionResponse;
              let newEpoch: bigint;
              beforeEach(async () => {
                await time.increase(86400 * 7);

                await deployed.minter.update_period();
                newEpoch = await deployed.minter.active_period();
                expect(newEpoch).to.be.eq(currentMinterPeriod + 86400n * 7n);
                tx = await instance.connect(signers.otherUser1).notifyReward(GAUGE_ADDRESS_1, ethers.parseEther('0.5'));
              });

              it('token balance', async () => {
                expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('2'));
              });

              it('emit event', async () => {
                await expect(tx)
                  .to.be.emit(instance, 'NotifyReward')
                  .withArgs(signers.otherUser1.address, GAUGE_ADDRESS_1, newEpoch, ethers.parseEther('0.5'));
              });

              it('update counters variables', async () => {
                expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('2'));
                expect(await instance.totalRewardClaimed()).to.be.eq(ethers.ZeroAddress);
                expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('1.5'));
                expect(await instance.rewardPerEpoch(newEpoch)).to.be.eq(ethers.parseEther('0.5'));

                expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
                expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('0.5'));
                expect(await instance.rewardPerGaugePerEpoch(newEpoch, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('0.5'));
              });
            });
          });
        });
      });
    });
  });

  describe('notifyRewardWithTransfer', async () => {
    describe('should fail if', async () => {
      it('try call from not gauge or without rewarder role', async () => {
        await expect(instance.notifyRewardWithTransfer(ethers.ZeroAddress, 0)).to.be.revertedWithCustomError(instance, 'AccessDenied');
      });
      it('fail if user not approve balance to distribute', async () => {
        await instance.grantRole(ethers.id('REWARDER_ROLE'), signers.deployer.address);
        await expect(instance.notifyRewardWithTransfer(ethers.ZeroAddress, 1)).to.be.revertedWith(ERRORS.ERC20.InsufficientAllowance);
      });
      it('fail if user havent enought balance to distribute', async () => {
        await instance.grantRole(ethers.id('REWARDER_ROLE'), signers.deployer.address);
        await fenix.approve(instance.target, ethers.parseEther('10000000000'));
        await expect(instance.notifyRewardWithTransfer(ethers.ZeroAddress, ethers.parseEther('10000000000'))).to.be.revertedWith(
          ERRORS.ERC20.InsufficientBalance,
        );
      });
    });

    describe('success notifyReward from wallet with REWARDER role', async () => {
      let tx: ContractTransactionResponse;

      beforeEach(async () => {
        await fenix.transfer(signers.otherUser1.address, ONE_ETHER);
        await fenix.connect(signers.otherUser1).approve(instance.target, ONE_ETHER);
        await instance.grantRole(ethers.id('REWARDER_ROLE'), signers.otherUser1.address);

        tx = await instance.connect(signers.otherUser1).notifyRewardWithTransfer(GAUGE_ADDRESS_1, ONE_ETHER);
      });

      it('token balance', async () => {
        expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('1'));
      });

      it('emit event', async () => {
        await expect(tx)
          .to.be.emit(instance, 'NotifyReward')
          .withArgs(signers.otherUser1.address, GAUGE_ADDRESS_1, currentMinterPeriod, ONE_ETHER);

        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(signers.otherUser1.address, instance.target, ONE_ETHER);
      });

      it('update counters variables', async () => {
        expect(await instance.totalRewardDistributed()).to.be.eq(ONE_ETHER);
        expect(await instance.totalRewardClaimed()).to.be.eq(ethers.ZeroAddress);
        expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ONE_ETHER);
        expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
        expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
      });

      describe('second notifyRewardWithTransfer', async () => {
        it('should fail if try notify without available balance', async () => {
          await expect(instance.connect(signers.otherUser1).notifyReward(GAUGE_ADDRESS_1, ONE_ETHER)).to.be.revertedWithCustomError(
            instance,
            'InsufficientAvailableBalance',
          );
        });
        describe('success notifyRewardWithTransfer from wallet with REWARDER role', async () => {
          let tx: ContractTransactionResponse;

          beforeEach(async () => {
            await fenix.transfer(signers.otherUser1.address, ONE_ETHER);
            await fenix.connect(signers.otherUser1).approve(instance.target, ONE_ETHER);
            tx = await instance.connect(signers.otherUser1).notifyRewardWithTransfer(GAUGE_ADDRESS_2, ethers.parseEther('0.5'));
          });

          it('change token balance', async () => {
            expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('1.5'));
          });

          it('emit event', async () => {
            await expect(tx)
              .to.be.emit(instance, 'NotifyReward')
              .withArgs(signers.otherUser1.address, GAUGE_ADDRESS_2, currentMinterPeriod, ethers.parseEther('0.5'));
          });

          it('update counters variables', async () => {
            expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('1.5'));
            expect(await instance.totalRewardClaimed()).to.be.eq(ethers.ZeroAddress);
            expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('1.5'));
            expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
            expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('0.5'));
          });

          describe('success notifyRewardWithTransfer from wallet with REWARDER role', async () => {
            let tx: ContractTransactionResponse;
            let newEpoch: bigint;
            beforeEach(async () => {
              await time.increase(86400 * 7);

              await deployed.minter.update_period();
              newEpoch = await deployed.minter.active_period();
              expect(newEpoch).to.be.eq(currentMinterPeriod + 86400n * 7n);
              tx = await instance.connect(signers.otherUser1).notifyRewardWithTransfer(GAUGE_ADDRESS_1, ethers.parseEther('0.5'));
            });

            it('token balance', async () => {
              expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('2'));
            });

            it('emit event', async () => {
              await expect(tx)
                .to.be.emit(instance, 'NotifyReward')
                .withArgs(signers.otherUser1.address, GAUGE_ADDRESS_1, newEpoch, ethers.parseEther('0.5'));
            });

            it('update counters variables', async () => {
              expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('2'));
              expect(await instance.totalRewardClaimed()).to.be.eq(ethers.ZeroAddress);
              expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('1.5'));
              expect(await instance.rewardPerEpoch(newEpoch)).to.be.eq(ethers.parseEther('0.5'));

              expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
              expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('0.5'));
              expect(await instance.rewardPerGaugePerEpoch(newEpoch, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('0.5'));
            });
          });
        });
      });
    });
  });

  describe('claimFor', async () => {
    describe('should fail if', async () => {
      it('try call from not _CLAMER_FOR_ROLE', async () => {
        await expect(instance.claimFor(signers.otherUser1.address, 1, 1, '0x')).to.be.revertedWith(
          getAccessControlError(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address),
        );
      });
      it('fail if signer not setup', async () => {
        await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);
        await expect(instance.claimFor(signers.otherUser1.address, 1, 1, '0x')).to.be.revertedWithCustomError(instance, 'ClaimDisabled');
      });

      it('fail if deadline expired', async () => {
        await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);
        await instance.setSigner(signers.deployer.address);
        await expect(instance.claimFor(signers.otherUser1.address, 1, 1, '0x')).to.be.revertedWithCustomError(instance, 'SignatureExpired');
      });

      it('fail if total amount eq or less then aldready claimed amount', async () => {
        await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);
        await instance.setSigner(signers.deployer.address);
        await expect(instance.claimFor(signers.otherUser1.address, 0, (await time.latest()) + 100, '0x')).to.be.revertedWithCustomError(
          instance,
          'AlreadyClaimed',
        );
      });

      it('fail if provide invalid signature', async () => {
        await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);
        await instance.setSigner(signers.deployer.address);

        let signature = await createSignature(signers.deployer, signers.otherUser1.address, 1n, 0);

        await expect(
          instance.claimFor(signers.otherUser1.address, 2n, (await time.latest()) + 100, signature),
        ).to.be.revertedWithCustomError(instance, 'InvalidSignature');
      });

      it('fail if provide signature but data not the same', async () => {
        await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);
        await instance.setSigner(signers.deployer.address);
        let deadline = (await time.latest()) + 100;
        let signature = await createSignature(signers.deployer, signers.otherUser1.address, 1n, deadline);
        await expect(instance.claimFor(signers.otherUser1.address, 2n, deadline, signature)).to.be.revertedWithCustomError(
          instance,
          'InvalidSignature',
        );
      });
    });

    describe('success claim', async () => {
      let tx: ContractTransactionResponse;
      let deadline: number;
      let signature: string;
      beforeEach(async () => {
        await fenix.transfer(signers.otherUser1.address, ONE_ETHER);
        await fenix.connect(signers.otherUser1).approve(instance.target, ONE_ETHER);
        await instance.grantRole(ethers.id('REWARDER_ROLE'), signers.otherUser1.address);

        await instance.connect(signers.otherUser1).notifyRewardWithTransfer(GAUGE_ADDRESS_1, ONE_ETHER);

        await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);
        await instance.setSigner(signers.deployer.address);
        deadline = (await time.latest()) + 100;
        signature = await createSignature(signers.deployer, signers.otherUser1.address, ethers.parseEther('0.1'), deadline);

        tx = await instance.claimFor(signers.otherUser1.address, ethers.parseEther('0.1'), deadline, signature);
      });

      it('should fail if use the same data and signature', async () => {
        await expect(
          instance.claimFor(signers.otherUser1.address, ethers.parseEther('0.1'), deadline, signature),
        ).to.be.revertedWithCustomError(instance, 'AlreadyClaimed');
      });

      it('change token balance', async () => {
        expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('0.9'));
        expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('0.1'));
      });
      it('emit event', async () => {
        await expect(tx)
          .to.be.emit(instance, 'Claim')
          .withArgs(signers.otherUser1.address, ethers.parseEther('0.1'), ethers.parseEther('0.1'));
        await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, signers.otherUser1.address, ethers.parseEther('0.1'));
      });

      it('update counters variables', async () => {
        expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('1'));
        expect(await instance.totalRewardClaimed()).to.be.eq(ethers.parseEther('0.1'));
        expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('1'));
        expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
        expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
        expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('0.1'));
      });

      describe('second claim from the same user', async () => {
        it('should fail if use the same claim amount with new signature', async () => {
          let deadline = (await time.latest()) + 100;
          let signature = await createSignature(signers.deployer, signers.otherUser1.address, ethers.parseEther('0.1'), deadline);
          await expect(
            instance.connect(signers.otherUser1).claim(ethers.parseEther('0.1'), deadline, signature),
          ).to.be.revertedWithCustomError(instance, 'AlreadyClaimed');
        });

        describe('success claim scond time', async () => {
          let tx: ContractTransactionResponse;

          beforeEach(async () => {
            await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);
            await instance.setSigner(signers.deployer.address);
            let deadline = (await time.latest()) + 100;
            let signature = await createSignature(signers.deployer, signers.otherUser1.address, ethers.parseEther('0.2'), deadline);

            tx = await instance.connect(signers.otherUser1).claim(ethers.parseEther('0.2'), deadline, signature);
          });

          it('change token balance', async () => {
            expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('0.8'));
            expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('0.2'));
          });

          it('emit event', async () => {
            await expect(tx)
              .to.be.emit(instance, 'Claim')
              .withArgs(signers.otherUser1.address, ethers.parseEther('0.1'), ethers.parseEther('0.2'));
            await expect(tx).to.be.emit(fenix, 'Transfer').withArgs(instance.target, signers.otherUser1.address, ethers.parseEther('0.1'));
          });

          it('update counters variables', async () => {
            expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('1'));
            expect(await instance.totalRewardClaimed()).to.be.eq(ethers.parseEther('0.2'));
            expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('1'));
            expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ONE_ETHER);
            expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
            expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('0.2'));
          });
        });
      });
    });
  });

  describe('general flow', async () => {
    let nextPeriod: bigint;

    beforeEach(async () => {
      nextPeriod = currentMinterPeriod + 86400n * 7n;
      expect(await instance.totalRewardDistributed()).to.be.eq(0);
      expect(await instance.totalRewardClaimed()).to.be.eq(0);
      expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
      expect(await instance.rewardPerEpoch(nextPeriod)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_1)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
      expect(await fenix.balanceOf(instance.target)).to.be.eq(0);
      expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(0);
      expect(await instance.claimed(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.claimed(signers.otherUser3.address)).to.be.eq(0);

      await fenix.approve(instance.target, ethers.parseEther('100'));
      await instance.grantRole(ethers.id('REWARDER_ROLE'), signers.deployer.address);
      await instance.grantRole(ethers.id('CLAMER_FOR_ROLE'), signers.deployer.address);

      await instance.setSigner(signers.deployer.address);
    });
    it('-', async () => {
      await instance.notifyRewardWithTransfer(GAUGE_ADDRESS_1, ethers.parseEther('100'));
      let deadline = (await time.latest()) + 100;
      let signature = await createSignature(signers.deployer, signers.otherUser1.address, ethers.parseEther('90'), deadline);
      await expect(instance.connect(signers.otherUser1).claim(ethers.parseEther('90'), deadline, signature))
        .to.be.emit(instance, 'Claim')
        .withArgs(signers.otherUser1.address, ethers.parseEther('90'), ethers.parseEther('90'));

      await fenix.transfer(instance.target, ethers.parseEther('100'));
      await expect(instance.notifyReward(GAUGE_ADDRESS_2, ethers.parseEther('50')))
        .to.be.emit(instance, 'NotifyReward')
        .withArgs(signers.deployer.address, GAUGE_ADDRESS_2, currentMinterPeriod, ethers.parseEther('50'));

      await expect(instance.notifyReward(GAUGE_ADDRESS_1, ethers.parseEther('60'))).to.be.revertedWithCustomError(
        instance,
        'InsufficientAvailableBalance',
      );
      await expect(instance.notifyReward(GAUGE_ADDRESS_2, ethers.parseEther('50')))
        .to.be.emit(instance, 'NotifyReward')
        .withArgs(signers.deployer.address, GAUGE_ADDRESS_2, currentMinterPeriod, ethers.parseEther('50'));

      expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('200'));
      expect(await instance.totalRewardClaimed()).to.be.eq(ethers.parseEther('90'));
      expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('200'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerEpoch(nextPeriod)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_1)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('90'));
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('110'));
      expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('90'));
      expect(await instance.claimed(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.claimed(signers.otherUser3.address)).to.be.eq(0);

      await time.increaseTo(nextPeriod);

      await deployed.minter.update_period();

      await fenix.transfer(instance.target, ethers.parseEther('20'));

      await expect(instance.notifyReward(GAUGE_ADDRESS_1, 0))
        .to.be.emit(instance, 'NotifyReward')
        .withArgs(signers.deployer.address, GAUGE_ADDRESS_1, nextPeriod, ethers.parseEther('20'));

      expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('220'));
      expect(await instance.totalRewardClaimed()).to.be.eq(ethers.parseEther('90'));
      expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('200'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerEpoch(nextPeriod)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('90'));
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(0);
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('130'));
      expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('90'));
      expect(await instance.claimed(signers.otherUser2.address)).to.be.eq(0);
      expect(await instance.claimed(signers.otherUser3.address)).to.be.eq(0);

      deadline = (await time.latest()) + 100;

      signature = await createSignature(signers.deployer, signers.otherUser1.address, ethers.parseEther('100'), deadline);
      await expect(instance.connect(signers.otherUser1).claim(ethers.parseEther('100'), deadline, signature))
        .to.be.emit(instance, 'Claim')
        .withArgs(signers.otherUser1.address, ethers.parseEther('10'), ethers.parseEther('100'));

      signature = await createSignature(signers.deployer, signers.otherUser2.address, ethers.parseEther('50'), deadline);

      await expect(instance.connect(signers.otherUser2).claim(ethers.parseEther('50'), deadline, signature))
        .to.be.emit(instance, 'Claim')
        .withArgs(signers.otherUser2.address, ethers.parseEther('50'), ethers.parseEther('50'));

      signature = await createSignature(signers.deployer, signers.otherUser2.address, ethers.parseEther('60'), deadline);

      await expect(instance.connect(signers.otherUser2).claim(ethers.parseEther('60'), deadline, signature))
        .to.be.emit(instance, 'Claim')
        .withArgs(signers.otherUser2.address, ethers.parseEther('10'), ethers.parseEther('60'));

      signature = await createSignature(signers.deployer, signers.otherUser3.address, ethers.parseEther('60'), deadline);

      await expect(instance.claimFor(signers.otherUser3.address, ethers.parseEther('60'), deadline, signature))
        .to.be.emit(instance, 'Claim')
        .withArgs(signers.otherUser3.address, ethers.parseEther('60'), ethers.parseEther('60'));

      expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('220'));
      expect(await instance.totalRewardClaimed()).to.be.eq(ethers.parseEther('220'));
      expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('200'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerEpoch(nextPeriod)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);
      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('60'));
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('0'));
      expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.claimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
      expect(await instance.claimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('60'));

      await time.increase(86400 * 7);
      await deployed.minter.update_period();

      await fenix.transfer(instance.target, ethers.parseEther('10'));
      await instance.notifyReward(GAUGE_ADDRESS_2, ethers.parseEther('10'));

      expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('230'));
      expect(await instance.totalRewardClaimed()).to.be.eq(ethers.parseEther('220'));

      expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('200'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('100'));

      expect(await instance.rewardPerEpoch(nextPeriod)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('60'));
      expect(await fenix.balanceOf(instance.target)).to.be.eq(ethers.parseEther('10'));
      expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.claimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('60'));
      expect(await instance.claimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('60'));

      expect(await instance.rewardPerEpoch(nextPeriod + 86400n * 7n)).to.be.eq(ethers.parseEther('10'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod + 86400n * 7n, GAUGE_ADDRESS_1)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod + 86400n * 7n, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('10'));

      deadline = (await time.latest()) + 100;
      signature = await createSignature(signers.deployer, signers.otherUser2.address, ethers.parseEther('70'), deadline);

      await expect(instance.connect(signers.otherUser2).claim(ethers.parseEther('70'), deadline, signature))
        .to.be.emit(instance, 'Claim')
        .withArgs(signers.otherUser2.address, ethers.parseEther('10'), ethers.parseEther('70'));

      expect(await instance.totalRewardDistributed()).to.be.eq(ethers.parseEther('230'));
      expect(await instance.totalRewardClaimed()).to.be.eq(ethers.parseEther('230'));

      expect(await instance.rewardPerEpoch(currentMinterPeriod)).to.be.eq(ethers.parseEther('200'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.rewardPerGaugePerEpoch(currentMinterPeriod, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('100'));

      expect(await instance.rewardPerEpoch(nextPeriod)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_1)).to.be.eq(ethers.parseEther('20'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod, GAUGE_ADDRESS_2)).to.be.eq(0);

      expect(await instance.rewardPerEpoch(nextPeriod + 86400n * 7n)).to.be.eq(ethers.parseEther('10'));
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod + 86400n * 7n, GAUGE_ADDRESS_1)).to.be.eq(0);
      expect(await instance.rewardPerGaugePerEpoch(nextPeriod + 86400n * 7n, GAUGE_ADDRESS_2)).to.be.eq(ethers.parseEther('10'));

      expect(await fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
      expect(await fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('70'));
      expect(await fenix.balanceOf(signers.otherUser3.address)).to.be.eq(ethers.parseEther('60'));
      expect(await fenix.balanceOf(instance.target)).to.be.eq(0);
      expect(await instance.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
      expect(await instance.claimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('70'));
      expect(await instance.claimed(signers.otherUser3.address)).to.be.eq(ethers.parseEther('60'));
    });
  });
});

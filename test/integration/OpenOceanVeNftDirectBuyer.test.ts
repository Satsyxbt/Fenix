import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ZERO } from '../utils/constants';

import { loadFixture, setBalance } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import {
  ERC20Mock,
  Fenix,
  OpenOceanCallerMock,
  OpenOceanExchangeMock,
  OpenOceanVeNftDirectBuyer,
  OpenOceanVeNftDirectBuyer__factory,
  VotingEscrowUpgradeableV2,
} from '../../typechain-types';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken, getSigners } from '../utils/coreFixture';
import { deployERC20Mock } from '../../scripts/utils';
import { ContractTransactionResponse } from 'ethers';

describe('OpenOceanVeNftDirectBuyer', function () {
  let signers: SignersList;
  let coreDeployed: CoreFixtureDeployed;

  let factory: OpenOceanVeNftDirectBuyer__factory;
  let OpenOceanVeNftDirectBuyer: OpenOceanVeNftDirectBuyer;
  let VotingEscrow: VotingEscrowUpgradeableV2;
  let Fenix: Fenix;
  let OpenOceanExchange: OpenOceanExchangeMock;
  let OpenOceanCaller: OpenOceanCallerMock;
  let TOK18: ERC20Mock;
  let TOK9: ERC20Mock;

  function getDefaultParams() {
    return {
      caller: OpenOceanCaller.target,
      desc: {
        srcToken: TOK18.target,
        dstToken: Fenix.target,
        srcReceiver: OpenOceanCaller.target,
        dstReceiver: OpenOceanVeNftDirectBuyer.target,
        amount: ethers.parseEther('1'),
        minReturnAmount: 1,
        guaranteedAmount: 1,
        flags: 2,
        referrer: ethers.ZeroAddress,
        permit: '0x',
      },
      calls: [{ target: ethers.ZeroAddress, gasLimit: 1e6, value: 0, data: '0x' }],
      ve: {
        lockDuration: 182 * 86400,
        to: signers.otherUser1.address,
        shouldBoosted: false,
        withPermanentLock: false,
        managedTokenIdForAttach: 0,
      },
    };
  }

  beforeEach(async function () {
    signers = await getSigners();
    coreDeployed = await loadFixture(completeFixture);

    VotingEscrow = coreDeployed.votingEscrow;
    Fenix = coreDeployed.fenix;

    factory = await ethers.getContractFactory('OpenOceanVeNftDirectBuyer');
    TOK18 = await deployERC20MockToken(signers.deployer, 'T', 'T', 18);
    TOK9 = await deployERC20MockToken(signers.deployer, 'T', 'T', 9);

    OpenOceanExchange = await ethers.deployContract('OpenOceanExchangeMock');
    await OpenOceanExchange.initialize();

    OpenOceanCaller = await ethers.deployContract('OpenOceanCallerMock');

    OpenOceanVeNftDirectBuyer = await factory.deploy(
      signers.blastGovernor.address,
      VotingEscrow.target,
      Fenix.target,
      OpenOceanExchange.target,
    );
    await TOK18.mint(signers.otherUser1.address, ethers.parseEther('100'));
    await TOK9.mint(signers.otherUser1.address, 1e9);
    await TOK18.connect(signers.otherUser1).approve(OpenOceanVeNftDirectBuyer.target, ethers.parseEther('100'));
    await TOK9.connect(signers.otherUser1).approve(OpenOceanVeNftDirectBuyer.target, ethers.parseEther('100'));
    await Fenix.transfer(OpenOceanCaller.target, ethers.parseEther('100'));
  });

  describe('Deployment', async () => {
    describe('should fail if try', async () => {
      it('deploy with zero blastGovernor address', async () => {
        await expect(
          factory.deploy(ethers.ZeroAddress, VotingEscrow.target, Fenix.target, OpenOceanExchange.target),
        ).to.be.revertedWithCustomError(factory, 'AddressZero');
      });
      it('deploy with zero votingEscrow address', async () => {
        await expect(
          factory.deploy(signers.blastGovernor.address, ethers.ZeroAddress, Fenix.target, OpenOceanExchange.target),
        ).to.be.revertedWithCustomError(factory, 'AddressZero');
      });
      it('deploy with zero token address', async () => {
        await expect(
          factory.deploy(signers.blastGovernor.address, VotingEscrow.target, ethers.ZeroAddress, OpenOceanExchange.target),
        ).to.be.revertedWithCustomError(factory, 'AddressZero');
      });
      it('deploy with zero open ocean address', async () => {
        await expect(
          factory.deploy(signers.blastGovernor.address, VotingEscrow.target, Fenix.target, ethers.ZeroAddress),
        ).to.be.revertedWithCustomError(factory, 'AddressZero');
      });
    });

    describe('success deployed, init params and setup owner', async () => {
      it('owner', async () => {
        expect(await OpenOceanVeNftDirectBuyer.owner()).to.be.eq(signers.deployer.address);
      });
      it('token', async () => {
        expect(await OpenOceanVeNftDirectBuyer.token()).to.be.eq(Fenix.target);
      });
      it('votingEscrow', async () => {
        expect(await OpenOceanVeNftDirectBuyer.votingEscrow()).to.be.eq(VotingEscrow.target);
      });
      it('OpenOceanExchange', async () => {
        expect(await OpenOceanVeNftDirectBuyer.openOceanExchange()).to.be.eq(OpenOceanExchange.target);
      });
    });
  });

  describe('#rescueFunds', async () => {
    describe('should fail if', async () => {
      it('call from not owner', async () => {
        await expect(OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).rescueFunds(Fenix.target)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('invalid token address', async () => {
        await expect(OpenOceanVeNftDirectBuyer.rescueFunds('0x0000000000000000000000000000000000000001')).to.be.reverted;
      });
    });
    describe('success rescue funds', async () => {
      it('ETH', async () => {
        let amount = ethers.parseEther('0.1');
        await setBalance(OpenOceanVeNftDirectBuyer.target.toString(), amount);
        expect(await ethers.provider.getBalance(OpenOceanVeNftDirectBuyer.target)).to.be.eq(amount);

        await expect(OpenOceanVeNftDirectBuyer.rescueFunds(ethers.ZeroAddress)).to.changeEtherBalances(
          [signers.deployer.address, OpenOceanVeNftDirectBuyer.target],
          [`${amount}`, `-${amount}`],
        );
        expect(await ethers.provider.getBalance(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
      });
      it('erc20 token', async () => {
        let amount = ethers.parseEther('1');
        await Fenix.transfer(OpenOceanVeNftDirectBuyer.target, amount);
        let ownerBalanceBefore = await Fenix.balanceOf(signers.deployer.address);
        expect(await Fenix.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(amount);
        await expect(OpenOceanVeNftDirectBuyer.rescueFunds(Fenix.target))
          .to.be.emit(Fenix, 'Transfer')
          .withArgs(OpenOceanVeNftDirectBuyer.target, signers.deployer.address, amount);
        expect(await Fenix.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
        expect(await Fenix.balanceOf(signers.deployer.address)).to.be.eq(ownerBalanceBefore + amount);
      });
    });
  });

  describe('#directVeNftPurchase', async () => {
    beforeEach(async () => {
      expect(await Fenix.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
      expect(await TOK18.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
      expect(await TOK9.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);

      expect(await Fenix.balanceOf(OpenOceanCaller.target)).to.be.eq(ethers.parseEther('100'));
      expect(await TOK18.balanceOf(OpenOceanCaller.target)).to.be.eq(ZERO);
      expect(await TOK9.balanceOf(OpenOceanCaller.target)).to.be.eq(ZERO);

      expect(await Fenix.balanceOf(VotingEscrow.target)).to.be.eq(ZERO);

      expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
      expect(await TOK18.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
      expect(await TOK9.balanceOf(signers.otherUser1.address)).to.be.eq(1e9);
      expect(await VotingEscrow.lastMintedTokenId()).to.be.eq(ZERO);
      expect(await VotingEscrow.supply()).to.be.eq(0);

      expect(await ethers.provider.getBalance(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
      expect(await ethers.provider.getBalance(OpenOceanCaller.target)).to.be.eq(ZERO);
    });

    describe('shoulf fail if', async () => {
      it('dst token in OO params not eq token from contract', async () => {
        let params = getDefaultParams();
        params.desc.dstToken = TOK9.target;
        await expect(
          OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase(params.caller, params.desc, params.calls, params.ve),
        ).to.be.revertedWithCustomError(OpenOceanVeNftDirectBuyer, 'InvalidDstToken');
      });
      it('dst receiver invalid', async () => {
        let params = getDefaultParams();
        params.desc.dstReceiver = signers.otherUser1.address;
        await expect(
          OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase(params.caller, params.desc, params.calls, params.ve),
        ).to.be.revertedWithCustomError(OpenOceanVeNftDirectBuyer, 'InvalidDstReceiver');
      });
      it('if try to use permit, not supported', async () => {
        let params = getDefaultParams();
        params.desc.permit = '0x11';
        await expect(
          OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase(params.caller, params.desc, params.calls, params.ve),
        ).to.be.revertedWithCustomError(OpenOceanVeNftDirectBuyer, 'PermitNotSupported');
      });

      it('when send eth for not erc20 tokens swap', async () => {
        let params = getDefaultParams();
        await expect(
          OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase(params.caller, params.desc, params.calls, params.ve, {
            value: ethers.parseEther('0.1'),
          }),
        ).to.be.revertedWith('Invalid msg.value');
      });

      it('setup claim flag, but is eth', async () => {
        let params = getDefaultParams();
        params.desc.srcToken = ethers.ZeroAddress;
        await expect(
          OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase(params.caller, params.desc, params.calls, params.ve, {
            value: params.desc.amount,
          }),
        ).to.be.revertedWith('Claim token is ETH');
      });
    });
    describe('success direct buy veNft', async () => {
      describe('1:2 rate, default lock, TOK18', async () => {
        let outputAmount = ethers.parseEther('1');
        let inputAmount = ethers.parseEther('2');
        let tx: ContractTransactionResponse;
        let returnRes: [bigint, bigint] & { tokenAmount: bigint; tokenId: bigint };
        let mintedId: bigint;

        beforeEach(async () => {
          await OpenOceanCaller.__mock_setOutputResult(Fenix.target, OpenOceanVeNftDirectBuyer.target, outputAmount);
          let params = getDefaultParams();
          params.desc.amount = inputAmount;
          params.desc.srcToken = TOK18.target;
          params.desc.flags = 2;
          params.desc.dstReceiver = OpenOceanVeNftDirectBuyer.target;
          returnRes = await OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase.staticCall(
            params.caller,
            params.desc,
            params.calls,
            params.ve,
          );
          tx = await OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase(
            params.caller,
            params.desc,
            params.calls,
            params.ve,
          );
          mintedId = await VotingEscrow.lastMintedTokenId();
        });

        it('emit events', async () => {
          await expect(tx)
            .to.be.emit(OpenOceanVeNftDirectBuyer, 'DirectVeNftPurchase')
            .withArgs(
              signers.otherUser1.address,
              signers.otherUser1.address,
              TOK18.target,
              ethers.parseEther('2'),
              ethers.parseEther('1'),
              mintedId,
            );
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(OpenOceanCaller.target, OpenOceanVeNftDirectBuyer.target, outputAmount);
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(OpenOceanVeNftDirectBuyer.target, VotingEscrow.target, outputAmount);
          await expect(tx)
            .to.be.emit(TOK18, 'Transfer')
            .withArgs(signers.otherUser1.address, OpenOceanVeNftDirectBuyer.target, inputAmount);
          await expect(tx).to.be.emit(TOK18, 'Transfer').withArgs(OpenOceanVeNftDirectBuyer.target, OpenOceanCaller.target, inputAmount);
        });

        it('correct return value', async () => {
          expect(returnRes.tokenAmount).to.be.eq(outputAmount);
          expect(returnRes.tokenId).to.be.eq(mintedId);
        });

        it('change balances', async () => {
          expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await TOK18.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100') - inputAmount);
          expect(await TOK9.balanceOf(signers.otherUser1.address)).to.be.eq(1e9);

          expect(await Fenix.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
          expect(await TOK18.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
          expect(await TOK9.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);

          expect(await Fenix.balanceOf(OpenOceanCaller.target)).to.be.eq(ethers.parseEther('99'));
          expect(await TOK18.balanceOf(OpenOceanCaller.target)).to.be.eq(ethers.parseEther('2'));
          expect(await TOK9.balanceOf(OpenOceanCaller.target)).to.be.eq(ZERO);
          expect(await Fenix.balanceOf(VotingEscrow.target)).to.be.eq(ethers.parseEther('1'));
        });

        it('success mint VotingEscrow lock', async () => {
          expect(await VotingEscrow.supply()).to.be.eq(ethers.parseEther('1'));
          expect(await VotingEscrow.balanceOf(signers.otherUser1.address)).to.be.eq(1);
          expect(await VotingEscrow.ownerOf(mintedId)).to.be.eq(signers.otherUser1.address);
          let state = await VotingEscrow.getNftState(mintedId);
          expect(state.locked.isPermanentLocked).to.be.false;
          expect(state.locked.amount).to.be.eq(outputAmount);
        });
      });
      describe('1:10 rate, permanent lock, ETH, to other recipient', async () => {
        let outputAmount = ethers.parseEther('10');
        let inputAmount = ethers.parseEther('1');
        let tx: ContractTransactionResponse;
        let returnRes: [bigint, bigint] & { tokenAmount: bigint; tokenId: bigint };
        let mintedId: bigint;

        beforeEach(async () => {
          await OpenOceanCaller.__mock_setOutputResult(Fenix.target, OpenOceanVeNftDirectBuyer.target, outputAmount);
          let params = getDefaultParams();
          params.desc.amount = inputAmount;
          params.desc.srcToken = ethers.ZeroAddress;
          params.desc.flags = 1;
          params.desc.dstReceiver = OpenOceanVeNftDirectBuyer.target;
          params.ve.to = signers.otherUser2.address;
          params.ve.withPermanentLock = true;

          returnRes = await OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase.staticCall(
            params.caller,
            params.desc,
            params.calls,
            params.ve,
            { value: inputAmount },
          );
          tx = await OpenOceanVeNftDirectBuyer.connect(signers.otherUser1).directVeNftPurchase(
            params.caller,
            params.desc,
            params.calls,
            params.ve,
            { value: inputAmount },
          );
          mintedId = await VotingEscrow.lastMintedTokenId();
        });

        it('emit events', async () => {
          await expect(tx)
            .to.be.emit(OpenOceanVeNftDirectBuyer, 'DirectVeNftPurchase')
            .withArgs(
              signers.otherUser1.address,
              signers.otherUser2.address,
              ethers.ZeroAddress,
              ethers.parseEther('1'),
              ethers.parseEther('10'),
              mintedId,
            );
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(OpenOceanCaller.target, OpenOceanVeNftDirectBuyer.target, outputAmount);
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(OpenOceanVeNftDirectBuyer.target, VotingEscrow.target, outputAmount);
        });

        it('correct return value', async () => {
          expect(returnRes.tokenAmount).to.be.eq(outputAmount);
          expect(returnRes.tokenId).to.be.eq(mintedId);
        });

        it('change balances', async () => {
          expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ZERO);
          expect(await TOK18.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('100'));
          expect(await TOK9.balanceOf(signers.otherUser1.address)).to.be.eq(1e9);

          expect(await Fenix.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
          expect(await TOK18.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
          expect(await TOK9.balanceOf(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);

          expect(await Fenix.balanceOf(OpenOceanCaller.target)).to.be.eq(ethers.parseEther('90'));
          expect(await TOK18.balanceOf(OpenOceanCaller.target)).to.be.eq(ZERO);
          expect(await TOK9.balanceOf(OpenOceanCaller.target)).to.be.eq(ZERO);
          expect(await Fenix.balanceOf(VotingEscrow.target)).to.be.eq(ethers.parseEther('10'));

          expect(await ethers.provider.getBalance(OpenOceanVeNftDirectBuyer.target)).to.be.eq(ZERO);
          expect(await ethers.provider.getBalance(OpenOceanCaller.target)).to.be.eq(ethers.parseEther('1'));
        });

        it('success mint VotingEscrow lock', async () => {
          expect(await VotingEscrow.supply()).to.be.eq(outputAmount);
          expect(await VotingEscrow.balanceOf(signers.otherUser2.address)).to.be.eq(1);
          expect(await VotingEscrow.ownerOf(mintedId)).to.be.eq(signers.otherUser2.address);

          let state = await VotingEscrow.getNftState(mintedId);
          expect(state.locked.isPermanentLocked).to.be.true;
          expect(state.locked.amount).to.be.eq(outputAmount);
        });
      });
    });
  });
});

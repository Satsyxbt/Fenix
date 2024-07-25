import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ZERO_ADDRESS } from '../utils/constants';

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';
import { Fenix, PerpetualsTradersRewarderUpgradeable } from '../../typechain-types';

describe('PerpetualsTradersRewarderUpgradeable', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let gauge: HardhatEthersSigner;

  let Fenix: Fenix;
  let PerpetualsTradersRewarderUpgradeable: PerpetualsTradersRewarderUpgradeable;

  async function createSignature(signer: HardhatEthersSigner, user: string, amount: bigint) {
    const domain = {
      name: 'PerpetualsTradersRewarderUpgradeable',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await PerpetualsTradersRewarderUpgradeable.getAddress(),
    };
    const types = {
      Message: [
        { name: 'user', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
    };
    const value = {
      user: user,
      amount: amount,
    };

    return await signer.signTypedData(domain, types, value);
  }

  beforeEach(async () => {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    Fenix = deployed.fenix;
    gauge = signers.otherUser5;

    let implementation = await ethers.deployContract('PerpetualsTradersRewarderUpgradeable', [signers.blastGovernor.address]);
    PerpetualsTradersRewarderUpgradeable = (await ethers.getContractAt(
      'PerpetualsTradersRewarderUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
      ).target,
    )) as any as PerpetualsTradersRewarderUpgradeable;
  });

  describe('Deployment', async () => {
    it('fail if try initialize on implementation', async () => {
      let implementation = await ethers.deployContract('PerpetualsTradersRewarderUpgradeable', [signers.blastGovernor.address]);
      await implementation.waitForDeployment();
      await expect(implementation.initialize(signers.blastGovernor.address, gauge.address, Fenix.target, ZERO_ADDRESS)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('fail if try initialize second time', async () => {
      await PerpetualsTradersRewarderUpgradeable.initialize(signers.blastGovernor.address, gauge.address, Fenix.target, ZERO_ADDRESS);
      await expect(
        PerpetualsTradersRewarderUpgradeable.initialize(signers.blastGovernor.address, gauge.address, Fenix.target, ZERO_ADDRESS),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fail if try provide zero blast governor address', async () => {
      await expect(
        PerpetualsTradersRewarderUpgradeable.initialize(ZERO_ADDRESS, gauge.address, Fenix.target, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AddressZero');
    });

    it('fail if try provide zero gauge address', async () => {
      await expect(
        PerpetualsTradersRewarderUpgradeable.initialize(signers.blastGovernor.address, ZERO_ADDRESS, Fenix.target, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AddressZero');
    });
    it('fail if try provide zero token address', async () => {
      await expect(
        PerpetualsTradersRewarderUpgradeable.initialize(signers.blastGovernor.address, gauge.address, ZERO_ADDRESS, ZERO_ADDRESS),
      ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AddressZero');
    });
    it('success setup state after initializion proccess', async () => {
      expect(await PerpetualsTradersRewarderUpgradeable.owner()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsTradersRewarderUpgradeable.gauge()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsTradersRewarderUpgradeable.signer()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsTradersRewarderUpgradeable.token()).to.be.eq(ZERO_ADDRESS);
      await PerpetualsTradersRewarderUpgradeable.initialize(signers.blastGovernor.address, gauge.address, Fenix.target, ZERO_ADDRESS);
      expect(await PerpetualsTradersRewarderUpgradeable.owner()).to.be.eq(signers.deployer.address);
      expect(await PerpetualsTradersRewarderUpgradeable.gauge()).to.be.eq(gauge.address);
      expect(await PerpetualsTradersRewarderUpgradeable.signer()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsTradersRewarderUpgradeable.token()).to.be.eq(Fenix.target);
    });
    it('success setup state with not zero signer', async () => {
      expect(await PerpetualsTradersRewarderUpgradeable.signer()).to.be.eq(ZERO_ADDRESS);

      await PerpetualsTradersRewarderUpgradeable.initialize(
        signers.blastGovernor.address,
        gauge.address,
        Fenix.target,
        signers.fenixTeam.address,
      );
      expect(await PerpetualsTradersRewarderUpgradeable.signer()).to.be.eq(signers.fenixTeam.address);
    });
  });

  describe('initialized()', async () => {
    beforeEach(async () => {
      await PerpetualsTradersRewarderUpgradeable.initialize(
        signers.blastGovernor.address,
        gauge.address,
        Fenix.target,
        signers.fenixTeam.address,
      );
    });
    describe('#setSigner()', async () => {
      it('fail if try call from not owner', async () => {
        await expect(PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).setSigner(ZERO_ADDRESS)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('success set new signer & zero signer', async () => {
        expect(await PerpetualsTradersRewarderUpgradeable.signer()).to.be.eq(signers.fenixTeam.address);
        await expect(PerpetualsTradersRewarderUpgradeable.setSigner(signers.otherUser3.address))
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'SetSigner')
          .withArgs(signers.otherUser3.address);
        expect(await PerpetualsTradersRewarderUpgradeable.signer()).to.be.eq(signers.otherUser3.address);
        await expect(PerpetualsTradersRewarderUpgradeable.setSigner(ZERO_ADDRESS))
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'SetSigner')
          .withArgs(ZERO_ADDRESS);
        expect(await PerpetualsTradersRewarderUpgradeable.signer()).to.be.eq(ZERO_ADDRESS);
      });
    });

    describe('#notifyRewardAmount()', async () => {
      it('fail if try call from not gauge address', async () => {
        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).notifyRewardAmount(ZERO_ADDRESS, 0),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AccessDenied');
      });
      it('fail if try provide incorrect reward token', async () => {
        await expect(PerpetualsTradersRewarderUpgradeable.connect(gauge).notifyRewardAmount(ZERO_ADDRESS, 0)).to.be.revertedWithCustomError(
          PerpetualsTradersRewarderUpgradeable,
          'IncorrectRewardToken',
        );
        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(gauge).notifyRewardAmount(gauge.address, 0),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'IncorrectRewardToken');
      });
      it('success call, transfer tokens and emit event', async () => {
        await Fenix.transfer(gauge.address, ethers.parseEther('2'));
        expect(await Fenix.balanceOf(gauge.address)).to.be.eq(ethers.parseEther('2'));
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(0);
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(0);

        await Fenix.connect(gauge).approve(PerpetualsTradersRewarderUpgradeable.target, ethers.parseEther('100'));

        let tx = await PerpetualsTradersRewarderUpgradeable.connect(gauge).notifyRewardAmount(Fenix.target, ethers.parseEther('1'));
        let block = await tx.getBlock();
        await expect(tx)
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Reward')
          .withArgs(gauge.address, block?.timestamp, ethers.parseEther('1'));

        await expect(tx)
          .to.be.emit(Fenix, 'Transfer')
          .withArgs(gauge.address, PerpetualsTradersRewarderUpgradeable.target, ethers.parseEther('1'));

        expect(await Fenix.balanceOf(gauge.address)).to.be.eq(ethers.parseEther('1'));
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('1'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('1'));

        tx = await PerpetualsTradersRewarderUpgradeable.connect(gauge).notifyRewardAmount(Fenix.target, ethers.parseEther('1'));
        block = await tx.getBlock();
        await expect(tx)
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Reward')
          .withArgs(gauge.address, block?.timestamp, ethers.parseEther('1'));

        await expect(tx)
          .to.be.emit(Fenix, 'Transfer')
          .withArgs(gauge.address, PerpetualsTradersRewarderUpgradeable.target, ethers.parseEther('1'));

        expect(await Fenix.balanceOf(gauge.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('2'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('2'));
      });
    });

    describe('#claim()', async () => {
      beforeEach(async () => {
        await Fenix.transfer(gauge.address, ethers.parseEther('100'));
        await Fenix.connect(gauge).approve(PerpetualsTradersRewarderUpgradeable.target, ethers.parseEther('100'));
        await PerpetualsTradersRewarderUpgradeable.connect(gauge).notifyRewardAmount(Fenix.target, ethers.parseEther('100'));
      });
      it('fail if signer is zero', async () => {
        await PerpetualsTradersRewarderUpgradeable.setSigner(ZERO_ADDRESS);
        await expect(PerpetualsTradersRewarderUpgradeable.claim(0, '0x')).to.be.revertedWithCustomError(
          PerpetualsTradersRewarderUpgradeable,
          'ClaimDisabled',
        );
      });
      it('fail if amount less or equal already claimed amount', async () => {
        await expect(PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(0, '0x')).to.be.revertedWithCustomError(
          PerpetualsTradersRewarderUpgradeable,
          'AlreadyClaimed',
        );
        let signature = await createSignature(signers.fenixTeam, signers.otherUser1.address, ethers.parseEther('1'));

        await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('1'), signature);

        await expect(PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(1, '0x')).to.be.revertedWithCustomError(
          PerpetualsTradersRewarderUpgradeable,
          'AlreadyClaimed',
        );
        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('1'), '0x'),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AlreadyClaimed');
      });

      it('fail if provide incorrect signature', async () => {
        await expect(PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(1, '0x')).to.be.revertedWith(
          'ECDSA: invalid signature length',
        );

        let signature = await createSignature(signers.fenixTeam, signers.otherUser1.address, ethers.parseEther('1'));
        await expect(PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(1, signature)).to.be.revertedWithCustomError(
          PerpetualsTradersRewarderUpgradeable,
          'InvalidSignature',
        );
        await expect(PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('1'), signature)).to.be.not
          .reverted;
      });

      it('success claim rewards from users', async () => {
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('100'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser1.address)).to.be.eq(0);
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await PerpetualsTradersRewarderUpgradeable.totalClaimed()).to.be.eq(0);
        expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('100'));

        let signature = await createSignature(signers.fenixTeam, signers.otherUser1.address, ethers.parseEther('1'));

        expect(
          await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim.staticCall(ethers.parseEther('1'), signature),
        ).to.be.eq(ethers.parseEther('1'));
        let tx = await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('1'), signature);
        let block = await tx.getBlock();

        await expect(tx)
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Claim')
          .withArgs(signers.otherUser1.address, block?.timestamp, ethers.parseEther('1'));
        await expect(tx)
          .to.be.emit(Fenix, 'Transfer')
          .withArgs(PerpetualsTradersRewarderUpgradeable.target, signers.otherUser1.address, ethers.parseEther('1'));

        expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.eq(0);
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('99'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('100'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser2.address)).to.be.eq(0);
        expect(await PerpetualsTradersRewarderUpgradeable.totalClaimed()).to.be.eq(ethers.parseEther('1'));

        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('1'), signature),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AlreadyClaimed');
        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser2).claim(ethers.parseEther('1'), signature),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'InvalidSignature');

        signature = await createSignature(signers.fenixTeam, signers.otherUser2.address, ethers.parseEther('0.5'));
        expect(
          await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser2).claim.staticCall(ethers.parseEther('0.5'), signature),
        ).to.be.eq(ethers.parseEther('0.5'));
        tx = await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser2).claim(ethers.parseEther('0.5'), signature);
        block = await tx.getBlock();

        await expect(tx)
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Claim')
          .withArgs(signers.otherUser2.address, block?.timestamp, ethers.parseEther('0.5'));
        await expect(tx)
          .to.be.emit(Fenix, 'Transfer')
          .withArgs(PerpetualsTradersRewarderUpgradeable.target, signers.otherUser2.address, ethers.parseEther('0.5'));

        expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('0.5'));
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('98.5'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('100'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('0.5'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalClaimed()).to.be.eq(ethers.parseEther('1.5'));

        signature = await createSignature(signers.fenixTeam, signers.otherUser2.address, ethers.parseEther('0.51'));
        expect(
          await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser2).claim.staticCall(ethers.parseEther('0.51'), signature),
        ).to.be.eq(ethers.parseEther('0.01'));
        tx = await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser2).claim(ethers.parseEther('0.51'), signature);
        block = await tx.getBlock();

        await expect(tx)
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Claim')
          .withArgs(signers.otherUser2.address, block?.timestamp, ethers.parseEther('0.01'));
        await expect(tx)
          .to.be.emit(Fenix, 'Transfer')
          .withArgs(PerpetualsTradersRewarderUpgradeable.target, signers.otherUser2.address, ethers.parseEther('0.01'));

        expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('0.51'));
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('98.49'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('100'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('1'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('0.51'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalClaimed()).to.be.eq(ethers.parseEther('1.51'));

        signature = await createSignature(signers.fenixTeam, signers.otherUser1.address, ethers.parseEther('10'));
        expect(
          await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim.staticCall(ethers.parseEther('10'), signature),
        ).to.be.eq(ethers.parseEther('9'));
        tx = await PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('10'), signature);
        block = await tx.getBlock();

        await expect(tx)
          .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Claim')
          .withArgs(signers.otherUser1.address, block?.timestamp, ethers.parseEther('9'));
        await expect(tx)
          .to.be.emit(Fenix, 'Transfer')
          .withArgs(PerpetualsTradersRewarderUpgradeable.target, signers.otherUser1.address, ethers.parseEther('9'));

        expect(await Fenix.balanceOf(signers.otherUser1.address)).to.be.eq(ethers.parseEther('10'));
        expect(await Fenix.balanceOf(signers.otherUser2.address)).to.be.eq(ethers.parseEther('0.51'));
        expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('89.49'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('100'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser1.address)).to.be.eq(ethers.parseEther('10'));
        expect(await PerpetualsTradersRewarderUpgradeable.claimed(signers.otherUser2.address)).to.be.eq(ethers.parseEther('0.51'));
        expect(await PerpetualsTradersRewarderUpgradeable.totalClaimed()).to.be.eq(ethers.parseEther('10.51'));

        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('10'), signature),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AlreadyClaimed');

        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('9.99'), signature),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'AlreadyClaimed');

        await expect(
          PerpetualsTradersRewarderUpgradeable.connect(signers.otherUser1).claim(ethers.parseEther('10.1'), signature),
        ).to.be.revertedWithCustomError(PerpetualsTradersRewarderUpgradeable, 'InvalidSignature');
      });
    });
  });
});

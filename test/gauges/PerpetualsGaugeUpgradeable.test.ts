import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ZERO, ZERO_ADDRESS } from '../utils/constants';

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';
import { Fenix, PerpetualsTradersRewarderUpgradeable, PerpetualsGaugeUpgradeable } from '../../typechain-types';

describe('PerpetualsGaugeUpgradeable', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: HardhatEthersSigner;

  let Fenix: Fenix;
  let PerpetualsTradersRewarderUpgradeable: PerpetualsTradersRewarderUpgradeable;
  let PerpetualsGaugeUpgradeable: PerpetualsGaugeUpgradeable;

  beforeEach(async () => {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    Fenix = deployed.fenix;
    voter = signers.otherUser5;

    let implementation = (await ethers.deployContract('PerpetualsTradersRewarderUpgradeable', [signers.blastGovernor.address])) as any;
    PerpetualsTradersRewarderUpgradeable = (await ethers.getContractAt(
      'PerpetualsTradersRewarderUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
      ).target,
    )) as any as PerpetualsTradersRewarderUpgradeable;

    implementation = await ethers.deployContract('PerpetualsGaugeUpgradeable', [signers.blastGovernor.address]);
    PerpetualsGaugeUpgradeable = (await ethers.getContractAt(
      'PerpetualsGaugeUpgradeable',
      (
        await ethers.deployContract('TransparentUpgradeableProxy', [implementation.target, signers.proxyAdmin.address, '0x'])
      ).target,
    )) as any as PerpetualsGaugeUpgradeable;

    await PerpetualsTradersRewarderUpgradeable.initialize(
      signers.blastGovernor.address,
      PerpetualsGaugeUpgradeable.target,
      Fenix.target,
      ZERO_ADDRESS,
    );
  });

  describe('Deployment', async () => {
    it('fail if try initialize on implementation', async () => {
      let implementation = await ethers.deployContract('PerpetualsGaugeUpgradeable', [signers.blastGovernor.address]);
      await implementation.waitForDeployment();
      await expect(
        implementation.initialize(
          signers.blastGovernor.address,
          Fenix.target,
          voter.address,
          PerpetualsTradersRewarderUpgradeable.target,
          'EON',
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fail if try initialize second time', async () => {
      await PerpetualsGaugeUpgradeable.initialize(
        signers.blastGovernor.address,
        Fenix.target,
        voter.address,
        PerpetualsTradersRewarderUpgradeable.target,
        'EON',
      );
      await expect(
        PerpetualsGaugeUpgradeable.initialize(
          signers.blastGovernor.address,
          Fenix.target,
          voter.address,
          PerpetualsTradersRewarderUpgradeable.target,
          'EON',
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fail if try provide zero blast governor address', async () => {
      await expect(
        PerpetualsGaugeUpgradeable.initialize(
          ZERO_ADDRESS,
          Fenix.target,
          voter.address,
          PerpetualsTradersRewarderUpgradeable.target,
          'EON',
        ),
      ).to.be.revertedWithCustomError(PerpetualsGaugeUpgradeable, 'AddressZero');
    });

    it('fail if try provide zero reward token address', async () => {
      await expect(
        PerpetualsGaugeUpgradeable.initialize(
          signers.blastGovernor.address,
          ZERO_ADDRESS,
          voter.address,
          PerpetualsTradersRewarderUpgradeable.target,
          'EON',
        ),
      ).to.be.revertedWithCustomError(PerpetualsGaugeUpgradeable, 'AddressZero');
    });
    it('fail if try provide zero voter address', async () => {
      await expect(
        PerpetualsGaugeUpgradeable.initialize(
          signers.blastGovernor.address,
          Fenix.target,
          ZERO_ADDRESS,
          PerpetualsTradersRewarderUpgradeable.target,
          'EON',
        ),
      ).to.be.revertedWithCustomError(PerpetualsGaugeUpgradeable, 'AddressZero');
    });
    it('fail if try provide zero rewarder address', async () => {
      await expect(
        PerpetualsGaugeUpgradeable.initialize(signers.blastGovernor.address, Fenix.target, voter.address, ZERO_ADDRESS, 'EON'),
      ).to.be.revertedWithCustomError(PerpetualsGaugeUpgradeable, 'AddressZero');
    });

    it('success setup state after initializion proccess', async () => {
      expect(await PerpetualsGaugeUpgradeable.owner()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsGaugeUpgradeable.rewardToken()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsGaugeUpgradeable.rewarder()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsGaugeUpgradeable.DISTRIBUTION()).to.be.eq(ZERO_ADDRESS);
      expect(await PerpetualsGaugeUpgradeable.NAME()).to.be.eq('');
      await PerpetualsGaugeUpgradeable.initialize(
        signers.blastGovernor.address,
        Fenix.target,
        voter.address,
        PerpetualsTradersRewarderUpgradeable.target,
        'EON',
      );

      expect(await PerpetualsGaugeUpgradeable.owner()).to.be.eq(signers.deployer.address);
      expect(await PerpetualsGaugeUpgradeable.rewardToken()).to.be.eq(Fenix.target);
      expect(await PerpetualsGaugeUpgradeable.rewarder()).to.be.eq(PerpetualsTradersRewarderUpgradeable.target);
      expect(await PerpetualsGaugeUpgradeable.DISTRIBUTION()).to.be.eq(voter.address);
      expect(await PerpetualsGaugeUpgradeable.NAME()).to.be.eq('EON');
    });
  });

  describe('initialized()', async () => {
    beforeEach(async () => {
      await PerpetualsGaugeUpgradeable.initialize(
        signers.blastGovernor.address,
        Fenix.target,
        voter.address,
        PerpetualsTradersRewarderUpgradeable.target,
        'EON',
      );
    });
    describe('notifyRewardAmount', async () => {
      it('should fail if call from not voter', async () => {
        await expect(
          PerpetualsGaugeUpgradeable.connect(signers.otherUser1).notifyRewardAmount(Fenix.target, 1),
        ).to.be.revertedWithCustomError(PerpetualsGaugeUpgradeable, 'AccessDenied');
      });
      it('should fail if provide incorrect reward token', async () => {
        await expect(PerpetualsGaugeUpgradeable.connect(voter).notifyRewardAmount(ZERO_ADDRESS, 1)).to.be.revertedWithCustomError(
          PerpetualsGaugeUpgradeable,
          'IncorrectRewardToken',
        );
        await expect(
          PerpetualsGaugeUpgradeable.connect(voter).notifyRewardAmount(signers.otherUser2.address, 1),
        ).to.be.revertedWithCustomError(PerpetualsGaugeUpgradeable, 'IncorrectRewardToken');
      });

      describe('success notify reward and transfer to rewarder', async () => {
        beforeEach(async () => {
          await Fenix.transfer(voter.address, ethers.parseEther('100'));
          await Fenix.connect(voter).approve(PerpetualsGaugeUpgradeable.target, ethers.parseEther('10000'));
          expect(await Fenix.balanceOf(voter.address)).to.be.eq(ethers.parseEther('100'));
          expect(await Fenix.balanceOf(PerpetualsGaugeUpgradeable.target)).to.be.eq(0);
          expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(0);
        });

        afterEach(async () => {
          expect(await Fenix.balanceOf(voter.address)).to.be.eq(0);
          expect(await Fenix.balanceOf(PerpetualsGaugeUpgradeable.target)).to.be.eq(0);
          expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(ethers.parseEther('100'));
          expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.eq(ethers.parseEther('100'));
        });

        it('success and emit events', async () => {
          let tx = await PerpetualsGaugeUpgradeable.connect(voter).notifyRewardAmount(Fenix.target, ethers.parseEther('1'));
          let block = await tx.getBlock();
          await expect(tx).to.be.emit(PerpetualsGaugeUpgradeable, 'RewardAdded').withArgs(ethers.parseEther('1'));
          await expect(tx)
            .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Reward')
            .withArgs(PerpetualsGaugeUpgradeable.target, block?.timestamp, ethers.parseEther('1'));
          await expect(tx)
            .to.be.emit(Fenix, 'Transfer')
            .withArgs(PerpetualsGaugeUpgradeable.target, PerpetualsTradersRewarderUpgradeable.target, ethers.parseEther('1'));
          await expect(tx).to.be.emit(Fenix, 'Transfer').withArgs(voter.address, PerpetualsGaugeUpgradeable.target, ethers.parseEther('1'));

          tx = await PerpetualsGaugeUpgradeable.connect(voter).notifyRewardAmount(Fenix.target, ethers.parseEther('99'));
          block = await tx.getBlock();
          await expect(tx).to.be.emit(PerpetualsGaugeUpgradeable, 'RewardAdded').withArgs(ethers.parseEther('99'));
          await expect(tx)
            .to.be.emit(PerpetualsTradersRewarderUpgradeable, 'Reward')
            .withArgs(PerpetualsGaugeUpgradeable.target, block?.timestamp, ethers.parseEther('99'));
          await expect(tx)
            .to.be.emit(Fenix, 'Transfer')
            .withArgs(PerpetualsGaugeUpgradeable.target, PerpetualsTradersRewarderUpgradeable.target, ethers.parseEther('99'));
          await expect(tx)
            .to.be.emit(Fenix, 'Transfer')
            .withArgs(voter.address, PerpetualsGaugeUpgradeable.target, ethers.parseEther('99'));
        });
      });
    });
  });
});

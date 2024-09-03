import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ZERO, ZERO_ADDRESS } from '../utils/constants';

import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import completeFixture, { CoreFixtureDeployed, SignersList } from '../utils/coreFixture';
import { Fenix, PerpetualsTradersRewarderUpgradeable, PerpetualsGaugeUpgradeable, VoterUpgradeable } from '../../typechain-types';

describe('VoterWithCustomGauge', function () {
  let deployed: CoreFixtureDeployed;
  let signers: SignersList;
  let voter: VoterUpgradeable;
  let Fenix: Fenix;
  let PerpetualsTradersRewarderUpgradeable: PerpetualsTradersRewarderUpgradeable;
  let PerpetualsGaugeUpgradeable: PerpetualsGaugeUpgradeable;

  beforeEach(async () => {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    Fenix = deployed.fenix;
    voter = deployed.voter;

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

    await PerpetualsGaugeUpgradeable.initialize(
      signers.blastGovernor.address,
      Fenix.target,
      voter.target,
      PerpetualsTradersRewarderUpgradeable.target,
      'EON',
    );

    await voter.createCustomGauge(
      PerpetualsGaugeUpgradeable.target,
      PerpetualsGaugeUpgradeable.target,
      Fenix.target,
      ZERO_ADDRESS,
      'EON external bribes',
      'EON internal bribes',
    );
    await Fenix.approve(deployed.votingEscrow.target, ethers.parseEther('10000'));
    await deployed.votingEscrow.create_lock_for(ethers.parseEther('10000'), 6 * 30 * 86400, signers.deployer.address);
  });

  it('success register new gauge in Voter', async () => {
    expect((await voter.gaugesState(PerpetualsGaugeUpgradeable.target)).isGauge).to.be.true;
    expect(await voter.poolToGauge(PerpetualsGaugeUpgradeable.target)).to.be.eq(PerpetualsGaugeUpgradeable.target);
    expect((await voter.gaugesState(PerpetualsGaugeUpgradeable.target)).isAlive).to.be.true;
  });

  it('can be vote for new gauge', async () => {
    let epochTimestamp = await voter._epochTimestamp();
    await voter.vote(1, [PerpetualsGaugeUpgradeable.target], [ethers.parseEther('10000')]);
    expect(await voter.poolVote(1, 0)).to.be.eq(PerpetualsGaugeUpgradeable.target);
    expect(await voter.votes(1, PerpetualsGaugeUpgradeable.target)).to.be.closeTo(ethers.parseEther('9900'), ethers.parseEther('400'));
    expect(await voter.weightsPerEpoch(epochTimestamp, PerpetualsGaugeUpgradeable.target)).to.be.closeTo(
      ethers.parseEther('9900'),
      ethers.parseEther('400'),
    );
  });

  it('can call claimRewards for custom gauge', async () => {
    await expect(voter.claimRewards([PerpetualsGaugeUpgradeable.target])).to.be.not.reverted;
  });

  it('can call distributeFees for custom gauge', async () => {
    await expect(voter.distributeFees([PerpetualsGaugeUpgradeable.target])).to.be.not.reverted;
  });

  it('emisison for new epoch should transfer to rewarder', async () => {
    expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.eq(0);
    let mintAmount = await deployed.minter.weekly();

    await voter.vote(1, [PerpetualsGaugeUpgradeable.target], [ethers.parseEther('10000')]);

    await time.increase(7 * 86400);
    await voter.distributeAll();

    let expectAmount = mintAmount - (mintAmount * BigInt(5)) / BigInt(100);
    expect(await Fenix.balanceOf(PerpetualsTradersRewarderUpgradeable.target)).to.be.closeTo(expectAmount, ethers.parseEther('1'));
    expect(await PerpetualsTradersRewarderUpgradeable.totalReward()).to.be.closeTo(expectAmount, ethers.parseEther('0.001'));
  });
});

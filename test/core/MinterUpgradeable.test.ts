import { setCode, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastMock__factory, Fenix, MinterUpgradeable, VoterEscrowMock, VoterMock } from '../../typechain-types/index';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ONE, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { SignersList, deployFenixToken, deployMinter, getSigners } from '../utils/coreFixture';

describe('MinterUpgradeable Contract', function () {
  let minter: MinterUpgradeable;
  let signers: SignersList;
  let fenix: Fenix;
  let voterMock: VoterMock;
  let voterEscrow: VoterEscrowMock;

  const WEEK: bigint = BigInt(86400 * 7);
  const INITIAL_TOKEN_SUPPLY = ethers.parseEther('7500000');
  const WEEKLY = ethers.parseEther('225000');

  async function currentPeriod(): Promise<bigint> {
    return (BigInt(await time.latest()) / WEEK) * WEEK;
  }

  beforeEach(async function () {
    await setCode(BLAST_PREDEPLOYED_ADDRESS, BlastMock__factory.bytecode);

    signers = await getSigners();
    fenix = await deployFenixToken(signers.deployer, signers.blastGovernor.address, signers.deployer.address);
    voterMock = await ethers.deployContract('VoterMock');
    voterEscrow = await ethers.deployContract('VoterEscrowMock');

    await voterMock.setToken(fenix.target);
    await voterEscrow.setToken(fenix.target);

    minter = await deployMinter(
      signers.deployer,
      signers.proxyAdmin.address,
      signers.blastGovernor.address,
      await voterMock.getAddress(),
      await voterEscrow.getAddress(),
    );

    await fenix.transferOwnership(minter.target);
  });

  describe('Deployment', function () {
    it('Should set the right initial parameters', async () => {
      expect(await minter.isStarted()).to.be.false;
      expect(await minter.isFirstMint()).to.be.true;
      expect(await minter.fenix()).to.be.eq(fenix.target);
      expect(await minter.ve()).to.be.eq(voterEscrow.target);
      expect(await minter.voter()).to.be.eq(voterMock.target);
      expect(await minter.inflationRate()).to.be.eq(150);
      expect(await minter.inflationRate()).to.be.eq(150);
      expect(await minter.decayRate()).to.be.eq(100);
      expect(await minter.teamRate()).to.be.eq(500);
      expect(await minter.MAX_TEAM_RATE()).to.be.eq(500);
      expect(await minter.weekly()).to.be.eq(ethers.parseEther('225000'));
      expect(await minter.lastInflationPeriod()).to.be.eq(ZERO);
      expect(await minter.TAIL_EMISSION()).to.be.eq(20);
    });
    it('Should set avtive_period in two weeks', async () => {
      let inTwoPeriod = ((BigInt(await time.latest()) + BigInt(2) * WEEK) / WEEK) * WEEK;
      expect(await minter.active_period()).to.be.eq(inTwoPeriod);
    });
    it('Should set deployed like owner', async () => {
      expect(await minter.owner()).to.be.eq(signers.deployer.address);
    });
    it('Minter should be owner of Fenix token', async () => {
      expect(await fenix.owner()).to.be.eq(minter.target);
    });
    it('Should fail if try call initialize second time', async () => {
      await expect(minter.initialize(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
  });

  describe('Only ownable functions', async () => {
    describe('#start', async () => {
      it('Should fail if caller not owner', async () => {
        await expect(minter.connect(signers.otherUser1).start()).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('Should fail if try call second time', async () => {
        await minter.start();
        await expect(minter.start()).to.be.revertedWith('Already started');
      });
      it('Should corect start, and calc params', async () => {
        let inTwoPeriod = ((BigInt(await time.latest()) + BigInt(2) * WEEK) / WEEK) * WEEK;

        expect(await minter.isStarted()).to.be.false;
        expect(await minter.active_period()).to.be.eq(inTwoPeriod);
        expect(await minter.lastInflationPeriod()).to.be.eq(ZERO);

        await minter.start();

        let cp = await currentPeriod();
        expect(await minter.isStarted()).to.be.true;
        expect(await minter.active_period()).to.be.eq(cp);
        expect(await minter.lastInflationPeriod()).to.be.eq(cp + WEEK * BigInt(8));
      });
    });
    describe('#voter', async () => {
      it('Should fail if caller not owner', async () => {
        await expect(minter.connect(signers.otherUser1).setVoter(signers.otherUser1.address)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('Should fail if provide zero address', async () => {
        await expect(minter.setVoter(ZERO_ADDRESS)).to.be.reverted;
      });
      it('Should success change voter', async () => {
        expect(await minter.voter()).to.be.eq(voterMock.target);
        await minter.setVoter(signers.otherUser1.address);
        expect(await minter.voter()).to.be.eq(signers.otherUser1.address);
      });
    });
    describe('#setTeamRate', async () => {
      it('Should fail if caller not owner', async () => {
        await expect(minter.connect(signers.otherUser1).setTeamRate(100)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('Should fail if try set more > 5%', async () => {
        await minter.setTeamRate(499);
        await minter.setTeamRate(500);
        await expect(minter.setTeamRate(501)).to.be.revertedWith('rate too high');
        await expect(minter.setTeamRate(502)).to.be.revertedWith('rate too high');
      });
      it('Should success change team rate', async () => {
        expect(await minter.teamRate()).to.be.eq(500);
        await minter.setTeamRate(422);
        expect(await minter.teamRate()).to.be.eq(422);
      });
    });
    describe('#setDecayRate', async function () {
      it('Should fail if caller not owner', async () => {
        await expect(minter.connect(signers.otherUser1).setDecayRate(100)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('Should fail if try set more > 100%', async () => {
        await minter.setDecayRate(9999);
        await minter.setDecayRate(10000);
        await expect(minter.setDecayRate(10001)).to.be.revertedWith('rate too high');
        await expect(minter.setDecayRate(10002)).to.be.revertedWith('rate too high');
      });
      it('Should success change decay rate', async () => {
        expect(await minter.decayRate()).to.be.eq(100);
        await minter.setDecayRate(506);
        expect(await minter.decayRate()).to.be.eq(506);
      });
    });
    describe('#setInflationRate', async () => {
      it('Should fail if caller not owner', async () => {
        await expect(minter.connect(signers.otherUser1).setInflationRate(100)).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('Should fail if try set more > 100%', async () => {
        await minter.setInflationRate(9999);
        await minter.setInflationRate(10000);
        await expect(minter.setInflationRate(10001)).to.be.revertedWith('rate too high');
        await expect(minter.setInflationRate(10002)).to.be.revertedWith('rate too high');
      });
      it('Should success change decay rate', async () => {
        expect(await minter.inflationRate()).to.be.eq(150);
        await minter.setInflationRate(506);
        expect(await minter.inflationRate()).to.be.eq(506);
      });
    });
  });

  describe('#check', async () => {
    it('Should return false if not launch start`', async () => {
      expect(await minter.check()).to.be.false;
    });
    it('Should return false if launch but is not new period`', async () => {
      await minter.start();
      expect(await minter.check()).to.be.false;
    });
    it('Should return true if new period, and false after update to new period`', async () => {
      await minter.start();
      await time.increase(WEEK);
      expect(await minter.check()).to.be.true;
      await minter.update_period();
      expect(await minter.check()).to.be.false;
    });
  });
  describe('#period', async () => {
    it('Should corectly calculate current `period`', async () => {
      expect(await minter.period()).to.be.eq(await currentPeriod());
    });
  });
  describe('#circulating_supply', async () => {
    it('Should corectly calculate circulation supply', async () => {
      let beforeCS = await minter.circulating_supply();
      expect(beforeCS).to.be.eq(await fenix.totalSupply());

      await fenix.transfer(voterEscrow.target, 1);

      let afterCS = await minter.circulating_supply();

      expect(afterCS).to.be.eq((await fenix.totalSupply()) - ONE);
      expect(beforeCS - afterCS).to.be.eq(ONE);

      await fenix.transfer(voterEscrow.target, await fenix.balanceOf(signers.deployer.address));

      expect(await minter.circulating_supply()).to.be.eq(ZERO);
    });
  });
  it('Should not mint any tokens if wasnt call start', async () => {
    expect(await fenix.totalSupply()).to.be.eq(INITIAL_TOKEN_SUPPLY);
    await time.increase(WEEK);
    await minter.update_period();
    await time.increase(WEEK);
    await minter.update_period();
    expect(await fenix.totalSupply()).to.be.eq(INITIAL_TOKEN_SUPPLY);
  });
  describe('#update_period', async () => {
    beforeEach(async () => {
      await minter.start();
    });

    it('Should not distribute emission and emit event ', async () => {
      expect(await fenix.balanceOf(minter.target)).to.be.eq(ZERO);
      expect(await fenix.balanceOf(voterMock.target)).to.be.eq(ZERO);
      expect(await fenix.balanceOf(signers.deployer.address)).to.be.eq(INITIAL_TOKEN_SUPPLY);

      await time.increase(WEEK);
      let toTeam = ((await minter.weekly()) * BigInt(500)) / BigInt(10000);
      await expect(minter.connect(signers.otherUser1).update_period())
        .to.be.emit(minter, 'Mint')
        .withArgs(signers.otherUser1.address, WEEKLY, INITIAL_TOKEN_SUPPLY + WEEKLY);

      expect(await fenix.balanceOf(voterMock.target)).to.be.eq(WEEKLY - toTeam);
      expect(await fenix.balanceOf(signers.deployer.address)).to.be.eq(INITIAL_TOKEN_SUPPLY + toTeam);
      expect(await fenix.balanceOf(minter.target)).to.be.eq(ZERO);
    });
    it('Should not update after start and change balance or mint ', async () => {
      let tsBefore = await fenix.totalSupply();
      let periodBefore = await minter.active_period();

      expect(await fenix.balanceOf(minter.target)).to.be.eq(ZERO);
      expect(await fenix.balanceOf(voterMock.target)).to.be.eq(ZERO);

      await minter.update_period();
      expect(await fenix.balanceOf(voterMock.target)).to.be.eq(ZERO);

      expect(await fenix.balanceOf(minter.target)).to.be.eq(ZERO);

      expect(await minter.active_period()).to.be.eq(periodBefore);
      expect(await fenix.totalSupply()).to.be.eq(tsBefore);
    });

    it('Should corect mint first value without any decay or inflation but eq weekly amount ', async () => {
      let tsBefore = await fenix.totalSupply();
      let periodBefore = await minter.active_period();
      let balanceOwnerBefore = await fenix.balanceOf(signers.deployer.address);

      await time.increase(WEEK);

      expect(balanceOwnerBefore).to.be.eq(INITIAL_TOKEN_SUPPLY);
      expect(await fenix.balanceOf(minter.target)).to.be.eq(ZERO);
      expect(await fenix.balanceOf(voterMock.target)).to.be.eq(ZERO);
      expect(await minter.weekly()).to.be.eq(WEEKLY);

      await minter.update_period();

      expect(await minter.weekly()).to.be.eq(WEEKLY);
      expect(await fenix.balanceOf(voterMock.target)).to.be.eq(WEEKLY - ethers.parseEther('11250'));
      expect(await fenix.balanceOf(minter.target)).to.be.eq(ZERO);
      expect(await fenix.balanceOf(signers.deployer.address)).to.be.eq(balanceOwnerBefore + ethers.parseEther('11250')); // 5% from WEEKLY

      expect(await minter.active_period()).to.be.eq(periodBefore + WEEK);

      expect(await fenix.totalSupply()).to.be.eq(tsBefore + WEEKLY);
    });
    it('Should corect mint value for inflation epoch with increasing WEEKLY amount ', async () => {
      const INFLATION_RATE = BigInt(150); // 1.5%

      let weeklyBefore = await minter.weekly();

      expect(weeklyBefore).to.be.eq(WEEKLY);

      await time.increase(WEEK);
      await minter.update_period();

      expect(await minter.weekly()).to.be.eq(WEEKLY);
      // skipp all inflation periods
      while ((await minter.period()) < (await minter.lastInflationPeriod())) {
        await time.increase(WEEK);
        await minter.update_period();
        let newWeekly = await minter.weekly();
        expect(newWeekly - weeklyBefore).to.be.eq((INFLATION_RATE * weeklyBefore) / BigInt(10000));
        expect(newWeekly).to.be.greaterThan(weeklyBefore);
        weeklyBefore = newWeekly;
      }

      // stop after end inflation epoch, start decrease
      await time.increase(WEEK);
      await minter.update_period();

      expect(await minter.weekly()).to.be.lessThan(weeklyBefore);
    });
    it('Should corect mint value for decay epoch with decreasyng WEEKLY amount ', async () => {
      let weeklyBefore = await minter.weekly();

      expect(weeklyBefore).to.be.eq(WEEKLY);

      await time.increase(WEEK);
      await minter.update_period();

      expect(await minter.weekly()).to.be.eq(WEEKLY);

      while ((await minter.period()) < (await minter.lastInflationPeriod())) {
        await time.increase(WEEK);
        await minter.update_period();
        let newWeekly = await minter.weekly();
        expect(newWeekly).to.be.greaterThan(weeklyBefore);
        weeklyBefore = newWeekly;
      }
      // stop after end inflation epoch, start decrease
      await time.increase(WEEK);
      await minter.update_period();

      expect(await minter.weekly()).to.be.lessThan(weeklyBefore);
      weeklyBefore = await minter.weekly();

      for (let index = 0; index < 20; index++) {
        await time.increase(WEEK);
        await minter.update_period();
        let newWeekly = await minter.weekly();
        expect(newWeekly).to.be.lessThan(weeklyBefore);
        expect(weeklyBefore - newWeekly).to.be.eq((BigInt(100) * weeklyBefore) / BigInt(10000));
        weeklyBefore = newWeekly;
      }
    });
    it('Should corect work after change inflation rate beetwen epoch', async () => {
      await time.increase(WEEK);
      await minter.update_period();
      expect(await minter.weekly()).to.be.eq(ethers.parseEther('225000'));

      await time.increase(WEEK);
      await minter.update_period();

      expect(await minter.weekly()).to.be.eq(ethers.parseEther('228375'));

      await time.increase(WEEK);
      await minter.update_period();

      expect(await minter.weekly()).to.be.closeTo(ethers.parseEther('231801'), ethers.parseEther('1'));

      await minter.setInflationRate(200); // from 1.5% to 2%

      await time.increase(WEEK);
      await minter.update_period();
      expect(await minter.weekly()).to.be.closeTo(ethers.parseEther('236437.02'), ethers.parseEther('1'));

      await time.increase(WEEK);
      await minter.update_period();
      expect(await minter.weekly()).to.be.closeTo(ethers.parseEther('241165.76'), ethers.parseEther('1'));
    });
    it('Should corect work after change decay rate beetwen epoch', async () => {
      while ((await minter.period()) <= (await minter.lastInflationPeriod())) {
        await time.increase(WEEK);
        await minter.update_period();
      }
      expect(await minter.weekly()).to.be.closeTo(ethers.parseEther('247218'), ethers.parseEther('1'));
      await time.increase(WEEK);
      await minter.update_period();
      expect(await minter.weekly()).to.be.closeTo(ethers.parseEther('244746'), ethers.parseEther('1'));
      await minter.setDecayRate(321); // from 1% to 3.21%
      await time.increase(WEEK);
      await minter.update_period();
      expect(await minter.weekly()).to.be.closeTo(ethers.parseEther('236889.653'), ethers.parseEther('1'));
      await time.increase(WEEK);
      await minter.update_period();
      expect(await minter.weekly()).to.be.closeTo(ethers.parseEther('229285.495'), ethers.parseEther('1'));
    });
  });

  describe('Should eq to spreedsheet', async () => {
    it(`check epoch from 0 to 52 basic on spreedsheet`, async () => {
      expect(await fenix.totalSupply()).to.be.eq(INITIAL_TOKEN_SUPPLY);

      await minter.start();
      let emissions = [
        0, 225000, 228375, 231801, 235278, 238807, 242389, 246025, 249715, 247218, 244746, 242298, 239875, 237477, 235102, 232751, 230423,
        228119, 225838, 223579, 221344, 219130, 216939, 214770, 212622, 210496, 208391, 206307, 204244, 202201, 200179, 198177, 196196,
        194234, 192291, 190368, 188465, 186580, 184714, 182867, 181039, 179228, 177436, 175662, 173905, 172166, 170444, 168740, 167052,
        165382, 163728, 162091, 160470,
      ];
      let lastTotalSupply: bigint = await fenix.totalSupply();
      let changeBefore: bigint = BigInt(0);

      for (let index = 0; index < emissions.length; index++) {
        lastTotalSupply = await fenix.totalSupply();
        await minter.update_period();
        await time.increase(WEEK);
        let change = (await fenix.totalSupply()) - lastTotalSupply;
        console.log(`${index} ${ethers.formatEther(await fenix.totalSupply())} ${ethers.formatEther(change)}`);
        expect(change).to.be.closeTo(ethers.parseEther(emissions[index].toString()), ethers.parseEther('1'));
        changeBefore = change;
      }

      expect(await fenix.totalSupply()).to.be.closeTo(ethers.parseEther('18232672'), ethers.parseEther('1'));
    });
  });

  describe('TAIL_EMISSION', async () => {
    it('Should corect calculate circulating_emission()', async () => {
      // when circulation supply = totalSuply()
      let supply = await fenix.totalSupply();
      expect(supply).to.be.eq(await minter.circulating_supply());
      expect(await minter.circulating_emission()).to.be.eq((supply * BigInt(20)) / BigInt(10000));

      await fenix.transfer(voterEscrow.target, supply / BigInt(2));

      expect(await minter.circulating_supply()).to.be.eq(supply / BigInt(2));
      expect(await minter.circulating_emission()).to.be.closeTo(((supply / BigInt(2)) * BigInt(20)) / BigInt(10000), ONE);
    });
    it('Should corect calculate weekly_emission() when emission is less than circulation_emisison()', async () => {
      // lock 60% fnx on veFNX
      await fenix.transfer(voterEscrow.target, ((await fenix.totalSupply()) * BigInt(60)) / BigInt(100));
      await minter.start();
      for (let i = 0; i < 300; i++) {
        await time.increase(WEEK);
        await minter.update_period();
        // should be never less then 0.2% from circlation supply
        let circulation = await minter.circulating_supply();
        let minEmission = (circulation * BigInt(20)) / BigInt(10000);
        expect(await minter.weekly_emission()).to.be.greaterThanOrEqual(minEmission);
      }
    });
  });

  describe('After patch initial supply', async () => {
    describe('Should eq to spreedsheet * 10', async () => {
      beforeEach(async () => {
        await minter.patchInitialSupply();
      });

      it('fail if call second time', async () => {
        await expect(minter.patchInitialSupply()).to.be.revertedWith(ERRORS.Initializable.Initialized);
      });
      it('fail if try call from not owner', async () => {
        await expect(minter.connect(signers.otherUser1).patchInitialSupply()).to.be.revertedWith(ERRORS.Ownable.NotOwner);
      });
      it('mint additional supply and transfer to owner', async () => {
        expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('75000000'));
        expect(await fenix.balanceOf(signers.deployer.address)).to.be.eq(ethers.parseEther('75000000'));
      });

      it('change weekly state minter', async () => {
        expect(await minter.weekly()).to.be.eq(ethers.parseEther('2250000'));
      });

      it(`check epoch from 0 to 52 basic on spreedsheet`, async () => {
        expect(await fenix.totalSupply()).to.be.eq(INITIAL_TOKEN_SUPPLY * BigInt(10));

        await minter.start();
        let emissions = [
          0, 225000, 228375, 231801, 235278, 238807, 242389, 246025, 249715, 247218, 244746, 242298, 239875, 237477, 235102, 232751, 230423,
          228119, 225838, 223579, 221344, 219130, 216939, 214770, 212622, 210496, 208391, 206307, 204244, 202201, 200179, 198177, 196196,
          194234, 192291, 190368, 188465, 186580, 184714, 182867, 181039, 179228, 177436, 175662, 173905, 172166, 170444, 168740, 167052,
          165382, 163728, 162091, 160470,
        ];
        let lastTotalSupply: bigint = await fenix.totalSupply();

        for (let index = 0; index < emissions.length; index++) {
          lastTotalSupply = await fenix.totalSupply();
          await minter.update_period();
          await time.increase(WEEK);
          let change = (await fenix.totalSupply()) - lastTotalSupply;
          console.log(`${index} ${ethers.formatEther(await fenix.totalSupply())} ${ethers.formatEther(change)}`);
          expect(change).to.be.closeTo(ethers.parseEther(emissions[index].toString()) * BigInt(10), ethers.parseEther('10'));
        }
        expect(await fenix.totalSupply()).to.be.closeTo(ethers.parseEther('18232672') * BigInt(10), ethers.parseEther('10'));
      });
    });
  });
});

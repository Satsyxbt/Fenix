import { setCode, time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { BlastMock__factory, Fenix, MinterUpgradeable, VoterEscrowMock, VoterMock } from '../../../typechain-types/index';
import { BLAST_PREDEPLOYED_ADDRESS, ERRORS, ONE, ZERO, ZERO_ADDRESS } from '../../utils/constants';
import { SignersList, deployFenixToken, deployMinter, getSigners } from '../../utils/coreFixture';

describe('BehavierWithoutShiftOneWeekPatch.test Contract', function () {
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

  before(async function () {
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

  it('behavier without shiftStartByOneWeek patch', async () => {
    let cPeriod = await currentPeriod();
    await minter.start();
    await minter.patchInitialSupply();
    await minter.update_period();

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('75000000'));
    expect(await minter.isStarted()).to.be.true;
    expect(await minter.weekly()).to.be.eq(ethers.parseEther('2250000'));
    expect(await minter.lastInflationPeriod()).to.be.eq(cPeriod + 8n * WEEK);
    expect(await minter.active_period()).to.be.eq(cPeriod);
    expect(await minter.isFirstMint()).to.be.true;
    expect(await minter.startEmissionDistributionTimestamp()).to.be.eq(0);

    console.log(`Date: ${new Date(Number(cPeriod) * 1000).toUTCString()}, TotalSupply: ${await fenix.totalSupply()}`);

    await time.increase(WEEK);

    await minter.update_period();

    let newPeriod = await currentPeriod();

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('77250000'));
    expect(await minter.isStarted()).to.be.true;
    expect(await minter.weekly()).to.be.eq(ethers.parseEther('2250000'));
    expect(await minter.lastInflationPeriod()).to.be.eq(cPeriod + 8n * WEEK);
    expect(await minter.active_period()).to.be.eq(newPeriod);
    expect(await minter.isFirstMint()).to.be.false;
    expect(await minter.startEmissionDistributionTimestamp()).to.be.eq(0);

    console.log(`Date: ${new Date(Number(newPeriod) * 1000).toUTCString()}, TotalSupply: ${await fenix.totalSupply()}`);

    await time.increase(WEEK);

    await minter.update_period();

    let newPeriod_2 = await currentPeriod();

    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('79533750'));
    expect(await minter.isStarted()).to.be.true;
    expect(await minter.weekly()).to.be.eq(ethers.parseEther('2283750'));
    expect(await minter.lastInflationPeriod()).to.be.eq(cPeriod + 8n * WEEK);
    expect(await minter.active_period()).to.be.eq(newPeriod_2);
    expect(await minter.isFirstMint()).to.be.false;
    console.log(`Date: ${new Date(Number(newPeriod_2) * 1000).toUTCString()}, TotalSupply: ${await fenix.totalSupply()}`);
  });
});

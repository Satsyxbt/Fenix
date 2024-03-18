import { ethers } from 'hardhat';
import { getDeploysData } from '../utils';

async function main() {
  let deploysData = getDeploysData();
  let fnUSDT = '0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a';
  let fnTok = '0x9Fe9D260262331807D0aa0fb06Fda1fa1b5E2ce5';
  let fenix = '0xA12E4649fdDDEFD0FB390e4D4fb34fFbd2834fA6';

  let factory = await ethers.getContractAt('PairFactoryUpgradeable', deploysData['PairFactory']);
  let voter = await ethers.getContractAt('VoterUpgradeable', deploysData['Voter']);
  await voter.createGauges([await factory.getPair(fnUSDT, fnTok, true), await factory.getPair(fenix, fnTok, false)], [0, 0]);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

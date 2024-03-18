import { ethers } from 'hardhat';
import { getDeploysData } from '../utils';

async function main() {
  let deploysData = getDeploysData();

  let fnUSDT = '0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a';
  let fnTok = '0x9Fe9D260262331807D0aa0fb06Fda1fa1b5E2ce5';
  let fenix = '0xA12E4649fdDDEFD0FB390e4D4fb34fFbd2834fA6';

  let factory = await ethers.getContractAt('PairFactoryUpgradeable', deploysData['PairFactory']);

  await factory.createPair(fnUSDT, fnTok, true);
  console.log('Pair fnUSDT, fnTok, true');

  await factory.createPair(fenix, fnTok, true);
  console.log('Pair fenix, fnTok, true');

  await factory.createPair(fenix, fnUSDT, true);
  console.log('Pair fenix, fnUSDT, true');

  await factory.createPair(fenix, fnTok, false);
  console.log('Pair fenix, fnTok, false');

  await factory.createPair(fnTok, fnUSDT, false);
  console.log('Pair fenix, fnTok, false');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

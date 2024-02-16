import { ethers } from 'hardhat';
import { getDeploysData } from '../utils';

async function main() {
  let deploysData = getDeploysData();

  if (
    deploysData['TK18'] &&
    deploysData['TK9'] &&
    deploysData['TK6'] &&
    deploysData['PairFactory'] &&
    deploysData['Fenix'] &&
    deploysData['Voter']
  ) {
    let factory = await ethers.getContractAt('PairFactoryUpgradeable', deploysData['PairFactory']);
    let voter = await ethers.getContractAt('VoterUpgradeable', deploysData['Voter']);
    await voter.createGauges(
      [
        await factory.getPair(deploysData['TK18'], deploysData['TK9'], true),
        await factory.getPair(deploysData['TK18'], deploysData['TK9'], false),
        await factory.getPair(deploysData['Fenix'], deploysData['TK18'], true),
      ],
      [0, 0, 0],
    );
  } else {
    console.log('Contracts not present');
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

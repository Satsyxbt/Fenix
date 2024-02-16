import { ethers } from 'hardhat';
import { getDeploysData } from '../utils';

async function main() {
  let deploysData = getDeploysData();

  if (deploysData['TK18'] && deploysData['TK9'] && deploysData['TK6'] && deploysData['PairFactory'] && deploysData['Fenix']) {
    let factory = await ethers.getContractAt('PairFactoryUpgradeable', deploysData['PairFactory']);
    await factory.createPair(deploysData['TK18'], deploysData['TK9'], true);
    await factory.createPair(deploysData['TK18'], deploysData['TK9'], false);
    await factory.createPair(deploysData['TK18'], deploysData['TK6'], true);
    await factory.createPair(deploysData['TK18'], deploysData['TK6'], false);
    await factory.createPair(deploysData['TK9'], deploysData['TK6'], true);
    await factory.createPair(deploysData['TK9'], deploysData['TK6'], false);
    await factory.createPair(deploysData['Fenix'], deploysData['TK9'], true);
    await factory.createPair(deploysData['Fenix'], deploysData['TK9'], false);
    await factory.createPair(deploysData['Fenix'], deploysData['TK6'], true);
    await factory.createPair(deploysData['Fenix'], deploysData['TK6'], false);
    await factory.createPair(deploysData['Fenix'], deploysData['TK18'], true);
    await factory.createPair(deploysData['Fenix'], deploysData['TK18'], false);
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

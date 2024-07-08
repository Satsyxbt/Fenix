import { deployProxy, getDeployedDataFromDeploys, getDeploysData } from '../utils';
import { ethers } from 'hardhat';

async function main() {
  let deploysData = getDeploysData();
  let Voter = await ethers.getContractAt('VoterUpgradeable', deploysData['Voter']);

  await Voter.removeFactory(3);
  await Voter.removeFactory(4);

  await Voter.addFactory('0x69A78807815624004Eed0b1D1b9a6B42CE76E261', '0x64054c30fc177ACa548cb2B6020a5f566d739027');
  await Voter.addFactory('0x69A78807815624004Eed0b1D1b9a6B42CE76E261', '0x3C3E8b3b980C1442158447F45D417f88E201716D');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

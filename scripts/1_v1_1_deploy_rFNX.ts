import { ethers } from 'hardhat';
import { getDeploysData } from './utils';
import { deployBase } from './utils';
import hre from 'hardhat';

const NAME = 'rFNX';
async function main() {
  let deploysData = getDeploysData();

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  await deployBase('RFenix', 'rFNX', [deployer.address, deploysData['VotingEscrow']]);

  function timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  deploysData = getDeploysData();

  await timeout(15000);

  try {
    await hre.run('verify:verify', {
      address: deploysData[NAME],
      constructorArguments: [deployer.address, deploysData['VotingEscrow']],
    });
  } catch (e) {
    console.warn('Error with verification proccess');
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

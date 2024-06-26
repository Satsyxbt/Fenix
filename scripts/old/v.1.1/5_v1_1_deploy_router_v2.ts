import { ethers } from 'hardhat';
import { getDeploysData, saveDeploysData } from '../../utils';
import { deployBase } from '../../utils';
import hre from 'hardhat';

const WETH = '0x4300000000000000000000000000000000000004';
const NAME = 'RouterV2';
async function main() {
  let deploysData = getDeploysData();

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  await deployBase('RouterV2', 'RouterV2', [deployer.address, deploysData['PairFactory'], WETH]);

  function timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  deploysData = getDeploysData();

  await timeout(15000);

  try {
    await hre.run('verify:verify', {
      address: deploysData[NAME],
      constructorArguments: [deployer.address, deploysData['PairFactory'], WETH],
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

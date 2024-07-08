import { ethers } from 'hardhat';
import { getDeploysData, saveDeploysData } from './utils';
import { deployBase } from './utils';
import hre from 'hardhat';

const NAME = 'UniswapV2PartialRouter';
async function main() {
  let deploysData = getDeploysData();

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  await deployBase('UniswapV2PartialRouter', 'UniswapV2PartialRouter', [
    deployer.address,
    '0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f',
    '0x4300000000000000000000000000000000000004',
  ]);

  function timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  deploysData = getDeploysData();

  await timeout(15000);

  try {
    await hre.run('verify:verify', {
      address: deploysData[NAME],
      constructorArguments: [deployer.address, '0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f', '0x4300000000000000000000000000000000000004'],
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

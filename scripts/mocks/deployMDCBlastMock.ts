import { ethers } from 'hardhat';
import hre from 'hardhat';

async function main() {
  const factory = await ethers.getContractFactory('MDCBlastMock');
  let instance = await factory.deploy();

  try {
    await hre.run('verify:verify', {
      address: instance.target,
      constructorArguments: [],
    });
  } catch (e) {
    console.warn('Error with verification proccess', e);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

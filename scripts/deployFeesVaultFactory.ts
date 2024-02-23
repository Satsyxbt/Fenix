import { ethers } from 'hardhat';
import hre from 'hardhat';

import { getDeploysData, saveDeploysData } from './utils';

const NAME = 'FeesVaultFactory';
async function main() {
  console.log(`Start deploy ${NAME} contract...`);

  let deploysData = getDeploysData();
  if (deploysData['Voter'] && deploysData['FeesVaultImplementation']) {
    if (deploysData[NAME]) {
      console.warn(`${NAME} contract already deployed, skip deployment, address: ${deploysData[NAME]}`);
    } else {
      const factory = await ethers.getContractFactory('FeesVaultFactory');

      const signers = await ethers.getSigners();
      const deployer = signers[0];

      let contract = await factory.connect(deployer).deploy(deployer.address, deploysData['FeesVaultImplementation'], deploysData['Voter']);
      await contract.waitForDeployment();

      deploysData[NAME] = await contract.getAddress();

      saveDeploysData(deploysData);

      console.log(`Successful deploy ${NAME} contract: ${await contract.getAddress()}`);

      try {
        await hre.run('verify:verify', {
          address: deploysData[NAME],
          constructorArguments: [deployer.address, deploysData['FeesVaultImplementation'], deploysData['Voter']],
        });
      } catch (e) {
        console.warn('Error with verification proccess');
      }
    }
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

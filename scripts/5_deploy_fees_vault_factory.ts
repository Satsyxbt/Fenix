import { ethers } from 'hardhat';
import hre from 'hardhat';

import { getDeploysData, saveDeploysData } from './utils';

const NAME = 'FeesVaultFactory';
async function main() {
  console.log('5_deploys_fees_vault_factory -- started');

  let deploysData = getDeploysData();
  if (deploysData['Voter'] && deploysData['FeesVaultImplementation']) {
    if (deploysData[NAME]) {
      console.warn(`${NAME} contract already deployed, skip deployment, address: ${deploysData[NAME]}`);
    } else {
      console.log(`Start deploy ${NAME} contract...`);

      const factory = await ethers.getContractFactory('FeesVaultFactory');

      const signers = await ethers.getSigners();
      const deployer = signers[0];

      let contract = await factory.connect(deployer).deploy(deployer.address, deploysData['FeesVaultImplementation'], deploysData['Voter']);
      await contract.waitForDeployment();

      deploysData[NAME] = await contract.getAddress();

      saveDeploysData(deploysData);

      console.log(`Successful deploy ${NAME} contract: ${await contract.getAddress()}`);

      function timeout(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      await timeout(30000);

      try {
        await hre.run('verify:verify', {
          address: deploysData[NAME],
          constructorArguments: [deployer.address, deploysData['FeesVaultImplementation'], deploysData['Voter']],
        });
      } catch (e) {
        console.warn('Error with verification proccess');
      }
    }
  } else {
    console.warn('address of Voter or FeesVaultImplementation not found');
  }
  console.log('5_deploys_fees_vault_factory -- finished');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

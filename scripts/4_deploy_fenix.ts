import { ethers } from 'hardhat';
import hre from 'hardhat';

import { getDeploysData, saveDeploysData } from './utils';

const NAME = 'Fenix';
async function main() {
  console.log('4_deploy_fenix.ts -- started');

  let deploysData = getDeploysData();
  if (deploysData[NAME]) {
    console.warn(`${NAME} contract already deployed, skip deployment, address: ${deploysData[NAME]}`);
  } else {
    console.log(`Start deploy ${NAME} contract...`);

    const factory = await ethers.getContractFactory('Fenix');

    const signers = await ethers.getSigners();
    const deployer = signers[0];

    let contract = await factory.connect(deployer).deploy(deployer.address, deployer.address);
    await contract.waitForDeployment();

    deploysData[NAME] = await contract.getAddress();

    saveDeploysData(deploysData);

    console.log(`Successful deploy ${NAME} contract: ${await contract.getAddress()}`);

    console.log('Wait before start veriy, for indexed from explorer');

    function timeout(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    await timeout(30000);

    try {
      await hre.run('verify:verify', {
        address: deploysData[NAME],
        constructorArguments: [deployer.address, deployer.address],
      });
    } catch (e) {
      console.warn('Error with verification proccess');
    }
  }
  console.log('3_deploy_proxies.ts -- success finished');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

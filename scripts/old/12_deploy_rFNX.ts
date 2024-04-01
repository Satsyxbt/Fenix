import { ethers } from 'hardhat';
import { getDeploysData, saveDeploysData } from '../utils';
import { deployBase } from '../utils';
import hre from 'hardhat';

const NAME = 'rFNX';
async function main() {
  console.log('12_deploy_rFNX -- started');

  let deploysData = getDeploysData();

  if (deploysData[NAME]) {
    console.warn(`${NAME} contract already deployed, skip deployment, address: ${deploysData[NAME]}`);
  } else {
    console.log(`Start deploy ${NAME} contract...`);

    const factory = await ethers.getContractFactory('RFenix');

    const signers = await ethers.getSigners();
    const deployer = signers[0];

    let contract = await factory.connect(deployer).deploy(deployer.address, deploysData['VotingEscrow']);
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
        constructorArguments: [deployer.address, deploysData['VotingEscrow']],
      });
    } catch (e) {
      console.warn('Error with verification proccess');
    }
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

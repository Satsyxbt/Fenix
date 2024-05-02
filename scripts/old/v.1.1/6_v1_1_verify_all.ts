import { ethers } from 'hardhat';
import { getDeployedDataFromDeploys, getDeploysData } from '../../utils';
import hre from 'hardhat';

const WETH = '0x4300000000000000000000000000000000000004';

async function verifyImplementations(data: any) {
  let keys = Object.keys(data);

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (key.toLocaleLowerCase().includes('implementation')) {
      const address = data[key];
      await hre.run('verify:verify', {
        address: address,
        constructorArguments: [],
      });
    }
  }
}
async function main() {
  let deployed = await getDeployedDataFromDeploys();
  let data = await getDeploysData();

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  await verifyImplementations(data);

  await hre.run('verify:verify', {
    address: data['ProxyAdmin'],
    constructorArguments: [],
  });

  await hre.run('verify:verify', {
    address: data['rFNX'],
    constructorArguments: [],
  });

  await hre.run('verify:verify', {
    address: data['RouterV2'],
    constructorArguments: [deployer.address, deployed.PairFactory.target, WETH],
  });

  await hre.run('verify:verify', {
    address: data['ProxyAdmin'],
    constructorArguments: [deployer.address, deployed.PairFactory.target, WETH],
  });
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

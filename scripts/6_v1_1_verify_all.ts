import { ethers } from 'hardhat';
import { getDeployedDataFromDeploys, getDeploysData } from './utils';
import hre from 'hardhat';

const WETH = '0x4300000000000000000000000000000000000004';

async function main() {
  let deployed = await getDeployedDataFromDeploys();
  let data = await getDeploysData();

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  await hre.run('verify:verify', {
    address: deployed.FeesVaultImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.PairImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.PairFactoryImplementation.target,
    constructorArguments: [],
  });

  await hre.run('verify:verify', {
    address: data['RouterV2'],
    constructorArguments: [deployer.address, deployed.PairFactory.target, WETH],
  });
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

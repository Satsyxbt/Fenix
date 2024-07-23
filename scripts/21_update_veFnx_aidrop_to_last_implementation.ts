import { deployBase, getDeploysData } from './utils';
import hre, { ethers } from 'hardhat';

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  await deployBase('VeFnxSplitMerklAidropUpgradeable', 'VeFnxSplitMerklAidropImplementation', [deployer.address]);

  let data = getDeploysData();

  let ProxyAdmin = await hre.ethers.getContractAt('ProxyAdmin', data['ProxyAdmin']);

  await ProxyAdmin.upgrade(data['VeFnxSplitMerklAidrop'], data['VeFnxSplitMerklAidropImplementation']);

  let VeFnxSplitMerklAidropUpgradeable = await ethers.getContractAt('VeFnxSplitMerklAidropUpgradeable', data['VeFnxSplitMerklAidrop']);
  await VeFnxSplitMerklAidropUpgradeable.setIsAllowedClaimOperator(data['Voter'], true);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { ethers } from 'hardhat';
import { deployBase, deployProxy, getDeploysData } from './utils';

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let data = getDeploysData();

  let ProxyAdmin = data['ProxyAdmin'];

  await deployBase('VeFnxSplitMerklAidropUpgradeable', 'VeFnxSplitMerklAidropImplementation');

  data = getDeploysData();

  await deployProxy(ProxyAdmin, data['VeFnxSplitMerklAidropImplementation'], 'VeFnxSplitMerklAidrop');

  data = getDeploysData();

  let VeFnxSplitMerklAidropUpgradeable = await ethers.getContractAt('VeFnxSplitMerklAidropUpgradeable', data['VeFnxSplitMerklAidrop']);
  await VeFnxSplitMerklAidropUpgradeable.initialize(deployer.address, data['Fenix'], data['VotingEscrow'], ethers.parseEther('0.6'));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

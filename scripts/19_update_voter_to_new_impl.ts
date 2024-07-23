import { deployBase, getDeploysData } from './utils';
import hre from 'hardhat';

const VOTER = '0x6cCe3E45CCe11bE2CD4715442b0d1c3675C5D055';

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log('19_update_voter_to_new_impl -- started');

  await deployBase('VoterUpgradeableV1_2', 'VoterUpgradeableV1_2Implementation');

  let data = getDeploysData();

  let ProxyAdmin = await hre.ethers.getContractAt('ProxyAdmin', data['ProxyAdmin']);

  await ProxyAdmin.upgrade(VOTER, data['VoterUpgradeableV1_2Implementation']);

  console.log('19_update_voter_to_new_impl -- finished');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

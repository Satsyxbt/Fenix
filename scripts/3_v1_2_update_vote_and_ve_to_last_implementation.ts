import { deployBase, deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';
import hre from 'hardhat';

const VOTING_ESCROW = '0x4dD9e7dd344a309030B22d36A567f0d99C6a5403';
const VOTER = '0x6cCe3E45CCe11bE2CD4715442b0d1c3675C5D055';

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  console.log('3_v1_2_update_vote_and_ve_to_last_implementation -- started');

  await deployBase('VoterUpgradeableV1_2', 'VoterUpgradeableV1_2Implementation');
  await deployBase('VotingEscrowUpgradeableV1_2', 'VotingEscrowUpgradeableV1_2Implementation');

  let data = getDeploysData();

  let ProxyAdmin = await hre.ethers.getContractAt('ProxyAdmin', data['ProxyAdmin']);

  await ProxyAdmin.upgrade(VOTING_ESCROW, data['VotingEscrowUpgradeableV1_2Implementation']);
  await ProxyAdmin.upgrade(VOTER, data['VoterUpgradeableV1_2Implementation']);

  console.log('3_v1_2_update_vote_and_ve_to_last_implementation -- finished');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

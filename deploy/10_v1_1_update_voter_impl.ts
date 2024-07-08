import { deployBase, getDeployedDataFromDeploys, getDeploysData } from './utils';

async function main() {
  await deployBase('VoterUpgradeable', 'VoterImplementation');

  let deploysData = await getDeployedDataFromDeploys();
  let data = await getDeploysData();

  await deploysData.ProxyAdmin.upgrade(deploysData.Voter.target, data['VoterImplementation']);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

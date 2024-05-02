import { deployBase, getDeployedDataFromDeploys, getDeploysData } from '../../utils';

async function main() {
  await deployBase('FeesVaultFactoryUpgradeable', 'FeesVaultFactoryImplementation');

  let deploysData = await getDeployedDataFromDeploys();
  let data = await getDeploysData();

  await deploysData.ProxyAdmin.upgrade(deploysData.FeesVaultFactory.target, data['FeesVaultFactoryImplementation']);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

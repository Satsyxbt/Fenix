import { deployProxy, getDeploysData } from '../utils';
import { deployBase } from '../utils';

async function main() {
  console.log('13_deploy_new_impl_and_proxy -- started');

  await deployBase('PairFactoryUpgradeable', 'PairFactoryImplementation');
  await deployBase('Pair', 'PairImplementation');

  await deployBase('FeesVaultFactoryUpgradeable', 'FeesVaultFactoryImplementation');
  await deployBase('FeesVaultUpgradeable', 'FeesVaultImplementation');

  let data = getDeploysData();

  await deployProxy(data['ProxyAdmin'], data['PairFactoryImplementation'], 'PairFactory');

  await deployProxy(data['ProxyAdmin'], data['FeesVaultFactoryImplementation'], 'FeesVaultFactory');

  console.log('13_deploy_new_impl_and_proxy -- finished');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

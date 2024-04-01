import { deployProxy, getDeploysData } from './utils';
import { deployBase } from './utils';

async function main() {
  let data = getDeploysData();

  let ProxyAdmin = data['ProxyAdmin'];

  await deployBase('PairFactoryUpgradeable', 'PairFactoryImplementation');
  await deployBase('Pair', 'PairImplementation');
  await deployBase('FeesVaultFactoryUpgradeable', 'FeesVaultFactoryImplementation');
  await deployBase('FeesVaultUpgradeable', 'FeesVaultImplementation');

  data = getDeploysData();

  await deployProxy(ProxyAdmin, data['PairFactoryImplementation'], 'PairFactory');
  await deployProxy(ProxyAdmin, data['FeesVaultFactoryImplementation'], 'FeesVaultFactory');

  await deployProxy(ProxyAdmin, data['VoterImplementation'], 'Voter');

  await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType');
  await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType2');
  await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType3');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

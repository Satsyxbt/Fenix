import { deployBase } from './utils';

async function main() {
  console.log('1_deploy_implementations.ts -- started');
  console.log('1_deploy_implementations.ts -- start deploy core part');

  await deployBase('MinterUpgradeable', 'MinterImplementation');
  await deployBase('VeArtProxyUpgradeable', 'VeArtProxyImplementation');
  await deployBase('VoterUpgradeable', 'VoterImplementation');
  await deployBase('VotingEscrowUpgradeable', 'VotingEscrowImplementation');

  console.log('1_deploy_implementations.ts -- start deploy additional part');

  await deployBase('VeFnxDistributorUpgradeable', 'VeFnxDistributorImplementation');

  console.log('1_deploy_implementations.ts -- start deploy bribes part');

  await deployBase('BribeFactoryUpgradeable', 'BribeFactoryImplementation');
  await deployBase('BribeUpgradeable', 'BribeImplementation');

  console.log('1_deploy_implementations.ts -- start deploy gauge part');

  await deployBase('GaugeFactoryUpgradeable', 'GaugeFactoryImplementation');
  await deployBase('GaugeUpgradeable', 'GaugeImplementation');

  console.log('1_deploy_implementations.ts -- start deploy dexv2 part');

  await deployBase('PairFactoryUpgradeable', 'PairFactoryImplementation');
  await deployBase('Pair', 'PairImplementation');

  console.log('1_deploy_implementations.ts -- start deploy integral part');

  await deployBase('FeesVaultUpgradeable', 'FeesVaultImplementation');

  console.log('1_deploy_implementations -- success finished');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

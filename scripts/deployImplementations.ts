import { deployBase } from './utils';

async function main() {
  await deployBase('BribeFactoryUpgradeable', 'BribeFactoryImplementation');
  await deployBase('BribeUpgradeable', 'BribeImplementation');
  await deployBase('FeesVaultUpgradeable', 'FeesVaultImplementation');
  await deployBase('GaugeFactoryUpgradeable', 'GaugeFactoryImplementation');
  await deployBase('GaugeUpgradeable', 'GaugeImplementation');
  await deployBase('MinterUpgradeable', 'MinterImplementation');
  await deployBase('PairFactoryUpgradeable', 'PairFactoryImplementation');
  await deployBase('Pair', 'PairImplementation');
  await deployBase('VeArtProxyUpgradeable', 'VeArtProxyImplementation');
  await deployBase('VeArtProxyUpgradeable', 'VeArtProxyImplementation');
  await deployBase('VoterUpgradeable', 'VoterImplementation');
  await deployBase('VotingEscrowUpgradeable', 'VotingEscrowImplementation');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

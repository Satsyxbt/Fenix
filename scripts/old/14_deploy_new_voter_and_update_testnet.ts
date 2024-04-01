import { ethers } from 'hardhat';
import { deployProxy, getDeploysData } from '../utils';

const BLAST_GOVERNOR = '0x9140D359f2855E6540609dd4A93773ED1f45f509';

async function main() {
  console.log('14_deploy_new_voter_and_update_testnet -- started');
  let data = getDeploysData();

  let ProxyAdmin = data['ProxyAdmin'];

  console.log('-- start deploy voter');
  await deployProxy(ProxyAdmin, data['VoterImplementation'], 'Voter');

  console.log('-- start deploy gauge part');
  await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType');
  await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType2');
  await deployProxy(ProxyAdmin, data['GaugeFactoryImplementation'], 'GaugeFactoryType3');

  data = getDeploysData();
  let Voter = await ethers.getContractAt('VoterUpgradeable', data['Voter']);
  let VotingEscrow = await ethers.getContractAt('VotingEscrowUpgradeable', data['VotingEscrow']);
  let MinterUpgradeable = await ethers.getContractAt('MinterUpgradeable', data['Minter']);
  let BribeFactoryUpgradeable = await ethers.getContractAt('BribeFactoryUpgradeable', data['BribeFactory']);
  let PairFactoryUpgradeable = await ethers.getContractAt('PairFactoryUpgradeable', data['PairFactory']);
  let GaugeUpgradeable = await ethers.getContractAt('GaugeUpgradeable', data['GaugeImplementation']);
  let GaugeFactoryType = await ethers.getContractAt('GaugeFactoryUpgradeable', data['GaugeFactoryType']);
  let GaugeFactoryType2 = await ethers.getContractAt('GaugeFactoryUpgradeable', data['GaugeFactoryType2']);
  let GaugeFactoryType3 = await ethers.getContractAt('GaugeFactoryUpgradeable', data['GaugeFactoryType3']);
  let MerklGaugeMiddleman = await ethers.getContractAt('MerklGaugeMiddleman', data['MerklGaugeMiddleman']);
  let FeesVaultFactory = await ethers.getContractAt('FeesVaultFactoryUpgradeable', data['FeesVaultFactory']);

  console.log('Try initialize GaugeFactory');

  await GaugeFactoryType.initialize(BLAST_GOVERNOR, Voter.target, GaugeUpgradeable.target, ethers.ZeroAddress);
  await GaugeFactoryType2.initialize(BLAST_GOVERNOR, Voter.target, GaugeUpgradeable.target, MerklGaugeMiddleman.target);
  await GaugeFactoryType3.initialize(BLAST_GOVERNOR, Voter.target, GaugeUpgradeable.target, MerklGaugeMiddleman.target);

  console.log('Try initialize Voter');

  await Voter.initialize(
    BLAST_GOVERNOR,
    VotingEscrow.target,
    PairFactoryUpgradeable.target,
    GaugeFactoryType.target,
    BribeFactoryUpgradeable.target,
  );
  await VotingEscrow.setVoter(Voter.target);
  await MinterUpgradeable.setVoter(Voter.target);
  await BribeFactoryUpgradeable.setVoter(Voter.target);
  await FeesVaultFactory.setVoter(Voter.target);

  console.log('14_deploy_new_voter_and_update_testnet -- finished');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

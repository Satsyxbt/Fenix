import { getDeploysData } from '../../utils';
import { ethers } from 'hardhat';

const BLAST_GOVERNOR = '0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30';
const V3_PAIR_FACTORY = '0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df';

async function main() {
  let data = getDeploysData();
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

  await Voter.setMinter(MinterUpgradeable.target);

  await Voter.addFactory(V3_PAIR_FACTORY, GaugeFactoryType2.target);
  await Voter.addFactory(V3_PAIR_FACTORY, GaugeFactoryType3.target);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

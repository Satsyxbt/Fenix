import { ethers } from 'hardhat';
import { getDeployedDataFromDeploys } from './utils';

const V3PairFactory = '0x77f6637d2279b1c122d13DC92aAcb7fF168ff959';
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  let deploysData = await getDeployedDataFromDeploys();

  console.log('Try transferOwnership from Feniux to Minter');
  await deploysData.Fenix.transferOwnership(deploysData.Minter.target);

  console.log('Try initialize setWhitelistedCreatorStatus');
  await deploysData.FeesVaultFactory.setWhitelistedCreatorStatus(deploysData.PairFactory.target, true);
  await deploysData.FeesVaultFactory.setWhitelistedCreatorStatus(V3PairFactory, true);

  console.log('Set Voter');
  await deploysData.VotingEscrow.setVoter(deploysData.Voter.target);
  console.log('setMinter');

  await deploysData.Voter.setMinter(deploysData.Minter.target);
  console.log('await deploysData.PairFactory.grantRole');

  await deploysData.PairFactory.grantRole(await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), deployer.address);
  console.log('setConfigurationForRebaseToken WETH');

  await deploysData.PairFactory.setConfigurationForRebaseToken('0x4300000000000000000000000000000000000004', true, 2);
  console.log('setConfigurationForRebaseToken USDB');

  await deploysData.PairFactory.setConfigurationForRebaseToken('0x4300000000000000000000000000000000000003', true, 2);

  console.log('GaugeFactoryType2.setMerklGaugeMiddleman');

  await deploysData.GaugeFactoryType2.setMerklGaugeMiddleman(deploysData.MerklGaugeMiddleman.target);

  console.log('GaugeFactoryType3.setMerklGaugeMiddleman');
  await deploysData.GaugeFactoryType3.setMerklGaugeMiddleman(deploysData.MerklGaugeMiddleman.target);

  console.log('  await deploysData.Voter.addFactory(V3PairFactory, deploysData.GaugeFactoryType2.target)');
  await deploysData.Voter.addFactory(V3PairFactory, deploysData.GaugeFactoryType2.target);

  console.log('  await deploysData.Voter.addFactory(V3PairFactory, deploysData.GaugeFactoryType3.target);');
  await deploysData.Voter.addFactory(V3PairFactory, deploysData.GaugeFactoryType3.target);

  console.log(
    '    await deploysData.PairFactory.grantRole(0x4f895bdce78ed3edb90e9af75173c797e6234073a00b76fc9593b754504e7520, deployer.address);  ',
  );
  await deploysData.PairFactory.grantRole('0x4f895bdce78ed3edb90e9af75173c797e6234073a00b76fc9593b754504e7520', deployer.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

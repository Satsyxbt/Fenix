import { ethers } from 'hardhat';

import { getDeployedDataFromDeploys } from './utils';

async function main() {
  console.log(`Start initialize contract...`);

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  let deploysData = await getDeployedDataFromDeploys();

  console.log('Try initialize BribeFactory');
  await deploysData.BribeFactory.initialize(deployer.address, deploysData.Voter.target, deploysData.BribeImplementation.target);

  console.log('Try initialize GaugeFactory');
  await deploysData.GaugeFactory.initialize(
    deployer.address,
    deploysData.Voter.target,
    deploysData.GaugeImplementation.target,
    ethers.ZeroAddress,
  );

  console.log('Try initialize PairFactory');
  await deploysData.PairFactory.initialize(deployer.address, deploysData.FeesVaultFactory.target);

  console.log('Try initialize Minter');
  await deploysData.Minter.initialize(deployer.address, deployer.address, deploysData.Voter.target, deploysData.VotingEscrow.target);

  console.log('Try initialize VotingEscrow');
  await deploysData.VotingEscrow.initialize(deployer.address, deploysData.Fenix.target, deploysData.VeArtProxy.target);

  console.log('Try initialize Voter');
  await deploysData.Voter.initialize(
    deployer.address,
    deploysData.VotingEscrow.target,
    deploysData.PairFactory.target,
    deploysData.GaugeFactory.target,
    deploysData.BribeFactory.target,
  );

  console.log('Try initialize Fenix');
  await deploysData.Fenix.transferOwnership(deploysData.Minter.target);

  console.log('Try initialize FeesVaultFactory');
  await deploysData.FeesVaultFactory.setWhitelistedCreatorStatus(deploysData.PairFactory.target, true);
  console.log('Set Voter');

  await deploysData.VotingEscrow.setVoter(deploysData.Voter.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { ethers } from 'hardhat';

import { getDeployedDataFromDeploys } from '../../utils';

async function main() {
  console.log(`Start initialize contract...`);

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  let deploysData = await getDeployedDataFromDeploys();

  console.log('Try initialize BribeFactory');
  await deploysData.BribeFactory.initialize(deployer.address, deploysData.Voter.target, deploysData.BribeImplementation.target);

  console.log('Try initialize GaugeFactory');
  await deploysData.GaugeFactoryType.initialize(
    deployer.address,
    deploysData.Voter.target,
    deploysData.GaugeImplementation.target,
    ethers.ZeroAddress,
  );

  await deploysData.GaugeFactoryType2.initialize(
    deployer.address,
    deploysData.Voter.target,
    deploysData.GaugeImplementation.target,
    ethers.ZeroAddress,
  );

  await deploysData.GaugeFactoryType3.initialize(
    deployer.address,
    deploysData.Voter.target,
    deploysData.GaugeImplementation.target,
    ethers.ZeroAddress,
  );
  console.log('Try initialize PairFactory');
  await deploysData.PairFactory.initialize(deployer.address, deploysData.PairImplementation.target, deploysData.FeesVaultFactory.target);

  console.log('Try initialize VotingEscrow');
  await deploysData.VotingEscrow.initialize(deployer.address, deploysData.Fenix.target, deploysData.VeArtProxy.target);

  await deploysData.VotingEscrow.checkpoint();

  console.log('Try initialize Minter');
  await deploysData.Minter.initialize(deployer.address, deploysData.Voter.target, deploysData.VotingEscrow.target);

  console.log('Try initialize Voter');
  await deploysData.Voter.initialize(
    deployer.address,
    deploysData.VotingEscrow.target,
    deploysData.PairFactory.target,
    deploysData.GaugeFactoryType.target,
    deploysData.BribeFactory.target,
  );

  console.log('Try initialize VeFnxDistributor');

  await deploysData.VeFnxDistributor.initialize(deployer.address, deploysData.Fenix.target, deploysData.VotingEscrow.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

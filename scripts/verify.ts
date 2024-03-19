import { getDeployedDataFromDeploys, getDeploysData } from './utils';
import hre from 'hardhat';
import { ethers } from 'hardhat';

const WETH = '0x4300000000000000000000000000000000000004';
const MERKLE_DISTRIBUTION_CREATOR = '0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd';

async function main() {
  let deployed = await getDeployedDataFromDeploys();
  let data = await getDeploysData();

  const signers = await ethers.getSigners();
  const deployer = signers[0];

  await hre.run('verify:verify', {
    address: deployed.BribeFactoryImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.BribeImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.GaugeFactoryImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.GaugeImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.MinterImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.VotingEscrowImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.VeArtProxyImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.VoterImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.FeesVaultImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.PairImplementation.target,
    constructorArguments: [],
  });
  await hre.run('verify:verify', {
    address: deployed.PairFactoryImplementation.target,
    constructorArguments: [],
  });

  await hre.run('verify:verify', {
    address: deployed.ProxyAdmin.target,
    constructorArguments: [],
  });

  await hre.run('verify:verify', {
    address: data['VeFnxDistributorImplementation'],
    constructorArguments: [],
  });

  // await hre.run('verify:verify', {
  //   address: data['AlgebraFNXPriceProviderImplementation'],
  //   constructorArguments: [],
  // });

  // await hre.run('verify:verify', {
  //   address: data['VeBoostImplementation'],
  //   constructorArguments: [],
  // });

  // await hre.run('verify:verify', {
  //   address: data['VeBoostImplementation'],
  //   constructorArguments: [],
  // });

  await hre.run('verify:verify', {
    address: deployed.MerklGaugeMiddleman.target,
    constructorArguments: [deployer.address, deployed.Fenix.target, MERKLE_DISTRIBUTION_CREATOR],
  });

  await hre.run('verify:verify', {
    address: deployed.Fenix.target,
    constructorArguments: [deployer.address, deployer.address],
  });

  await hre.run('verify:verify', {
    address: deployed.FeesVaultFactory.target,
    constructorArguments: [deployer.address, deployed.FeesVaultImplementation.target, deployed.Voter.target],
  });

  await hre.run('verify:verify', {
    address: data['RouterV2'],
    constructorArguments: [deployer.address, deployed.PairFactory.target, WETH],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

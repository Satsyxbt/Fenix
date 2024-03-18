import { getDeployedDataFromDeploys } from './utils';
import hre from 'hardhat';
import { ethers } from 'hardhat';

async function main() {
  let deployed = await getDeployedDataFromDeploys();
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  await hre.run('verify:verify', {
    address: deployed.VeFnxDistributorImplementation.target,
    constructorArguments: [],
  });
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
    address: deployed.Fenix.target,
    constructorArguments: [deployer.address, deployer.address],
  });

  await hre.run('verify:verify', {
    address: deployed.FeesVaultFactory.target,
    constructorArguments: [deployer.address, deployed.FeesVaultImplementation.target, deployed.Voter.target],
  });

  await hre.run('verify:verify', {
    address: '0x58DA44Da9af06d43378440549cEd8712125D49B5',
    constructorArguments: [deployer.address, deployed.PairFactory.target, '0x4200000000000000000000000000000000000023'],
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

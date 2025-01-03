import { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy, getBlastGovernorAddress } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();

  await deploy({
    deployer: deployer,
    name: InstanceName.VotingEscrowUpgradeable,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.VotingEscrowUpgradeable_Implementation,
    verify: true,
  });

  await deploy({
    deployer: deployer,
    name: InstanceName.VoterUpgradeable,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.VoterUpgradeable_Implementation,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

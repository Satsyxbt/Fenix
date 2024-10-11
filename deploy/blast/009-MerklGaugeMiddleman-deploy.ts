import { AliasDeployedContracts, deploy, getBlastGovernorAddress, getDeployedContractsAddressList } from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  await deploy({
    name: InstanceName.MerklGaugeMiddleman,
    deployer: deployer,
    constructorArguments: [BlastGovernor, DeployedContracts[AliasDeployedContracts.Fenix], '0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd'],
    saveAlias: AliasDeployedContracts.MerklGaugeMiddleman,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

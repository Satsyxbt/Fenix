import { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy, getBlastGovernorAddress } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();

  await deploy({
    name: InstanceName.CompoundVeFNXManagedNFTStrategyUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

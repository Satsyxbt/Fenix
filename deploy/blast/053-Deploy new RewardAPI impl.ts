import { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
async function main() {
  const [deployer] = await ethers.getSigners();

  await deploy({
    name: InstanceName.RewardAPIUpgradeable,
    deployer: deployer,
    constructorArguments: [],
    saveAlias: AliasDeployedContracts.RewardAPIUpgradeable_Implementation,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

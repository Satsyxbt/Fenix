import { AliasDeployedContracts, deploy, getBlastGovernorAddress } from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();

  await deploy({
    name: InstanceName.Pair,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.Pair_Implementation,
  });

  await deploy({
    name: InstanceName.BribeUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.BribeUpgradeable_Implementation,
  });

  await deploy({
    name: InstanceName.FeesVaultUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.FeesVaultUpgradeable_Implementation,
  });

  await deploy({
    name: InstanceName.GaugeUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.GaugeUpgradeable_Implementation,
  });
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

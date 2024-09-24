import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
  upgradeProxy,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let MinimalLinearVestingUpgradeable_Implementation = await deploy({
    name: InstanceName.MinimalLinearVestingUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.MinimalLinearVestingUpgradeable_Implementation,
    verify: true,
  });

  let Proxy = await deployProxy({
    deployer: deployer,
    logic: await MinimalLinearVestingUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.MinimalLinearVestingUpgradeable_Proxy,
    verify: true,
  });

  const MinimalLinearVestingUpgradeable_Proxy = await ethers.getContractAt(InstanceName.MinimalLinearVestingUpgradeable, Proxy.target);
  await logTx(
    MinimalLinearVestingUpgradeable_Proxy,
    MinimalLinearVestingUpgradeable_Proxy.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.Fenix],
      1727357850,
      86400 * 182,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

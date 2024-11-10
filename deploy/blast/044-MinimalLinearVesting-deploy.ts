import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let MinimalLinearVestingUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.MinimalLinearVestingUpgradeable_Implementation],
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.MinimalLinearVestingUpgradeable_Proxy,
    verify: true,
  });

  let MinimalLinearVestingUpgradeable = await ethers.getContractAt(
    InstanceName.MinimalLinearVestingUpgradeable,
    MinimalLinearVestingUpgradeable_Proxy.target,
  );

  await logTx(
    MinimalLinearVestingUpgradeable,
    MinimalLinearVestingUpgradeable.initialize(BlastGovernor, DeployedContracts[AliasDeployedContracts.Fenix], 1733819901, 15724800),
  );

  await logTx(
    MinimalLinearVestingUpgradeable,
    MinimalLinearVestingUpgradeable.transferOwnership('0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5'),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

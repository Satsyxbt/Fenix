import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { GaugeType } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();
  const TARGET_ADDRESS = '0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5';

  let VeBoost = await ethers.getContractAt(
    InstanceName.VeBoostUpgradeable,
    DeployedContracts[AliasDeployedContracts.VeBoostUpgradeable_Proxy],
  );
  await logTx(VeBoost, VeBoost.transferOwnership(TARGET_ADDRESS));

  let VeFnxSplitMerklAidrop = await ethers.getContractAt(
    InstanceName.VeFnxSplitMerklAidropUpgradeable,
    DeployedContracts[AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Proxy],
  );
  await logTx(VeFnxSplitMerklAidrop, VeFnxSplitMerklAidrop.transferOwnership(TARGET_ADDRESS));

  let MinimalLinearVestingUpgradeable = await ethers.getContractAt(
    InstanceName.MinimalLinearVestingUpgradeable,
    DeployedContracts[AliasDeployedContracts.MinimalLinearVestingUpgradeable_Proxy],
  );
  await logTx(MinimalLinearVestingUpgradeable, MinimalLinearVestingUpgradeable.transferOwnership(TARGET_ADDRESS));

  let BribeFactoryUpgradeable = await ethers.getContractAt(
    InstanceName.BribeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.BribeFactoryUpgradeable_Proxy],
  );
  await logTx(BribeFactoryUpgradeable, BribeFactoryUpgradeable.transferOwnership(TARGET_ADDRESS));
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

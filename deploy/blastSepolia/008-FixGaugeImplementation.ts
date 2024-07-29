import {
  AliasDeployedContracts,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTransaction,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const GaugeFactoryUpgradeable_Proxy_1 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_1],
  );

  await logTx(
    GaugeFactoryUpgradeable_Proxy_1,
    GaugeFactoryUpgradeable_Proxy_1.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation]),
  );

  const GaugeFactoryUpgradeable_Proxy_2 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_2],
  );
  await logTx(
    GaugeFactoryUpgradeable_Proxy_2,
    GaugeFactoryUpgradeable_Proxy_2.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation]),
  );

  const GaugeFactoryUpgradeable_Proxy_3 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_3],
  );
  await logTx(
    GaugeFactoryUpgradeable_Proxy_3,
    GaugeFactoryUpgradeable_Proxy_3.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeUpgradeable_Implementation]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

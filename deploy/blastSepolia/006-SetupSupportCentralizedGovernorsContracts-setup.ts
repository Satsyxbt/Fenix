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

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();
  const BribeFactoryUpgradeable = await ethers.getContractAt(
    InstanceName.BribeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.BribeFactoryUpgradeable_Proxy],
  );

  await logTx(
    BribeFactoryUpgradeable,
    BribeFactoryUpgradeable.changeImplementation(DeployedContracts[AliasDeployedContracts.BribeUpgradeable_Implementation]),
  );
  await logTx(BribeFactoryUpgradeable, BribeFactoryUpgradeable.setDefaultBlastGovernor(BlastGovernor));

  const GaugeFactoryUpgradeable_Proxy_1 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_1],
  );

  await logTx(
    GaugeFactoryUpgradeable_Proxy_1,
    GaugeFactoryUpgradeable_Proxy_1.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation]),
  );
  await logTx(GaugeFactoryUpgradeable_Proxy_1, GaugeFactoryUpgradeable_Proxy_1.setDefaultBlastGovernor(BlastGovernor));

  const GaugeFactoryUpgradeable_Proxy_2 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_2],
  );
  await logTx(
    GaugeFactoryUpgradeable_Proxy_2,
    GaugeFactoryUpgradeable_Proxy_2.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation]),
  );
  await logTx(GaugeFactoryUpgradeable_Proxy_2, GaugeFactoryUpgradeable_Proxy_2.setDefaultBlastGovernor(BlastGovernor));

  const GaugeFactoryUpgradeable_Proxy_3 = await ethers.getContractAt(
    InstanceName.GaugeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_3],
  );
  await logTx(
    GaugeFactoryUpgradeable_Proxy_3,
    GaugeFactoryUpgradeable_Proxy_3.changeImplementation(DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation]),
  );
  await logTx(GaugeFactoryUpgradeable_Proxy_3, GaugeFactoryUpgradeable_Proxy_3.setDefaultBlastGovernor(BlastGovernor));

  const FeesVaultFactoryUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.FeesVaultFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
  );

  await logTx(
    FeesVaultFactoryUpgradeable_Proxy,
    FeesVaultFactoryUpgradeable_Proxy.changeImplementation(DeployedContracts[AliasDeployedContracts.FeesVaultUpgradeable_Implementation]),
  );
  await logTx(FeesVaultFactoryUpgradeable_Proxy, FeesVaultFactoryUpgradeable_Proxy.setDefaultBlastGovernor(BlastGovernor));
  await logTx(
    FeesVaultFactoryUpgradeable_Proxy,
    FeesVaultFactoryUpgradeable_Proxy.setRebasingTokensGovernor(
      DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
    ),
  );

  const PairFactoryUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.PairFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
  );
  await logTx(
    PairFactoryUpgradeable_Proxy,
    PairFactoryUpgradeable_Proxy.upgradePairImplementation(DeployedContracts[AliasDeployedContracts.Pair_Implementation]),
  );
  await logTx(PairFactoryUpgradeable_Proxy, PairFactoryUpgradeable_Proxy.setDefaultBlastGovernor(BlastGovernor));
  await logTx(
    PairFactoryUpgradeable_Proxy,
    PairFactoryUpgradeable_Proxy.setRebasingTokensGovernor(
      DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
    ),
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

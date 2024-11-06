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
  const DeployedContracts = await getDeployedContractsAddressList();

  let CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy],
  );
  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.revokeRole(
      '0x974f532b885822aa67c496025edc0d21d1b01330ef4544fd7568b84d33659f25',
      deployer.address,
    ),
  );
  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.revokeRole(
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      deployer.address,
    ),
  );

  let ManagedNFTManagerUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.ManagedNFTManagerUpgradeable,
    DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
  );

  await logTx(
    ManagedNFTManagerUpgradeable_Proxy,
    ManagedNFTManagerUpgradeable_Proxy.revokeRole('0xd935e9208022e6e646ddd50a845526e117f46138161ae5cf6c7ee44a6263d0a4', deployer.address),
  );
  await logTx(
    ManagedNFTManagerUpgradeable_Proxy,
    ManagedNFTManagerUpgradeable_Proxy.revokeRole('0x0000000000000000000000000000000000000000000000000000000000000000', deployer.address),
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

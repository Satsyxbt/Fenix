import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const FeesVaultFactoryUpgradeable = await ethers.getContractAt(
    InstanceName.FeesVaultFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
  );

  await logTx(
    FeesVaultFactoryUpgradeable,
    FeesVaultFactoryUpgradeable.setDistributionConfigForCreator(DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy], {
      toGaugeRate: 10000,
      rates: [],
      recipients: [],
    }),
  );

  await logTx(
    FeesVaultFactoryUpgradeable,
    FeesVaultFactoryUpgradeable.setDistributionConfigForCreator(DeployedContracts[AliasDeployedContracts.AlgebraFactory_Proxy], {
      toGaugeRate: 10000,
      rates: [],
      recipients: [],
    }),
  );

  let AlgebraFactory = await ethers.getContractAt('IAlgebraFactory', DeployedContracts[AliasDeployedContracts.AlgebraFactory_Proxy]);
  await logTx(AlgebraFactory, AlgebraFactory.setDefaultCommunityFee(1e3));
  const v3PoolList = [
    '0x73a432d0758aded25c1a8ba4610e20ea4ae28ca9',
    '0xf13ebe82f017c3c07c4ff4b814b98fb4c834504e',
    '0xd1deedb6a3e6d71607258cfeeedcb3acc862dba3',
    '0xadfcaba34a101998f6929aa7325cdf04377009bc',
  ];
  for (let index = 0; index < v3PoolList.length; index++) {
    const element = v3PoolList[index];
    let pool = await ethers.getContractAt('IAlgebraPool', element);
    await logTx(pool, pool.setCommunityFee(1e3));
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

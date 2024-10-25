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
  const v2PairsList = [
    '0xb1A4Ed5e453953A625A530E90f1A49e13E7BEbdD',
    '0xd30CD5626aB7d89D8f159069Ecd86079ef4B9024',
    '0xC9684ef567eA6700103816F24B38B23474886Ca8',
    '0x30330761b2b7548a8CeB92a45E914387a78C02Ec',
    '0xc6e9375F6E834383C15142240Bd61cb84798B6CF',
    '0x93C297b68d7D5D3Ca8f07d4918933257750401c5',
    '0xae362f2B4a0fd94Bf4a2aFEF179277584f451E05',
    '0x233B9c242Fe75e8eff108c8658E26bc82E19397D',
    '0x57575a2BE14D5F54A3F3EB6c7a61EE82691C6A95',
    '0xA439B6f0F08410FeF32B11f1f97FbC09CB9aF85c',
    '0xD06F1a73e6B120f9A08962e3583933D547E52163',
    '0xe9aeD3DbDEf8740d30dB5514f7BCB3E4fBEDa819',
    '0xD29719a5139737F757e9012B97E25BbCD5aa2C3c',
  ];
  let v2FeesVaults = [];
  for (let index = 0; index < v2PairsList.length; index++) {
    const element = v2PairsList[index];
    v2FeesVaults.push(await FeesVaultFactoryUpgradeable.getVaultForPool(element));
  }

  await logTx(
    FeesVaultFactoryUpgradeable,
    FeesVaultFactoryUpgradeable.changeCreatorForFeesVaults(
      DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
      v2FeesVaults,
    ),
  );

  const v3PoolList = [
    '0x73a432d0758aded25c1a8ba4610e20ea4ae28ca9',
    '0xf13ebe82f017c3c07c4ff4b814b98fb4c834504e',
    '0xd1deedb6a3e6d71607258cfeeedcb3acc862dba3',
    '0xadfcaba34a101998f6929aa7325cdf04377009bc',
  ];
  let v3FeesVaults = [];
  for (let index = 0; index < v3PoolList.length; index++) {
    const element = v3PoolList[index];
    v3FeesVaults.push(await FeesVaultFactoryUpgradeable.getVaultForPool(element));
  }

  await logTx(
    FeesVaultFactoryUpgradeable,
    FeesVaultFactoryUpgradeable.changeCreatorForFeesVaults(DeployedContracts[AliasDeployedContracts.AlgebraFactory_Proxy], v3FeesVaults),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

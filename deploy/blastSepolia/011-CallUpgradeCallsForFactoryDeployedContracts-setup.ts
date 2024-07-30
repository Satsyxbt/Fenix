import {
  AliasDeployedContracts,
  deploy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function findDeployedContractsAddress(address: string): Promise<string[]> {
  let result: string[] = [];

  for (let index = 0; index < 1000; index++) {
    let t = ethers.getCreateAddress({ from: address, nonce: index });
    let code = await ethers.provider.getCode(t);

    if (code.length <= 10) {
      if (index > 3) break;
    } else {
      result.push(t);
      console.log(t);
    }
  }

  return result;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const UtilsProxy = await ethers.getContractAt(
    InstanceName.UtilsUpgradeable,
    DeployedContracts[AliasDeployedContracts.UtilsUpgradeable_Proxy],
  );

  let targets: string[] = [];

  targets.push(...(await findDeployedContractsAddress(DeployedContracts[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy])));
  targets.push(...(await findDeployedContractsAddress(DeployedContracts[AliasDeployedContracts.BribeFactoryUpgradeable_Proxy])));
  targets.push(...(await findDeployedContractsAddress(DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_1])));
  targets.push(...(await findDeployedContractsAddress(DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_2])));
  targets.push(...(await findDeployedContractsAddress(DeployedContracts[AliasDeployedContracts.GaugeFactoryUpgradeable_Proxy_3])));

  await logTx(UtilsProxy, UtilsProxy.multiUpgradeCall(targets));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

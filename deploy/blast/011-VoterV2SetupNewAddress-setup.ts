import {
  AliasDeployedContracts,
  deploy,
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

  const VoterUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.VoterUpgradeable,
    DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('bribeFactory', DeployedContracts[AliasDeployedContracts.BribeFactoryUpgradeable_Proxy]),
  );

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('v2GaugeFactory', DeployedContracts[AliasDeployedContracts.GaugeFactory_V2Pools_Proxy]),
  );

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('v3GaugeFactory', DeployedContracts[AliasDeployedContracts.GaugeFactory_V3Pools_Proxy]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

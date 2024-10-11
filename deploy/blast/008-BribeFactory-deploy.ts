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
  const ProxyAdmin = await getProxyAdminAddress();

  const Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.BribeFactoryUpgradeable_Implementation],
    admin: ProxyAdmin,
    saveAlias: AliasDeployedContracts.BribeFactoryUpgradeable_Proxy,
    verify: true,
  });

  const BribeFactoryUpgradeable_Proxy = await ethers.getContractAt(InstanceName.BribeFactoryUpgradeable, Proxy.target);
  await logTx(
    BribeFactoryUpgradeable_Proxy,
    BribeFactoryUpgradeable_Proxy.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.BribeUpgradeable_Implementation],
    ),
  );
  await logTx(
    BribeFactoryUpgradeable_Proxy,
    BribeFactoryUpgradeable_Proxy.pushDefaultRewardToken(DeployedContracts[AliasDeployedContracts.Fenix]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

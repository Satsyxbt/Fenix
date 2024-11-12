import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTransaction,
  logTx,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();

  const Tasks = [
    {
      contract: InstanceName.VotingEscrowUpgradeable,
      saveAlias: AliasDeployedContracts.VotingEscrowUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.VotingEscrowUpgradeable_Proxy,
    },
    {
      contract: InstanceName.ManagedNFTManagerUpgradeable,
      saveAlias: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy,
    },
    {
      contract: InstanceName.VoterUpgradeable,
      saveAlias: AliasDeployedContracts.VoterUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.VoterUpgradeable_Proxy,
    },
  ];

  for await (const task of Tasks) {
    await deployNewImplementationAndUpgradeProxy({
      implementationName: task.contract,
      deployer: deployer,
      implementationConstructorArguments: [BlastGovernor],
      implementationSaveAlias: task.saveAlias,
      proxyAddress: DeployedContracts[task.proxyTarget],
      proxyAdmin: ProxyAdmin,
      verify: true,
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

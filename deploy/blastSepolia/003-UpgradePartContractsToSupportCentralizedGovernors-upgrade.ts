import {
  AliasDeployedContracts,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const Tasks = [
    {
      contract: InstanceName.BribeFactoryUpgradeable,
      saveAlias: AliasDeployedContracts.BribeFactoryUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.BribeFactoryUpgradeable_Proxy,
    },
    {
      contract: InstanceName.FenixRaiseUpgradeable,
      saveAlias: AliasDeployedContracts.FenixRaiseUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.FenixRaiseUpgradeable_Proxy,
    },
    {
      contract: InstanceName.MinterUpgradeable,
      saveAlias: AliasDeployedContracts.MinterUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.MinterUpgradeable_Proxy,
    },
    {
      contract: InstanceName.VeBoostUpgradeable,
      saveAlias: AliasDeployedContracts.VeBoostUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.VeArtProxyUpgradeable_Proxy,
    },
    {
      contract: InstanceName.VeFnxDistributorUpgradeable,
      saveAlias: AliasDeployedContracts.VeFnxDistributorUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.VeFnxDistributorUpgradeable_Proxy,
    },
    {
      contract: InstanceName.VeFnxSplitMerklAidropUpgradeable,
      saveAlias: AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Proxy,
    },
    {
      contract: InstanceName.VoterUpgradeableV1_2,
      saveAlias: AliasDeployedContracts.VoterUpgradeableV1_2_Implementation,
      proxyTarget: AliasDeployedContracts.VoterUpgradeable_Proxy,
    },
    {
      contract: InstanceName.VotingEscrowUpgradeableV1_2,
      saveAlias: AliasDeployedContracts.VotingEscrowUpgradeableV1_2_Implementation,
      proxyTarget: AliasDeployedContracts.VotingEscrowUpgradeableV1_2_Proxy,
    },
    {
      contract: InstanceName.PairFactoryUpgradeable,
      saveAlias: AliasDeployedContracts.PairFactoryUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.PairFactoryUpgradeable_Proxy,
    },
    {
      contract: InstanceName.FeesVaultFactoryUpgradeable,
      saveAlias: AliasDeployedContracts.FeesVaultFactoryUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy,
    },
    {
      contract: InstanceName.PerpetualsGaugeUpgradeable,
      saveAlias: AliasDeployedContracts.PerpetualsGaugeUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.PerpetualsGaugeUpgradeable_Proxy,
    },
    {
      contract: InstanceName.PerpetualsTradersRewarderUpgradeable,
      saveAlias: AliasDeployedContracts.PerpetualsTradersRewarderUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.PerpetualsTradersRewarderUpgradeable_Proxy,
    },
    {
      contract: InstanceName.AlgebraFNXPriceProviderUpgradeable,
      saveAlias: AliasDeployedContracts.AlgebraFNXPriceProviderUpgradeable_Implementation,
      proxyTarget: AliasDeployedContracts.AlgebraFNXPriceProviderUpgradeable_Proxy,
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

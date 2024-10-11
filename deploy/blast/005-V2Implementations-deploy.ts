import { AliasDeployedContracts, deploy, getBlastGovernorAddress } from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();

  const BlastGovernor = await getBlastGovernorAddress();

  const Tasks = [
    {
      contract: InstanceName.BribeFactoryUpgradeable,
      saveAlias: AliasDeployedContracts.BribeFactoryUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.BribeUpgradeable,
      saveAlias: AliasDeployedContracts.BribeUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.GaugeFactoryUpgradeable,
      saveAlias: AliasDeployedContracts.GaugeFactoryUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.GaugeUpgradeable,
      saveAlias: AliasDeployedContracts.GaugeUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.MinterUpgradeable,
      saveAlias: AliasDeployedContracts.MinterUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.FenixRaiseUpgradeable,
      saveAlias: AliasDeployedContracts.FenixRaiseUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.VeBoostUpgradeable,
      saveAlias: AliasDeployedContracts.VeBoostUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.VeFnxDistributorUpgradeable,
      saveAlias: AliasDeployedContracts.VeFnxDistributorUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.VeFnxSplitMerklAidropUpgradeable,
      saveAlias: AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.VoterUpgradeable,
      saveAlias: AliasDeployedContracts.VoterUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.VotingEscrowUpgradeable,
      saveAlias: AliasDeployedContracts.VotingEscrowUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.Pair,
      saveAlias: AliasDeployedContracts.Pair_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.PerpetualsGaugeUpgradeable,
      saveAlias: AliasDeployedContracts.PerpetualsGaugeUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.PerpetualsTradersRewarderUpgradeable,
      saveAlias: AliasDeployedContracts.PerpetualsTradersRewarderUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.AlgebraFNXPriceProviderUpgradeable,
      saveAlias: AliasDeployedContracts.AlgebraFNXPriceProviderUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.MinimalLinearVestingUpgradeable,
      saveAlias: AliasDeployedContracts.MinimalLinearVestingUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.SingelTokenVirtualRewarderUpgradeable,
      saveAlias: AliasDeployedContracts.SingelTokenVirtualRewarderUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.CompoundVeFNXManagedNFTStrategyUpgradeable,
      saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
      saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.RouterV2PathProviderUpgradeable,
      saveAlias: AliasDeployedContracts.RouterV2PathProviderUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.ManagedNFTManagerUpgradeable,
      saveAlias: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
    {
      contract: InstanceName.PairAPIUpgradeable,
      saveAlias: AliasDeployedContracts.PairAPIUpgradeable_Implementation,
      constructorArguments: [],
    },
    {
      contract: InstanceName.RewardAPIUpgradeable,
      saveAlias: AliasDeployedContracts.RewardAPIUpgradeable_Implementation,
      constructorArguments: [],
    },
    {
      contract: InstanceName.VeNFTAPIUpgradeable,
      saveAlias: AliasDeployedContracts.VeNFTAPIUpgradeable_Implementation,
      constructorArguments: [],
    },
    {
      contract: InstanceName.UtilsUpgradeable,
      saveAlias: AliasDeployedContracts.UtilsUpgradeable_Implementation,
      constructorArguments: [BlastGovernor],
    },
  ];

  for await (const task of Tasks) {
    await deploy({
      name: task.contract,
      deployer: deployer,
      constructorArguments: task.constructorArguments,
      saveAlias: task.saveAlias,
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

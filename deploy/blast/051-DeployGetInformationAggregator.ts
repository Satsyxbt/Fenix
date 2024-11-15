import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
  deploy,
  upgradeProxy,
  deployNewImplementationAndUpgradeProxy,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
import { GetInformationAddressKey } from '../../utils/Constants';
import { GetInformationAggregatorUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();

  // let ProxyAdmin = await deploy({
  //   name: InstanceName.ProxyAdmin,
  //   deployer: deployer,
  //   constructorArguments: [],
  //   saveAlias: AliasDeployedContracts.GetInformationAggregatorUpgradeable_ProxyAdmin,
  //   verify: true,
  // });

  // let GetInformationAggregatorUpgradeable_Implementation = await deploy({
  //   name: InstanceName.GetInformationAggregatorUpgradeable,
  //   deployer: deployer,
  //   constructorArguments: [],
  //   saveAlias: AliasDeployedContracts.GetInformationAggregatorUpgradeable_Implementation,
  //   verify: true,
  // });

  // let GetInformationAggregatorUpgradeable_Proxy = await deployProxy({
  //   deployer: deployer,
  //   logic: GetInformationAggregatorUpgradeable_Implementation.target.toString(),
  //   admin: ProxyAdmin.target.toString(),
  //   saveAlias: AliasDeployedContracts.GetInformationAggregatorUpgradeable_Proxy,
  //   verify: true,
  // });

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.GetInformationAggregatorUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [],
    implementationSaveAlias: AliasDeployedContracts.GetInformationAggregatorUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.GetInformationAggregatorUpgradeable_Proxy],
    proxyAdmin: DeployedContracts[AliasDeployedContracts.GetInformationAggregatorUpgradeable_ProxyAdmin],
    verify: true,
  });

  // await logTx(
  //   Instance,
  //   Instance.updateAddress(
  //     [
  //       GetInformationAddressKey.MANAGED_NFT_MANAGER,
  //       GetInformationAddressKey.PAIR_FACTORY,
  //       GetInformationAddressKey.VOTER,
  //       GetInformationAddressKey.VOTING_ESCROW,
  //     ],
  //     [
  //       DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
  //       DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
  //       DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
  //       DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
  //     ],
  //   ),
  // );
  // let Instance = (await ethers.getContractAt(
  //   InstanceName.GetInformationAggregatorUpgradeable,
  //   '0x00Cb611513C13F86903021379a99c567b34bDD87', //GetInformationAggregatorUpgradeable_Proxy.target,
  // )) as GetInformationAggregatorUpgradeable;

  // let rawResult = (await Instance.getGeneralVotesPerEpoch(
  //   1731542400 - 86400 * 7,
  //   ethers.parseEther('2250000'),
  //   100,
  //   0,
  // )) as GetInformationAggregatorUpgradeable.PoolsEpochVoteInfoGeneralStruct;

  // const result = {
  //   poolsCount: rawResult.poolsCount.toString(),
  //   totalWeightsPerEpoch: rawResult.totalWeightsPerEpoch.toString(),
  //   totalWeightsPerEpochFormatted: ethers.formatEther(rawResult.totalWeightsPerEpoch),
  //   epoch: rawResult.epoch.toString(),
  //   emisisonPerEpoch: rawResult.emisisonPerEpoch.toString(),
  //   emissionPerEpochFormatted: ethers.formatEther(rawResult.emisisonPerEpoch),
  //   poolsEpochVoteInfo: rawResult.poolsEpochVoteInfo.map((pool: any) => ({
  //     name: pool.name,
  //     pool: pool.pool,
  //     gauge: pool.gauge,
  //     weightsPerEpoch: pool.weightsPerEpoch.toString(),
  //     emissionToGauge: pool.emissionToGauge.toString(),
  //     weightsPerEpochFormatted: ethers.formatEther(pool.weightsPerEpoch),
  //     emissionToGaugeFormatted: ethers.formatEther(pool.emissionToGauge),
  //     gaugeState: {
  //       rewardRate: pool.gaugeState.rewardRate.toString(),
  //       rewardRateFormatted: ethers.formatEther(pool.gaugeState.rewardRate),
  //       rewardForDuration: pool.gaugeState.rewardForDuration.toString(),
  //       rewardForDurationFormatted: ethers.formatEther(pool.gaugeState.rewardForDuration),
  //     },
  //     internalBribe: {
  //       bribe: pool.internalBribe.bribe,
  //       totalSupply: pool.internalBribe.totalSupply.toString(),
  //       totalSupplyFormatted: ethers.formatEther(pool.internalBribe.totalSupply),
  //     },
  //     externalBribe: {
  //       bribe: pool.externalBribe.bribe,
  //       totalSupply: pool.externalBribe.totalSupply.toString(),
  //       totalSupplyFormatted: ethers.formatEther(pool.externalBribe.totalSupply),
  //     },
  //   })),
  // };

  // console.log(JSON.stringify(result, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

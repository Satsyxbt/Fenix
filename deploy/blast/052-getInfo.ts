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
import fs from 'fs';

import { InstanceName } from '../../utils/Names';
import { GetInformationAddressKey } from '../../utils/Constants';
import { GetInformationAggregatorUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();

  let Instance = (await ethers.getContractAt(
    InstanceName.GetInformationAggregatorUpgradeable,
    '0x00Cb611513C13F86903021379a99c567b34bDD87', //GetInformationAggregatorUpgradeable_Proxy.target,
  )) as GetInformationAggregatorUpgradeable;
  let CURRENT_EPOCH = '1731542400';
  let PREVIUS_EPOCH = 1731542400;
  let rawResult = (await Instance.getGeneralVotesPerEpoch(
    1731542400,
    ethers.parseEther('2283750'),
    200,
    0,
  )) as GetInformationAggregatorUpgradeable.PoolsEpochVoteInfoGeneralStruct;

  const result = {
    createdAt: new Date().toUTCString(),
    poolsCount: rawResult.poolsCount.toString(),
    totalWeightsPerEpoch: rawResult.totalWeightsPerEpoch.toString(),
    totalWeightsPerEpochFormatted: ethers.formatEther(rawResult.totalWeightsPerEpoch),
    epoch: rawResult.epoch.toString(),
    emisisonPerEpoch: rawResult.emisisonPerEpoch.toString(),
    emissionPerEpochFormatted: ethers.formatEther(rawResult.emisisonPerEpoch),
    poolsEpochVoteInfo: rawResult.poolsEpochVoteInfo.map((pool: any) => ({
      name: pool.name,
      pool: pool.pool,
      gauge: pool.gauge,
      weightsPerEpoch: pool.weightsPerEpoch.toString(),
      emissionToGauge: pool.emissionToGauge.toString(),
      weightsPerEpochFormatted: ethers.formatEther(pool.weightsPerEpoch),
      emissionToGaugeFormatted: ethers.formatEther(pool.emissionToGauge),
      gaugeState: {
        rewardRate: pool.gaugeState.rewardRate.toString(),
        rewardRateFormatted: ethers.formatEther(pool.gaugeState.rewardRate),
        rewardForDuration: pool.gaugeState.rewardForDuration.toString(),
        rewardForDurationFormatted: ethers.formatEther(pool.gaugeState.rewardForDuration),
      },
      internalBribe: {
        bribe: pool.internalBribe.bribe,
        totalSupply: pool.internalBribe.totalSupply.toString(),
        totalSupplyFormatted: ethers.formatEther(pool.internalBribe.totalSupply),
      },
      externalBribe: {
        bribe: pool.externalBribe.bribe,
        totalSupply: pool.externalBribe.totalSupply.toString(),
        totalSupplyFormatted: ethers.formatEther(pool.externalBribe.totalSupply),
      },
    })),
  };
  fs.writeFileSync('./temp/GENERAL_CURRENT_EPOCH.json', JSON.stringify(result, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

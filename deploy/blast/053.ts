import { ethers } from 'hardhat';
import fs from 'fs';
import { getDeployedContractsAddressList } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
import { GetInformationAggregatorUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();

  let Instance = (await ethers.getContractAt(
    InstanceName.GetInformationAggregatorUpgradeable,
    '0x00Cb611513C13F86903021379a99c567b34bDD87', // GetInformationAggregatorUpgradeable_Proxy.target,
  )) as GetInformationAggregatorUpgradeable;

  let CURRENT_EPOCH = '1731542400';
  let PREVIUS_EPOCH = 1731542400;
  const totalTokens = 1800;
  const batchSize = 50;
  const epoch = 1731542400;
  const limit = 200; // Assuming you use a limit parameter in each contract call
  let offset = 0;
  let allResults = [];

  while (offset < totalTokens) {
    const tokenIds = [];
    for (let i = 0; i < batchSize && offset + i < totalTokens; i++) {
      tokenIds.push(offset + i + 1); // tokenIds from 1 to 2000
    }

    console.log(`Fetching data for token IDs: ${tokenIds[0]} to ${tokenIds[tokenIds.length - 1]}`);
    let rawResult = (await Instance.getTokenIdsVotesPerEpoch(
      tokenIds,
      epoch,
      limit,
      0,
    )) as GetInformationAggregatorUpgradeable.TokenVotesPerEpochStruct[];

    const formattedResult = rawResult.map((voteInfo: any) => ({
      tokenId: voteInfo.tokenId.toString(),
      currentOwner: voteInfo.currentOwner.toString(),
      exists: voteInfo.exists.toString(),
      isPermanentLocked: voteInfo.isPermanentLocked.toString(),
      end: voteInfo.end.toString(),
      isAttached: voteInfo.isAttached.toString(),
      isManagedNft: voteInfo.isManagedNFT.toString(),
      currentEpochTokenVotePower: voteInfo.currentEpochTokenVotePower.toString(),
      sumWeightFromBribe: voteInfo.sumWeightFromBribe.toString(),
      lastVotedTimestamp: voteInfo.lastVotedTimestamp.toString(),
      lastVotedTimestampFormatted: new Date(Number(voteInfo.lastVotedTimestamp) * 1000).toUTCString(),
      votes: voteInfo.votes.map((vote: any) => ({
        pool: vote.pool,
        weight: vote.weight.toString(),
        totalWeight: vote.totalWeight.toString(),
      })),
    }));

    allResults = allResults.concat(formattedResult);
    offset += batchSize;
  }

  // Save all results to a file
  fs.writeFileSync('./temp/VOTES_CURRENT_EPOCH.json', JSON.stringify(allResults, null, 2));
  console.log('All token vote data has been saved to tokenVotesPerEpoch.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

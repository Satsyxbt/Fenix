import state_votes_of_tokens_previus_epoch from './VOTES_CURRENT_EPOCH.json';
import state_votes_previus_epoch from './GENERAL_CURRENT_EPOCH.json';
import { ethers } from 'hardhat';
import fs from 'fs';

function getTotalWeightsFromVotes() {
  let sum = 0n;
  state_votes_of_tokens_previus_epoch.forEach((t) => {
    if (t.exists === 'true') {
      t.votes.forEach((j) => {
        sum += BigInt(j.weight);
      });
    }
  });
  return { fromVotes: sum, fromVoterWeightTotal: state_votes_previus_epoch.totalWeightsPerEpoch };
}

function getTotalWeightsPerPoolFromVotes() {
  let poolToTotalWeights: any = {};
  state_votes_of_tokens_previus_epoch.forEach((t) => {
    if (t.exists === 'true') {
      t.votes.forEach((j) => {
        if (poolToTotalWeights[j.pool]) {
          poolToTotalWeights[j.pool].weightFromVotes += BigInt(j.weight);
        } else {
          poolToTotalWeights[j.pool] = {};
          poolToTotalWeights[j.pool].weightFromVotes = BigInt(j.weight);
        }
      });
    }
  });

  state_votes_previus_epoch.poolsEpochVoteInfo.forEach((t) => {
    if (BigInt(t.weightsPerEpoch) > 0n || BigInt(t.externalBribe.totalSupply) > 0) {
      if (!poolToTotalWeights[t.pool]) {
        poolToTotalWeights[t.pool] = {};
        poolToTotalWeights[t.pool].weightFromVotes = '0';
      }
      poolToTotalWeights[t.pool].weightFromVoter = t.weightsPerEpoch;
      poolToTotalWeights[t.pool].weightFromBribe = t.externalBribe.totalSupply;

      if (
        poolToTotalWeights[t.pool].weightFromVoter != poolToTotalWeights[t.pool].weightFromBribe ||
        poolToTotalWeights[t.pool].weightFromVoter != poolToTotalWeights[t.pool].weightFromVotes
      ) {
        poolToTotalWeights[t.pool].withProblem = true;
      }
    }
  });

  return poolToTotalWeights;
}

function getDiffFromGeneral() {
  let sum: bigint = 0n;
  let sumFromBribes: bigint = 0n;
  let diffFromVoterToBribe: any = {};

  state_votes_previus_epoch.poolsEpochVoteInfo.forEach((t) => {
    sum += BigInt(t.weightsPerEpoch);
    sumFromBribes += BigInt(t.internalBribe.totalSupply);

    if (BigInt(t.weightsPerEpoch) != BigInt(t.internalBribe.totalSupply)) {
      diffFromVoterToBribe[t.pool] = {};

      diffFromVoterToBribe[t.pool].diffWeightFromVoterToBribe = 0n;
      diffFromVoterToBribe[t.pool].diffWeightFromVoterToBribeFormatted = '0';
      if (BigInt(t.weightsPerEpoch) > BigInt(t.internalBribe.totalSupply)) {
        diffFromVoterToBribe[t.pool].diffWeightFromVoterToBribe =
          'Voter -' + (BigInt(t.weightsPerEpoch) - BigInt(t.internalBribe.totalSupply));

        diffFromVoterToBribe[t.pool].diffWeightFromVoterToBribeFormatted = ethers.formatEther(
          BigInt(t.weightsPerEpoch) - BigInt(t.internalBribe.totalSupply),
        );
      } else if (BigInt(t.weightsPerEpoch) < BigInt(t.internalBribe.totalSupply)) {
        diffFromVoterToBribe[t.pool].diffWeightFromVoterToBribe =
          'Voter +' + (BigInt(t.internalBribe.totalSupply) - BigInt(t.weightsPerEpoch));
        diffFromVoterToBribe[t.pool].diffWeightFromVoterToBribeFormatted = ethers.formatEther(
          BigInt(t.internalBribe.totalSupply) - BigInt(t.weightsPerEpoch),
        );
      }
    }
  });

  return { sum, sumFromBribes, diffFromVoterToBribe, diffFromVoterToBribeLength: Object.keys(diffFromVoterToBribe).length };
}

function checkInternalAndExternalBribes() {
  let diff: string[] = [];

  state_votes_previus_epoch.poolsEpochVoteInfo.forEach((t) => {
    if (BigInt(t.externalBribe.totalSupply) != BigInt(t.internalBribe.totalSupply)) {
      diff.push('Diff', t.pool, 'bribes:', t.externalBribe.bribe, '-', t.internalBribe.bribe);
    }
  });
  return diff;
}

function votesPowerDiffFromSumWeight() {
  let diff: any = {};
  let sumWeightsTokensInBribesByOwner: any = {};

  state_votes_of_tokens_previus_epoch.forEach((t) => {
    if (BigInt(t.currentEpochTokenVotePower) != BigInt(t.sumWeightFromBribe) && BigInt(t.sumWeightFromBribe) > 0n) {
      diff[t.tokenId] = {};
      diff[t.tokenId].currentEpochTokenVotePower = t.currentEpochTokenVotePower;
      diff[t.tokenId].sumWeightFromBribe = t.sumWeightFromBribe;
      diff[t.tokenId].isManagedNft = t.isManagedNft;
      diff[t.tokenId].currentOwner = t.currentOwner;
      if (!sumWeightsTokensInBribesByOwner[t.currentOwner]) {
        sumWeightsTokensInBribesByOwner[t.currentOwner] = {};
        sumWeightsTokensInBribesByOwner[t.currentOwner].tokens = [];
        sumWeightsTokensInBribesByOwner[t.currentOwner].tokensVotingPowerSum = 0n;
        sumWeightsTokensInBribesByOwner[t.currentOwner].bribesWeightSum = 0n;
      }
      sumWeightsTokensInBribesByOwner[t.currentOwner].tokens.push(t.tokenId);
      sumWeightsTokensInBribesByOwner[t.currentOwner].tokensVotingPowerSum += BigInt(t.currentEpochTokenVotePower);
      sumWeightsTokensInBribesByOwner[t.currentOwner].bribesWeightSum += BigInt(t.sumWeightFromBribe);
    }
  });
  return { diff, sumWeightsTokensInBribesByOwner };
}

function getSumFromVotes() {
  let sumsManagedNftTokenVotePower = 0n;
  let sumsManagedNftWeightsFromBribes = 0n;
  let sumsNotManagedNftTokenVotePower = 0n;
  let sumsNotManagedNftWeightsFromBribes = 0n;
  let sumsWithIgnoreFirstNFTVotePower = 0n;
  let sumsWithIgnoreFirstNFTWeightFromBribes = 0n;

  state_votes_of_tokens_previus_epoch.forEach((t) => {
    if (t.isManagedNft == 'true') {
      sumsManagedNftWeightsFromBribes += BigInt(t.sumWeightFromBribe);
      sumsManagedNftTokenVotePower += BigInt(t.currentEpochTokenVotePower);
    } else {
      sumsNotManagedNftWeightsFromBribes += BigInt(t.sumWeightFromBribe);
      sumsNotManagedNftTokenVotePower += BigInt(t.currentEpochTokenVotePower);
    }

    if (t.tokenId != '1') {
      sumsWithIgnoreFirstNFTVotePower += BigInt(t.currentEpochTokenVotePower);
      sumsWithIgnoreFirstNFTWeightFromBribes += BigInt(t.sumWeightFromBribe);
    }
  });
  return {
    sumsManagedNftTokenVotePower,
    sumsManagedNftWeightsFromBribes,
    sumsNotManagedNftWeightsFromBribes,
    sumsNotManagedNftTokenVotePower,
    sumsWithIgnoreFirstNFTVotePower,
    sumsWithIgnoreFirstNFTWeightFromBribes,
    sumsManagedNftTokenVotePowerFormatted: ethers.formatEther(sumsManagedNftTokenVotePower),
    sumsManagedNftWeightsFromBribesFormatted: ethers.formatEther(sumsManagedNftWeightsFromBribes),
    sumsNotManagedNftWeightsFromBribesFormatted: ethers.formatEther(sumsNotManagedNftWeightsFromBribes),
    sumsNotManagedNftTokenVotePowerFormmated: ethers.formatEther(sumsNotManagedNftTokenVotePower),
    sumsWithIgnoreFirstNFTVotePowerFormatted: ethers.formatEther(sumsWithIgnoreFirstNFTVotePower),
    sumsWithIgnoreFirstNFTWeightFromBribesFormatted: ethers.formatEther(sumsWithIgnoreFirstNFTWeightFromBribes),
  };
}
async function main() {
  let result: any = {};
  result.fromVotesSums = getSumFromVotes();
  result.fromVotesTotalWeights = getTotalWeightsFromVotes();

  result.fromVotesPoolToTotalWeights = getTotalWeightsPerPoolFromVotes();
  result.fromGeneralDiff = getDiffFromGeneral();
  result.fromVotesTotalWeights.fromExternalBribesSum = result.fromGeneralDiff.sumFromBribes;
  result.fromVotesTotalWeights.fromVoterWeightPerEpochSum = result.fromGeneralDiff.sum;

  result.checkInternalAndExternalBribes = checkInternalAndExternalBribes();
  result.votesPowerDiffFromSumWeight = votesPowerDiffFromSumWeight();
  fs.writeFileSync(
    './temp/result_current_epoch.json',
    JSON.stringify(result, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

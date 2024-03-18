import { getDeployedDataFromDeploys } from './utils';
import {
  BribeFactoryUpgradeable,
  BribeUpgradeable,
  FeesVaultFactory,
  FeesVaultUpgradeable,
  Fenix,
  GaugeFactoryUpgradeable,
  GaugeUpgradeable,
  MerklGaugeMiddleman,
  MinterUpgradeable,
  Pair,
  PairFactoryUpgradeable,
  VeArtProxyUpgradeable,
  VeFnxDistributorUpgradeable,
  VoterUpgradeable,
  VotingEscrowUpgradeable,
} from '../typechain-types';

async function logFenix(fenix: Fenix) {
  console.log(`Fenix token ERC20 (${fenix.target}):
  \tTotalSupply:\t${await fenix.totalSupply()}
  \tDecimals:\t ${await fenix.decimals()}
  \tSymbol:\t${await fenix.symbol()}
  \tName:\t${await fenix.name()}
  \tOwner:\t${await fenix.owner()}
  `);
}

async function logMinter(minter: MinterUpgradeable) {
  console.log(`Minter (${minter.target}):
  \tfenix:\t${await minter.fenix()}
  \tvoter:\t${await minter.voter()}
  \tve:\t${await minter.ve()}
  \tteamRate:\t${await minter.teamRate()}
  \tweekly:\t${await minter.weekly()}
  \tactive_period:\t${await minter.active_period()}
  \tlastInflationPeriod:\t${await minter.lastInflationPeriod()}
  \tinflationPeriodCount:\t${await minter.inflationPeriodCount()}
  \tinflationRate:\t${await minter.inflationRate()}
  \tdecayRate:\t${await minter.decayRate()}
  \tisStarted:\t${await minter.isStarted()}
  \tisFirstMint:\t${await minter.isFirstMint()}
  -- Functions
  \tcirculating_supply:\t${await minter.circulating_supply()}
  \tcirculating_emission:\t${await minter.circulating_emission()}
  \tcalculate_emission_decay:\t${await minter.calculate_emission_decay()}
  \tcalculate_emission_inflation:\t${await minter.calculate_emission_inflation()}
  \tweekly_emission:\t${await minter.weekly_emission()}
  \tperiod:\t${await minter.period()}
  \tcheck:\t${await minter.check()}
  `);
}

async function logVotingEscrow(votingEscrow: VotingEscrowUpgradeable) {
  console.log(`VotingEscrow (${votingEscrow.target}):
    \ttoken:\t${await votingEscrow.token()}
    \tvoter:\t${await votingEscrow.voter()}
    \tteam:\t${await votingEscrow.team()}
    \tartProxy:\t${await votingEscrow.artProxy()}
    \tveBoost:\t${await votingEscrow.veBoost()}
    \tname:\t${await votingEscrow.name()}
    \tsymbol:\t${await votingEscrow.symbol()}
    \tsupply:\t${await votingEscrow.supply()}
    \tepoch:\t${await votingEscrow.epoch()}
    -- Functions
    \ttotalSupply:\t${await votingEscrow.totalSupply()}
    \ttotalTokens:\t${await votingEscrow.totalTokens()}
    \ttotalTokensMinted:\t${await votingEscrow.totalTokensMinted()}
    \ttotalTokensBurned:\t${await votingEscrow.totalTokensBurned()}
  `);
}

async function logVoter(voter: VoterUpgradeable) {
  console.log(`VoterUpgradeable (${voter.target}):
    \t_ve:\t${await voter._ve()}
    \tbribefactory:\t${await voter.bribefactory()}
    \tminter:\t${await voter.minter()}
    \tadmin:\t${await voter.admin()}
    \tgovernance:\t${await voter.governance()}
    \tVOTE_DELAY:\t${await voter.VOTE_DELAY()}
    -- Pools
    \tpools:\t${await voter.poolsList()}
    \tclPools:\t${await voter.clPoolsList()}
    -- Factories
    \tfactories:\t${await voter.factories()}
    \tgaugeFactories:\t${await voter.gaugeFactories()}
    -- Indexes and Weights
    \ttotalWeight:\t${await voter.totalWeight()}
  `);
}

async function logBribeFactoryUpgradeable(bribeFactory: BribeFactoryUpgradeable) {
  console.log(`BribeFactoryUpgradeable (${bribeFactory.target}):
    \tlast_bribe:\t${await bribeFactory.last_bribe()}
    \tvoter:\t${await bribeFactory.voter()}
    \tbribeImplementation:\t${await bribeFactory.bribeImplementation()}
    \tdefaultBlastGovernor:\t${await bribeFactory.defaultBlastGovernor()}
    -- Owner
    \towner:\t${await bribeFactory.owner()}
    \tbribeOwner:\t${await bribeFactory.bribeOwner()}
  `);
}

async function logPairFactoryUpgradeable(pairFactory: PairFactoryUpgradeable) {
  console.log(`PairFactoryUpgradeable (${pairFactory.target}):
    \timplementation:\t${await pairFactory.implementation()}
    \tisPaused:\t${await pairFactory.isPaused()}
    \tisPublicPoolCreationMode:\t${await pairFactory.isPublicPoolCreationMode()}
    \tprotocolFee:\t${await pairFactory.protocolFee()}
    \tstableFee:\t${await pairFactory.stableFee()}
    \tvolatileFee:\t${await pairFactory.volatileFee()}
    \tcommunityVaultFactory:\t${await pairFactory.communityVaultFactory()}
    \tdefaultBlastGovernor:\t${await pairFactory.defaultBlastGovernor()}
    -- Fees
    \tMAX_FEE:\t${await pairFactory.MAX_FEE()}
    \tPRECISION:\t${await pairFactory.PRECISION()}
    -- Pairs
    \tallPairsLength:\t${await pairFactory.allPairsLength()}
  `);
}

async function logMerklGaugeMiddleman(merklGaugeMiddleman: MerklGaugeMiddleman) {
  console.log(`MerklGaugeMiddleman (${merklGaugeMiddleman.target}):
    \ttoken:\t${await merklGaugeMiddleman.token()}
    \tmerklDistributionCreator:\t${await merklGaugeMiddleman.merklDistributionCreator()}
  `);
}

async function logFeesVaultFactory(feesVaultFactory: FeesVaultFactory) {
  console.log(`FeesVaultFactory (${feesVaultFactory.target}):
    \tvoter:\t${await feesVaultFactory.voter()}
    \tdefaultBlastGovernor:\t${await feesVaultFactory.defaultBlastGovernor()}
    \timplementation:\t${await feesVaultFactory.implementation()}
  `);
}

async function main() {
  let deploysData = await getDeployedDataFromDeploys();

  await logFenix(deploysData.Fenix);

  await logMinter(deploysData.Minter);

  await logVotingEscrow(deploysData.VotingEscrow);

  await logVoter(deploysData.Voter);

  await logBribeFactoryUpgradeable(deploysData.BribeFactory);

  await logPairFactoryUpgradeable(deploysData.PairFactory);

  await logMerklGaugeMiddleman(deploysData.MerklGaugeMiddleman);

  await logFeesVaultFactory(deploysData.FeesVaultFactory);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

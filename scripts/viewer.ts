import { getDeployedDataFromDeploys, getDeploysData } from './utils';
import {
  AlgebraFNXPriceProviderUpgradeable,
  BribeFactoryUpgradeable,
  FeesVaultFactoryUpgradeable,
  Fenix,
  GaugeFactoryUpgradeable,
  IBlastMock,
  MerklGaugeMiddleman,
  MinterUpgradeable,
  PairFactoryUpgradeable,
  VeBoostUpgradeable,
  VeFnxDistributorUpgradeable,
  VoterUpgradeable,
  VotingEscrowUpgradeable,
} from '../typechain-types';
import { ethers } from 'hardhat';

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
    \tdefaultBlastPoints:\t${await pairFactory.defaultBlastPoints()}
    \tdefaultBlastPointsOperator:\t${await pairFactory.defaultBlastPointsOperator()}
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
    \towner:\t${await merklGaugeMiddleman.owner()}
  `);
}

async function logFeesVaultFactory(feesVaultFactory: FeesVaultFactoryUpgradeable) {
  console.log(`FeesVaultFactory (${feesVaultFactory.target}):
    \tvoter:\t${await feesVaultFactory.voter()}
    \tdefaultBlastGovernor:\t${await feesVaultFactory.defaultBlastGovernor()}
    \tdefaultBlastPoints:\t${await feesVaultFactory.defaultBlastPoints()}
    \tdefaultBlastPointsOperator:\t${await feesVaultFactory.defaultBlastPointsOperator()}
    \timplementation:\t 0x5CAD868fb930d733B407211a1F15D65635964A19
  `);
}
async function logAlgebraFNXPriceProviderUpgradeable(algebraFNXPriceProvider: AlgebraFNXPriceProviderUpgradeable) {
  console.log(`AlgebraFNXPriceProviderUpgradeable (${algebraFNXPriceProvider.target}):
    \tONE_USD:\t${await algebraFNXPriceProvider.ONE_USD()}
    \tFNX:\t${await algebraFNXPriceProvider.FNX()}
    \tUSD:\t${await algebraFNXPriceProvider.USD()}
    \tpool:\t${await algebraFNXPriceProvider.pool()}
    -- Functions
    \tcurrentTick:\t${await algebraFNXPriceProvider.currentTick()}
    \tgetUsdToFNXPrice:\t${await algebraFNXPriceProvider.getUsdToFNXPrice()}
  `);
}
async function logVeBoostUpgradeable(veBoost: VeBoostUpgradeable) {
  console.log(`VeBoostUpgradeable (${veBoost.target}):
      \tfenix:\t${await veBoost.fenix()}
      \tvotingEscrow:\t${await veBoost.votingEscrow()}
      \tpriceProvider:\t${await veBoost.priceProvider()}
      \tminUSDAmount:\t${await veBoost.minUSDAmount()}
      \tminLockedTime:\t${await veBoost.getMinLockedTimeForBoost()}
      \tboostFNXPercentage:\t${await veBoost.getBoostFNXPercentage()}
      \towner:\t${await veBoost.owner()}
      -- Calculations
      \tminFNXAmountForBoost:\t${await veBoost.getMinFNXAmountForBoost()}
      \tavailableBoostFNXAmount:\t${await veBoost.getAvailableBoostFNXAmount()}
      -- Reward Tokens
      \trewardTokens:\t${await veBoost.rewardTokens()},
      
  `);
}

async function logVeFnxDistributorUpgradeable(veFnxDistributor: VeFnxDistributorUpgradeable) {
  console.log(`VeFnxDistributorUpgradeable (${veFnxDistributor.target}):
    \tfenix:\t${await veFnxDistributor.fenix()}
    \tvotingEscrow:\t${await veFnxDistributor.votingEscrow()}
    \towner:\t${await veFnxDistributor.owner()}
  `);
}

async function logGaugeFactoryUpgradeable(gaugeFactory: GaugeFactoryUpgradeable) {
  console.log(`GaugeFactoryUpgradeable (${gaugeFactory.target}):
    \tlast_gauge:\t${await gaugeFactory.last_gauge()}
    \tvoter:\t${await gaugeFactory.voter()}
    \towner:\t${await gaugeFactory.owner()}
    \tgauge_owner:\t${await gaugeFactory.gaugeOwner()}
    \tdefaultBlastGovernor:\t${await gaugeFactory.defaultBlastGovernor()}
    \tgaugeImplementation:\t${await gaugeFactory.gaugeImplementation()}
    \tmerklGaugeMiddleman:\t${await gaugeFactory.merklGaugeMiddleman()}
  `);
}

async function logBlast(deploysData: any, blast: IBlastMock) {
  console.log(`\nBlast`);

  let keys = Object.keys(deploysData);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    console.log(
      `- ${key}\t${deploysData[key]}\t${await blast.governorMap(deploysData[key])}\t${await blast.readGasParams(deploysData[key])}`,
    );
  }
}

async function main() {
  let deploysData = await getDeployedDataFromDeploys();
  let data = await getDeploysData();

  let blast = (await ethers.getContractAt('IBlastMock', '0x4300000000000000000000000000000000000002')) as any as IBlastMock;
  await logBlast(data, blast);

  await logFenix(deploysData.Fenix);

  await logMinter(deploysData.Minter);

  await logVotingEscrow(deploysData.VotingEscrow);

  await logVoter(deploysData.Voter);

  await logBribeFactoryUpgradeable(deploysData.BribeFactory);

  await logPairFactoryUpgradeable(deploysData.PairFactory);

  await logMerklGaugeMiddleman(deploysData.MerklGaugeMiddleman);

  await logFeesVaultFactory(deploysData.FeesVaultFactory);

  //await logVeBoostUpgradeable(await ethers.getContractAt('VeBoostUpgradeable', data['VeBoost']));

  // await logAlgebraFNXPriceProviderUpgradeable(
  //   await ethers.getContractAt('AlgebraFNXPriceProviderUpgradeable', data['AlgebraFNXPriceProvider']),
  // );

  await logVeFnxDistributorUpgradeable(deploysData.VeFnxDistributor);

  await logGaugeFactoryUpgradeable(deploysData.GaugeFactoryType);

  await logGaugeFactoryUpgradeable(deploysData.GaugeFactoryType2);

  await logGaugeFactoryUpgradeable(deploysData.GaugeFactoryType3);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

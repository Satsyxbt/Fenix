import { Pair, PairFactoryUpgradeable } from '../typechain-types';

type PairFactoryState = {
  protocolFee: bigint;
  stableFee: bigint;
  volatilityFee: bigint;
  implementation: string;
  communityVaultFactory: string;
  rebasingTokensGovernor: string;
  defaultBlastGovernor: string;
  defaultBlastPoints: string;
  defaultBlastPointsOperator: string;
  isPaused: boolean;
  isPublicPoolCreationMode: boolean;
  pairs: string[];
  allPairsLength: bigint;
  protocolFeePercent: string;
  stableFeePercent: string;
  volatilityFeePercent: string;
};

export async function getPairs(pairFactory: PairFactoryUpgradeable): Promise<string[]> {
  return pairFactory.pairs();
}

export async function getPairFactoryState(pairFactory: PairFactoryUpgradeable): Promise<PairFactoryState> {
  const [
    protocolFee,
    stableFee,
    volatilityFee,
    implementation,
    communityVaultFactory,
    rebasingTokensGovernor,
    isPaused,
    isPublicPoolCreationMode,
    allPairsLength,
    pairs,
    defaultBlastGovernor,
    defaultBlastPoints,
    defaultBlastPointsOperator,
  ] = await Promise.all([
    pairFactory.protocolFee(),
    pairFactory.stableFee(),
    pairFactory.volatileFee(),
    pairFactory.implementation(),
    pairFactory.communityVaultFactory(),
    pairFactory.rebasingTokensGovernor(),
    pairFactory.isPaused(),
    pairFactory.isPublicPoolCreationMode(),
    pairFactory.allPairsLength(),
    pairFactory.pairs(),
    pairFactory.defaultBlastGovernor(),
    pairFactory.defaultBlastPoints(),
    pairFactory.defaultBlastPointsOperator(),
  ]);

  return {
    protocolFee,
    stableFee,
    volatilityFee,
    implementation,
    communityVaultFactory,
    rebasingTokensGovernor,
    isPaused,
    isPublicPoolCreationMode,
    pairs,
    allPairsLength,
    defaultBlastGovernor,
    defaultBlastPoints,
    defaultBlastPointsOperator,
    protocolFeePercent: Number(protocolFee) / 100 + '%',
    stableFeePercent: Number(stableFee) / 100 + '%',
    volatilityFeePercent: Number(volatilityFee) / 100 + '%',
  };
}

interface PairProtocolFeeState {
  pairAddress: string;
  protocolFee: bigint;
  protocolFeePercent: string;
  isCustom: boolean;
}

export async function getPairsProtocolFeesState(
  pairFactory: PairFactoryUpgradeable,
  pairs: string[],
): Promise<{ standardProtocolFee: bigint; standardProtocolFeePercent: string; pairsFees: PairProtocolFeeState[] }> {
  const standardProtocolFee = BigInt((await pairFactory.protocolFee()).toString());

  const pairsFeesPromises = pairs.map(async (pair) => {
    const customFee = await pairFactory.getProtocolFee(pair);
    const isCustom = customFee !== standardProtocolFee;

    return {
      pairAddress: pair,
      protocolFee: customFee,
      protocolFeePercent: Number(customFee) / 100 + '%',
      isCustom,
    };
  });

  const pairsFees = await Promise.all(pairsFeesPromises);

  return {
    standardProtocolFee,
    standardProtocolFeePercent: Number(standardProtocolFee) / 100 + '%',
    pairsFees,
  };
}

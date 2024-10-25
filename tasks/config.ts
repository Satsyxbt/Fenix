import 'dotenv/config';
interface ChainConfig {
  algebraTheGraph: string;
}

interface ChainsConfig {
  [key: string]: ChainConfig;
}

const chains: ChainsConfig = {
  ['blast']: {
    algebraTheGraph: process.env.BLAST_ALGEBRA_THE_GRAPH || '',
  },
  ['blastSepolia']: {
    algebraTheGraph: process.env.BLAST_SEPOLIA_ALGEBRA_THE_GRAPH || '',
  },
};

export default {
  'extract-abis-to-docs': {
    output: 'docs/abi',
    minAbiFragmentsToInclude: 2,
    skipPatterns: [
      'mocks',
      'interfaces',
      '@openzeppelin',
      '@cryptoalgebra',
      'libraries',
      'IBaseV1Pair',
      'IBlast',
      'IWETH',
      'Math',
      'erc20',
      'BribeProxy',
      'GaugeProxy',
      'FenixVaultProxy',
      'StrategyProxy',
    ],
  },
  'get-state': {
    output: 'docs/state',
    chains: chains,
  },
};

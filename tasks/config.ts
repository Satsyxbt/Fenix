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
};

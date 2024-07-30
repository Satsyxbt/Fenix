module.exports = {
  norpc: true,
  compileCommand: 'npm run compile',
  skipFiles: [
    'mocks',
    'bribes/interfaces',
    'gauges/interfaces',
    'core/interfaces',
    'integration/interfaces',
    'utils/interfaces',
    'dexV2/interfaces',
    'fees/interfaces',
    'nest/interfaces',
  ],
  configureYulOptimizer: true,
  providerOptions: {
    default_balance_ether: '10000000000000000000000000',
  },
};

module.exports = {
  norpc: true,
  testCommand: 'npm test',
  compileCommand: 'npm run compile',
  skipFiles: ['mocks'],
  configureYulOptimizer: true,
  providerOptions: {
    default_balance_ether: '10000000000000000000000000',
  },
};

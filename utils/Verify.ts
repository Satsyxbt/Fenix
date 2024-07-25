import hre from 'hardhat';

export const verify = async (contract: string, constructorArguments?: any[], skipTimeout?: boolean, timeoutDelay?: number) => {
  console.log(`Verifying TransparentUpgradeableProxy at ${contract}...`);

  function t(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  if (skipTimeout || true) {
    console.log(`Timeout for 10s before verify proccess...`);
    await t(timeoutDelay || 10000);
  }

  return hre.run('verify:verify', {
    address: contract,
    constructorArguments: constructorArguments || [],
  });
};

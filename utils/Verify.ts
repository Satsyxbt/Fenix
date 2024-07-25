import hre from 'hardhat';

export const verify = async (contract: string, constructorArguments?: any[]) => {
  console.log(`\tVerifying TransparentUpgradeableProxy at ${contract}...`);
  return hre.run('verify:verify', {
    address: contract,
    constructorArguments: constructorArguments || [],
  });
};

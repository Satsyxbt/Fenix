import { deployERC20Mock, deployERC20Faucet } from '../utils';

async function main() {
  await deployERC20Faucet('fnUSDT', 'fnUSDT', 6);

  await deployERC20Faucet('fnTOK', 'fnTOK', 18);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

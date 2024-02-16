import { deployERC20Mock } from '../utils';

async function main() {
  await deployERC20Mock('TK18', 'TK18', 18);
  await deployERC20Mock('TK9', 'TK9', 18);
  await deployERC20Mock('TK6', 'TK6', 18);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

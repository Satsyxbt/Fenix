import { deployBase, getDeploysData } from './utils';
import hre from 'hardhat';

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  await deployBase('MDCBlastMock', 'MDCBlastMock');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

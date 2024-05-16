import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { getConfig } from './networksConfig';
import { ZERO_ADDRESS } from '../test/utils/constants';

async function main() {
  const { chainId } = await hre.ethers.provider.getNetwork();
  const [deployer] = await hre.ethers.getSigners();

  let Config = getConfig(chainId);

  console.log(`Start deploy script
  \t-- with config: ${JSON.stringify(Config)}
  \t-- chainId: ${chainId}
  \t-- deployer: ${deployer.address}, Native balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} 
  `);

  const deployDataPath = path.resolve(__dirname, './deployment/' + Config.FILE);
  let deploysData = JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));

  const RouterV2 = await hre.ethers.deployContract('RouterV2', [
    Config.MODE_SFS,
    Config.SFS_ASSIGN_NFT_ID,
    deploysData.PairFactory,
    Config.WETH,
  ]);
  await RouterV2.waitForDeployment();

  console.log('RouterV2 deployed to:', RouterV2.target);

  console.log(`\nFinish deploy
  \t-- deployer: ${deployer.address}, Native balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} `);

  deploysData.RouterV2 = RouterV2.target;
  fs.writeFileSync(deployDataPath, JSON.stringify(deploysData), 'utf-8');
  console.log(`\nSave to ${deployDataPath}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

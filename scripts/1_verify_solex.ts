import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { getConfig } from './networksConfig';

async function main() {
  const { chainId } = await hre.ethers.provider.getNetwork();
  let Config = getConfig(chainId);
  const [deployer] = await hre.ethers.getSigners();

  const deployDataPath = path.resolve(__dirname, './deployment/' + Config.FILE);
  let deploysData = JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));
  await hre.run('verify:verify', {
    address: deploysData.Solex,
    constructorArguments: [Config.MODE_SFS, deployer.address],
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

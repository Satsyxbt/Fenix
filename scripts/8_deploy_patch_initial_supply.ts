import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { getConfig } from './networksConfig';

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

  const MinterUpgradeable = await hre.ethers.deployContract('MinterUpgradeable');
  await MinterUpgradeable.waitForDeployment();
  console.log('MinterUpgradeable deployed to:', MinterUpgradeable.target);

  deploysData.MinterImplementation = MinterUpgradeable.target;

  const Minter = await hre.ethers.getContractAt('MinterUpgradeable', deploysData.Minter);

  const ProxyAdmin = await hre.ethers.getContractAt('ProxyAdmin', deploysData.ProxyAdmin);
  await ProxyAdmin.upgrade(Minter.target, deploysData.MinterImplementation);

  console.log(`Upgrade Minter ${Minter.target} to new implementation: ${deploysData.MinterImplementation}`);

  await Minter.patchInitialSupply();

  console.log('Pathched total supply');

  console.log(`\nFinish deploy
  \t-- deployer: ${deployer.address}, Native balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} `);

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

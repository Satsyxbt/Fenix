import { ethers } from 'hardhat';
import { getDeploysData, saveDeploysData } from './utils';
import { deployBase } from './utils';
import hre from 'hardhat';
import { FenixRaiseUpgradeable } from '../typechain-types';

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  let usdb = await hre.ethers.deployContract('ERC20Faucet', ['fnxUSDB', 'fnxUSDB', 18]);
  console.log('fnxUSDB deployed', usdb.target);
  await usdb.waitForDeployment();
  await usdb.mint(deployer.address, ethers.parseEther('1000000'));

  let implementation = await hre.ethers.deployContract('FenixRaiseUpgradeable');
  await implementation.waitForDeployment();
  console.log('FenixRaiseUpgradeable implementation deployed', implementation.target);

  let proxy = await hre.ethers.deployContract('TransparentUpgradeableProxy', [
    implementation.target,
    '0x9502993595815b1Fa674C5133F42C3919a696bEc',
    '0x',
  ]);
  await proxy.waitForDeployment();
  console.log('Proxy FenixRaiseUpgradeable implementation deployed', proxy.target);

  let instance = (await hre.ethers.getContractAt('FenixRaiseUpgradeable', proxy.target)) as FenixRaiseUpgradeable;

  await instance.initialize(deployer.address, usdb.target, deployer.address);

  await instance.setTimestamps(1719397229, 1719425229, 1719625229);

  await instance.setDepositCaps(ethers.parseEther('100000'), ethers.parseEther('100'), ethers.parseEther('20'));
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

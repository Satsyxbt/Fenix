import { ethers } from 'hardhat';
import { deployBase, deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';
import { PerpetualsGaugeUpgradeable, PerpetualsTradersRewarderUpgradeable, VoterUpgradeable } from '../typechain-types';
import { ZERO_ADDRESS } from '../test/utils/constants';

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let data = getDeploysData();

  let ProxyAdmin = data['ProxyAdmin'];

  await deployBase('BribeFactoryUpgradeable', 'BribeFactoryImplementation');
  await deployBase('BribeUpgradeable', 'BribeImplementation');

  data = getDeploysData();

  let BribeFactoryUpgradeable = await ethers.getContractAt('BribeFactoryUpgradeable', data['BribeFactory']);
  await BribeFactoryUpgradeable.changeImplementation(data['BribeImplementation']);

  let Admin = await ethers.getContractAt('ProxyAdmin', ProxyAdmin);
  await Admin.upgrade(BribeFactoryUpgradeable.target, data['BribeFactoryImplementation']);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

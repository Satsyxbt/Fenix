import { ethers } from 'hardhat';
import { deployBase, deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';
import { PerpetualsGaugeUpgradeable, PerpetualsTradersRewarderUpgradeable, VoterUpgradeable } from '../typechain-types';
import { ZERO_ADDRESS } from '../test/utils/constants';

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let data = getDeploysData();

  let ProxyAdmin = data['ProxyAdmin'];

  await deployBase('PairAPIUpgradeable', 'PairAPIUpgradeableImplementation');
  await deployBase('RewardAPIUpgradeable', 'RewardAPIUpgradeableImplementation');
  await deployBase('VeNFTAPIUpgradeable', 'VeNFTAPIUpgradeableImplementation');

  data = getDeploysData();

  await deployProxy(ProxyAdmin, data['PairAPIUpgradeableImplementation'], 'PairAPI');
  await deployProxy(ProxyAdmin, data['RewardAPIUpgradeableImplementation'], 'RewardAPI');
  await deployProxy(ProxyAdmin, data['VeNFTAPIUpgradeableImplementation'], 'VeNFTAPI');

  data = getDeploysData();

  let PairAPI = await ethers.getContractAt('PairAPIUpgradeable', data['PairAPI']);
  await PairAPI.initialize(data['Voter']);

  let RewardAPI = await ethers.getContractAt('RewardAPIUpgradeable', data['RewardAPI']);
  await RewardAPI.initialize(data['Voter']);

  let VeNFTAPI = await ethers.getContractAt('VeNFTAPIUpgradeable', data['VeNFTAPI']);
  await VeNFTAPI.initialize(data['Voter']);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

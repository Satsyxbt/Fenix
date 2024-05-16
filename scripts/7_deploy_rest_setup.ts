import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { getConfig } from './networksConfig';
import { ZERO_ADDRESS } from '../test/utils/constants';

const V3_POOL_FACTORY = '0xCF0A6C7cf979Ab031DF787e69dfB94816f6cB3c9';
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

  const Solex = await hre.ethers.getContractAt('Solex', deploysData.Solex);
  const Minter = await hre.ethers.getContractAt('MinterUpgradeable', deploysData.Minter);
  const VeArtProxy = await hre.ethers.getContractAt('VeArtProxyUpgradeable', deploysData.VeArtProxy);
  const Voter = await hre.ethers.getContractAt('VoterUpgradeable', deploysData.Voter);
  const VotingEscrow = await hre.ethers.getContractAt('VotingEscrowUpgradeable', deploysData.VotingEscrow);
  const VeTokenDistributor = await hre.ethers.getContractAt('VeTokenDistributorUpgradeable', deploysData.VeTokenDistributor);
  const BribeFactory = await hre.ethers.getContractAt('BribeFactoryUpgradeable', deploysData.BribeFactory);
  const GaugeFactoryType = await hre.ethers.getContractAt('GaugeFactoryUpgradeable', deploysData.GaugeFactoryType);
  const GaugeFactoryType2 = await hre.ethers.getContractAt('GaugeFactoryUpgradeable', deploysData.GaugeFactoryType2);
  const GaugeFactoryType3 = await hre.ethers.getContractAt('GaugeFactoryUpgradeable', deploysData.GaugeFactoryType3);
  const PairFactory = await hre.ethers.getContractAt('PairFactoryUpgradeable', deploysData.PairFactory);
  const FeesVaultFactoryV2 = await hre.ethers.getContractAt('FeesVaultFactoryUpgradeable', deploysData.FeesVaultFactoryV2);
  const FeesVaultFactoryV3 = await hre.ethers.getContractAt('FeesVaultFactoryUpgradeable', deploysData.FeesVaultFactoryV3);

  console.log('  await Solex.transferOwnership(Minter.target);  ');
  await Solex.transferOwnership(Minter.target);

  console.log('  await VotingEscrow.setVoter(Voter.target)');
  await VotingEscrow.setVoter(Voter.target);

  console.log(' await Voter.setMinter(Minter.target);');
  await Voter.setMinter(Minter.target);

  console.log(' await PairFactory.grantRole(await PairFactory.PAIRS_ADMINISTRATOR_ROLE(), deployer.address);');
  await PairFactory.grantRole(await PairFactory.PAIRS_ADMINISTRATOR_ROLE(), deployer.address);

  console.log('  await PairFactory.grantRole(await PairFactory.PAIRS_CREATOR_ROLE(), deployer.address);');
  await PairFactory.grantRole(await PairFactory.PAIRS_CREATOR_ROLE(), deployer.address);

  console.log('  await PairFactory.grantRole(await PairFactory.FEES_MANAGER_ROLE(), deployer.address);');
  await PairFactory.grantRole(await PairFactory.FEES_MANAGER_ROLE(), deployer.address);

  console.log(' await PairFactory.setIsPublicPoolCreationMode(true);');
  await PairFactory.setIsPublicPoolCreationMode(true);

  console.log('  await PairFactory.setProtocolFee(1000);');
  await PairFactory.setProtocolFee(1000);

  console.log('  await FeesVaultFactoryV2.grantRole(await FeesVaultFactoryV2.CLAIM_FEES_CALLER_ROLE(), deployer.address);');
  await FeesVaultFactoryV2.grantRole(await FeesVaultFactoryV2.CLAIM_FEES_CALLER_ROLE(), deployer.address);

  console.log('   await FeesVaultFactoryV2.grantRole(await FeesVaultFactoryV2.FEES_VAULT_ADMINISTRATOR_ROLE(), deployer.address);');
  await FeesVaultFactoryV2.grantRole(await FeesVaultFactoryV2.FEES_VAULT_ADMINISTRATOR_ROLE(), deployer.address);

  console.log('  await FeesVaultFactoryV2.grantRole(await FeesVaultFactoryV2.WHITELISTED_CREATOR_ROLE(), PairFactory.target);');
  await FeesVaultFactoryV2.grantRole(await FeesVaultFactoryV2.WHITELISTED_CREATOR_ROLE(), PairFactory.target);

  console.log('   await FeesVaultFactoryV3.grantRole(await FeesVaultFactoryV3.CLAIM_FEES_CALLER_ROLE(), deployer.address);');
  await FeesVaultFactoryV3.grantRole(await FeesVaultFactoryV3.CLAIM_FEES_CALLER_ROLE(), deployer.address);

  console.log('   await FeesVaultFactoryV3.grantRole(await FeesVaultFactoryV3.FEES_VAULT_ADMINISTRATOR_ROLE(), deployer.address);');
  await FeesVaultFactoryV3.grantRole(await FeesVaultFactoryV3.FEES_VAULT_ADMINISTRATOR_ROLE(), deployer.address);

  console.log('    await FeesVaultFactoryV3.grantRole(await FeesVaultFactoryV3.WHITELISTED_CREATOR_ROLE(), V3_POOL_FACTORY);');
  await FeesVaultFactoryV3.grantRole(await FeesVaultFactoryV3.WHITELISTED_CREATOR_ROLE(), V3_POOL_FACTORY);

  console.log('   await Voter.addFactory(V3_POOL_FACTORY, GaugeFactoryType2.target);');
  await Voter.addFactory(V3_POOL_FACTORY, GaugeFactoryType2.target);

  console.log('   await Voter.addFactory(V3_POOL_FACTORY, GaugeFactoryType3.target);');
  await Voter.addFactory(V3_POOL_FACTORY, GaugeFactoryType3.target);

  console.log(`\nFinish deploy
  \t-- deployer: ${deployer.address}, Native balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} `);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

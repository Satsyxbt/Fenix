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

  const MinterUpgradeable = await hre.ethers.deployContract('MinterUpgradeable');
  await MinterUpgradeable.waitForDeployment();
  console.log('MinterUpgradeable deployed to:', MinterUpgradeable.target);

  const VeArtProxyUpgradeable = await hre.ethers.deployContract('VeArtProxyUpgradeable');
  await VeArtProxyUpgradeable.waitForDeployment();
  console.log('VeArtProxyUpgradeable deployed to:', VeArtProxyUpgradeable.target);

  const VoterUpgradeable = await hre.ethers.deployContract('VoterUpgradeable');
  await VoterUpgradeable.waitForDeployment();
  console.log('VoterUpgradeable deployed to:', VoterUpgradeable.target);

  const VotingEscrowUpgradeable = await hre.ethers.deployContract('VotingEscrowUpgradeable');
  await VotingEscrowUpgradeable.waitForDeployment();
  console.log('VotingEscrowUpgradeable deployed to:', VotingEscrowUpgradeable.target);

  const VeTokenDistributorUpgradeable = await hre.ethers.deployContract('VeTokenDistributorUpgradeable');
  await VeTokenDistributorUpgradeable.waitForDeployment();
  console.log('VeTokenDistributorUpgradeable deployed to:', VeTokenDistributorUpgradeable.target);

  const BribeFactoryUpgradeable = await hre.ethers.deployContract('BribeFactoryUpgradeable');
  await BribeFactoryUpgradeable.waitForDeployment();
  console.log('BribeFactoryUpgradeable deployed to:', BribeFactoryUpgradeable.target);

  const BribeUpgradeable = await hre.ethers.deployContract('BribeUpgradeable');
  await BribeUpgradeable.waitForDeployment();
  console.log('BribeUpgradeable deployed to:', BribeUpgradeable.target);

  const GaugeFactoryUpgradeable = await hre.ethers.deployContract('GaugeFactoryUpgradeable');
  await GaugeFactoryUpgradeable.waitForDeployment();
  console.log('GaugeFactoryUpgradeable deployed to:', GaugeFactoryUpgradeable.target);

  const GaugeUpgradeable = await hre.ethers.deployContract('GaugeUpgradeable');
  await GaugeUpgradeable.waitForDeployment();
  console.log('GaugeUpgradeable deployed to:', GaugeUpgradeable.target);

  const PairFactoryUpgradeable = await hre.ethers.deployContract('PairFactoryUpgradeable');
  await PairFactoryUpgradeable.waitForDeployment();
  console.log('PairFactoryUpgradeable deployed to:', PairFactoryUpgradeable.target);

  const Pair = await hre.ethers.deployContract('Pair');
  await Pair.waitForDeployment();
  console.log('Pair deployed to:', Pair.target);

  const FeesVaultUpgradeable = await hre.ethers.deployContract('FeesVaultUpgradeable');
  await FeesVaultUpgradeable.waitForDeployment();
  console.log('FeesVaultUpgradeable deployed to:', FeesVaultUpgradeable.target);

  const FeesVaultFactoryUpgradeable = await hre.ethers.deployContract('FeesVaultFactoryUpgradeable');
  await FeesVaultFactoryUpgradeable.waitForDeployment();
  console.log('FeesVaultFactoryUpgradeable deployed to:', FeesVaultFactoryUpgradeable.target);

  const AlgebraTokenPriceProviderUpgradeable = await hre.ethers.deployContract('AlgebraTokenPriceProviderUpgradeable');
  await AlgebraTokenPriceProviderUpgradeable.waitForDeployment();
  console.log('AlgebraTokenPriceProviderUpgradeable deployed to:', AlgebraTokenPriceProviderUpgradeable.target);

  const VeBoostUpgradeable = await hre.ethers.deployContract('VeBoostUpgradeable');
  await VeBoostUpgradeable.waitForDeployment();
  console.log('VeBoostUpgradeable deployed to:', VeBoostUpgradeable.target);

  console.log(`\nFinish deploy
  \t-- deployer: ${deployer.address}, Native balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} `);

  const deployDataPath = path.resolve(__dirname, './deployment/' + Config.FILE);
  let deploysData = JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));
  deploysData.MinterImplementation = MinterUpgradeable.target;
  deploysData.VeArtProxyImplementation = VeArtProxyUpgradeable.target;
  deploysData.VoterImplementation = VoterUpgradeable.target;
  deploysData.VotingEscrowImplementation = VotingEscrowUpgradeable.target;
  deploysData.VeTokenDistributorImplementation = VeTokenDistributorUpgradeable.target;
  deploysData.BribeFactoryImplementation = BribeFactoryUpgradeable.target;
  deploysData.BribeImplementation = BribeUpgradeable.target;
  deploysData.GaugeFactoryImplementation = GaugeFactoryUpgradeable.target;
  deploysData.GaugeImplementation = GaugeUpgradeable.target;
  deploysData.PairFactoryImplementation = PairFactoryUpgradeable.target;
  deploysData.PairImplementation = Pair.target;
  deploysData.FeesVaultImplementation = FeesVaultUpgradeable.target;
  deploysData.FeesVaultFactoryImplementation = FeesVaultFactoryUpgradeable.target;
  deploysData.AlgebraTokenPriceProviderImplementation = AlgebraTokenPriceProviderUpgradeable.target;
  deploysData.VeBoostImplementation = VeBoostUpgradeable.target;

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

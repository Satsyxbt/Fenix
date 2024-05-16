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
  const ProxyAdmin = deploysData.ProxyAdmin;

  let arrayForVerify = [
    [deploysData.Minter, deploysData.MinterImplementation],
    [deploysData.VeArtProxy, deploysData.VeArtProxyImplementation],
    [deploysData.Voter, deploysData.VoterImplementation],
    [deploysData.VotingEscrow, deploysData.VotingEscrowImplementation],
    [deploysData.VeTokenDistributor, deploysData.VeTokenDistributorImplementation],
    [deploysData.BribeFactory, deploysData.BribeFactoryImplementation],
    [deploysData.GaugeFactoryType, deploysData.GaugeFactoryImplementation],
    [deploysData.GaugeFactoryType2, deploysData.GaugeFactoryImplementation],
    [deploysData.GaugeFactoryType3, deploysData.GaugeFactoryImplementation],
    [deploysData.PairFactory, deploysData.PairFactoryImplementation],
    [deploysData.FeesVaultFactoryV2, deploysData.FeesVaultFactoryImplementation],
    [deploysData.FeesVaultFactoryV3, deploysData.FeesVaultFactoryImplementation],
    [deploysData.AlgebraTokenPriceProvider, deploysData.AlgebraTokenPriceProviderImplementation],
    [deploysData.VeBoost, deploysData.VeBoostImplementation],
  ];

  for await (const iterator of arrayForVerify) {
    await hre.run('verify:verify', {
      address: iterator[0],
      constructorArguments: [iterator[1], ProxyAdmin, '0x'],
    });
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

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

  let arrayForVerify = [
    deploysData.MinterImplementation,
    deploysData.VeArtProxyImplementation,
    deploysData.VoterImplementation,
    deploysData.VotingEscrowImplementation,
    deploysData.VeTokenDistributorImplementation,
    deploysData.BribeFactoryImplementation,
    deploysData.BribeImplementation,
    deploysData.GaugeFactoryImplementation,
    deploysData.GaugeImplementation,
    deploysData.PairFactoryImplementation,
    deploysData.PairImplementation,
    deploysData.FeesVaultImplementation,
    deploysData.FeesVaultFactoryImplementation,
    deploysData.AlgebraTokenPriceProviderImplementation,
    deploysData.VeBoostImplementation,
  ];

  for await (const iterator of arrayForVerify) {
    await hre.run('verify:verify', {
      address: iterator,
      constructorArguments: [],
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

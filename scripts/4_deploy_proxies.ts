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
  const ProxyAdmin = deploysData.ProxyAdmin;

  const factory = await hre.ethers.getContractFactory('TransparentUpgradeableProxy');

  let Minter = await factory.deploy(deploysData.MinterImplementation, ProxyAdmin, '0x');
  await Minter.waitForDeployment();
  console.log(`Minter proxie deploy to ${Minter.target}, implementation: ${deploysData.MinterImplementation}, proxyAdmin: ${ProxyAdmin}`);

  let VeArtProxy = await factory.deploy(deploysData.VeArtProxyImplementation, ProxyAdmin, '0x');
  await VeArtProxy.waitForDeployment();
  console.log(
    `VeArtProxy proxie deploy to ${VeArtProxy.target}, implementation: ${deploysData.VeArtProxyImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let Voter = await factory.deploy(deploysData.VoterImplementation, ProxyAdmin, '0x');
  await Voter.waitForDeployment();
  console.log(`Voter proxie deploy to ${Voter.target}, implementation: ${deploysData.VoterImplementation}, proxyAdmin: ${ProxyAdmin}`);

  let VotingEscrow = await factory.deploy(deploysData.VotingEscrowImplementation, ProxyAdmin, '0x');
  await VotingEscrow.waitForDeployment();
  console.log(
    `VotingEscrow proxie deploy to ${VotingEscrow.target}, implementation: ${deploysData.VotingEscrowImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let VeTokenDistributor = await factory.deploy(deploysData.VeTokenDistributorImplementation, ProxyAdmin, '0x');
  await VeTokenDistributor.waitForDeployment();
  console.log(
    `VeTokenDistributor proxie deploy to ${VeTokenDistributor.target}, implementation: ${deploysData.VeTokenDistributorImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let BribeFactory = await factory.deploy(deploysData.BribeFactoryImplementation, ProxyAdmin, '0x');
  await BribeFactory.waitForDeployment();
  console.log(
    `BribeFactory proxie deploy to ${BribeFactory.target}, implementation: ${deploysData.BribeFactoryImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let GaugeFactoryType = await factory.deploy(deploysData.GaugeFactoryImplementation, ProxyAdmin, '0x');
  await GaugeFactoryType.waitForDeployment();
  console.log(
    `GaugeFactoryType proxie deploy to ${GaugeFactoryType.target}, implementation: ${deploysData.GaugeFactoryImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let GaugeFactoryType2 = await factory.deploy(deploysData.GaugeFactoryImplementation, ProxyAdmin, '0x');
  await GaugeFactoryType2.waitForDeployment();
  console.log(
    `GaugeFactoryType2 proxie deploy to ${GaugeFactoryType2.target}, implementation: ${deploysData.GaugeFactoryImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let GaugeFactoryType3 = await factory.deploy(deploysData.GaugeFactoryImplementation, ProxyAdmin, '0x');
  await GaugeFactoryType3.waitForDeployment();
  console.log(
    `GaugeFactoryType3 proxie deploy to ${GaugeFactoryType3.target}, implementation: ${deploysData.GaugeFactoryImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let PairFactory = await factory.deploy(deploysData.PairFactoryImplementation, ProxyAdmin, '0x');
  await PairFactory.waitForDeployment();
  console.log(
    `PairFactory proxie deploy to ${PairFactory.target}, implementation: ${deploysData.PairFactoryImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let FeesVaultFactoryV2 = await factory.deploy(deploysData.FeesVaultFactoryImplementation, ProxyAdmin, '0x');
  await FeesVaultFactoryV2.waitForDeployment();
  console.log(
    `FeesVaultFactoryV2 proxie deploy to ${FeesVaultFactoryV2.target}, implementation: ${deploysData.FeesVaultFactoryImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let FeesVaultFactoryV3 = await factory.deploy(deploysData.FeesVaultFactoryImplementation, ProxyAdmin, '0x');
  await FeesVaultFactoryV3.waitForDeployment();
  console.log(
    `FeesVaultFactoryV3 proxie deploy to ${FeesVaultFactoryV3.target}, implementation: ${deploysData.FeesVaultFactoryImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let AlgebraTokenPriceProvider = await factory.deploy(deploysData.AlgebraTokenPriceProviderImplementation, ProxyAdmin, '0x');
  await AlgebraTokenPriceProvider.waitForDeployment();
  console.log(
    `AlgebraTokenPriceProvider proxie deploy to ${AlgebraTokenPriceProvider.target}, implementation: ${deploysData.AlgebraTokenPriceProviderImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  let VeBoost = await factory.deploy(deploysData.VeBoostImplementation, ProxyAdmin, '0x');
  await VeBoost.waitForDeployment();
  console.log(
    `VeBoost proxie deploy to ${VeBoost.target}, implementation: ${deploysData.VeBoostImplementation}, proxyAdmin: ${ProxyAdmin}`,
  );

  deploysData.Minter = Minter.target;
  deploysData.VeArtProxy = VeArtProxy.target;
  deploysData.Voter = Voter.target;
  deploysData.VotingEscrow = VotingEscrow.target;
  deploysData.VeTokenDistributor = VeTokenDistributor.target;
  deploysData.BribeFactory = BribeFactory.target;
  deploysData.GaugeFactoryType = GaugeFactoryType.target;
  deploysData.GaugeFactoryType2 = GaugeFactoryType2.target;
  deploysData.GaugeFactoryType3 = GaugeFactoryType3.target;

  deploysData.PairFactory = PairFactory.target;
  deploysData.FeesVaultFactoryV2 = FeesVaultFactoryV2.target;
  deploysData.FeesVaultFactoryV3 = FeesVaultFactoryV3.target;

  deploysData.AlgebraTokenPriceProvider = AlgebraTokenPriceProvider.target;
  deploysData.VeBoost = VeBoost.target;

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

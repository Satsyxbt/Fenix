import hre from 'hardhat';
import fs from 'fs';
import path from 'path';
import { getConfig } from './networksConfig';
import { ZERO_ADDRESS } from '../test/utils/constants';

async function main() {
  const { chainId } = await hre.ethers.provider.getNetwork();
  const [deployer] = await hre.ethers.getSigners();

  let Config = getConfig(chainId);

  console.log(`Start deploy script
  \t-- with config: ${JSON.stringify(Config)}
  \t-- chainId: ${chainId}
  \t-- deployer: ${deployer.address}, Native balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} 
  `);

  const MODE_SFS = Config.MODE_SFS;
  const SFS_ASSIGN_TOKEN_ID = Config.SFS_ASSIGN_NFT_ID!;

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

  await BribeFactory.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Voter.target, deploysData.BribeImplementation);

  console.log(
    `BribeFactory address: ${BribeFactory.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Voter.target,
    deploysData.BribeImplementation,
  );

  await GaugeFactoryType.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Voter.target, deploysData.GaugeImplementation, ZERO_ADDRESS);

  console.log(
    `GaugeFactoryType address: ${GaugeFactoryType.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Voter.target,
    deploysData.GaugeImplementation,
    ZERO_ADDRESS,
  );

  await GaugeFactoryType2.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Voter.target, deploysData.GaugeImplementation, ZERO_ADDRESS);
  console.log(
    `GaugeFactoryType2 address: ${GaugeFactoryType2.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Voter.target,
    deploysData.GaugeImplementation,
    ZERO_ADDRESS,
  );

  await GaugeFactoryType3.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Voter.target, deploysData.GaugeImplementation, ZERO_ADDRESS);
  console.log(
    `GaugeFactoryType3 address: ${GaugeFactoryType3.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Voter.target,
    deploysData.GaugeImplementation,
    ZERO_ADDRESS,
  );

  await PairFactory.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, deploysData.PairImplementation, FeesVaultFactoryV2.target);
  console.log(
    `PairFactory address: ${PairFactory.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    deploysData.PairImplementation,
    FeesVaultFactoryV2.target,
  );

  await VotingEscrow.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Solex.target, VeArtProxy.target);
  await VotingEscrow.checkpoint();

  console.log(
    `VotingEscrow address: ${VotingEscrow.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Solex.target,
    VeArtProxy.target,
  );

  await Minter.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Voter.target, VotingEscrow.target);
  console.log(
    `Minter address: ${Minter.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Voter.target,
    VotingEscrow.target,
  );

  await Voter.initialize(
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    VotingEscrow.target,
    PairFactory.target,
    GaugeFactoryType.target,
    BribeFactory.target,
  );
  console.log(
    `Voter address: ${Voter.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    VotingEscrow.target,
    PairFactory.target,
    GaugeFactoryType.target,
    BribeFactory.target,
  );
  await VeTokenDistributor.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Solex.target, VotingEscrow.target);
  console.log(
    `VeTokenDistributor address: ${VeTokenDistributor.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Solex.target,
    VotingEscrow.target,
  );

  await FeesVaultFactoryV2.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Voter.target, deploysData.FeesVaultImplementation, {
    toGaugeRate: 0,
    recipients: [deployer.address],
    rates: [10000],
  });

  console.log(
    `FeesVaultFactoryV2 address: ${FeesVaultFactoryV2.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Voter.target,
    deploysData.FeesVaultImplementation,
    {
      toGaugeRate: 0,
      recipients: [deployer.address],
      rates: [10000],
    },
  );

  await FeesVaultFactoryV3.initialize(MODE_SFS, SFS_ASSIGN_TOKEN_ID, Voter.target, deploysData.FeesVaultImplementation, {
    toGaugeRate: 0,
    recipients: [deployer.address],
    rates: [10000],
  });

  console.log(
    `FeesVaultFactoryV3 address: ${FeesVaultFactoryV3.target}
   -- initialized by:`,
    MODE_SFS,
    SFS_ASSIGN_TOKEN_ID,
    Voter.target,
    deploysData.FeesVaultImplementation,
    {
      toGaugeRate: 0,
      recipients: [deployer.address],
      rates: [10000],
    },
  );
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

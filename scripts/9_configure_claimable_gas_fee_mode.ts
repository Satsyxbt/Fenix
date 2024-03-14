import fs from 'fs';
import path from 'path';
import hre from 'hardhat';

const BLAST = '0x4300000000000000000000000000000000000002';

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const deployDataPath = path.resolve(__dirname, './deploys.json');
  let deploysData = JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));

  let blast = await hre.ethers.getContractAt('IBlastMock', BLAST);

  let keys = Object.keys(deploysData);

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const address = deploysData[key];
    console.log(`Check setuped governor address for ${key} - ${address}`);
    let g = await blast.governorMap(address);
    console.log(`-- Governor - ${g}`);

    if (g == deployer.address) {
      console.log(`---- Deployer is Governor`);
      let param = await blast.readGasParams(address);
      if (param[3] == BigInt(1)) {
        console.log(`---- Claimable GAS mode already seted`);
      } else {
        console.log(`---- Set Gas Claimable mode`);
        await blast.configureClaimableGasOnBehalf(address);
        console.log(`---- Success`);
      }
    } else {
      console.log(`-- Another Governor - SKIP`);
    }

    function timeout(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    await timeout(5000);
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

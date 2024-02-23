import fs from 'fs';
import path from 'path';
import hre from 'hardhat';

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const deployDataPath = path.resolve(__dirname, './deploys.json');
  let deploysData = JSON.parse(fs.readFileSync(deployDataPath, 'utf8'));
  let blast = await hre.ethers.getContractAt('IBlastMock', '0x4300000000000000000000000000000000000002');
  let keys = Object.keys(deploysData);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    console.log(`Check setuped governor address for ${key} - ${deploysData[key]}`);
    let g = await blast.governorMap(deploysData[key]);
    console.log(`-- Governor - ${g}`);

    if (g == deployer.address) {
      console.log(`---- is Deployer set claimable gas`);
      let param = await blast.readGasParams(deploysData[key]);
      if (param[3] == 1) {
        console.log(`---- Claimable already seted`);
      } else {
        console.log(`---- Set Gas Claimable`);
        await blast.configureClaimableGasOnBehalf(deploysData[key]);
      }
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

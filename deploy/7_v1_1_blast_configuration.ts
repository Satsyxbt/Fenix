import hre from 'hardhat';
import path from 'path';
import fs from 'fs';

import { getDeploysData } from './utils';
import { IBlastMock } from '../typechain-types';

const TARGET_BLAST_GOVERNOR = '0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4';
const BLAST = '0x4300000000000000000000000000000000000002';

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  let deploysData = await getDeploysData();

  let blast = (await hre.ethers.getContractAt('IBlastMock', BLAST)) as any as IBlastMock;
  let keys = Object.keys(deploysData);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const target = deploysData[key];
    console.log(`Check setuped governor address for ${key} - ${target}`);
    let g = await blast.governorMap(target);
    console.log(`-- Governor - ${g}`);
    console.log(`-- Deployer - ${deployer.address}`);

    if (g.toLowerCase() == deployer.address.toLowerCase()) {
      console.log(`---- the deployer is an authorized address set claimable gas`);
      await blast.configureContract(target, 2, 1, TARGET_BLAST_GOVERNOR);
      console.log(`--- seted params`);
      console.log(`gas: ${await blast.readGasParams(target)}, yield: ${await blast.readYieldConfiguration(target)}`);
    } else {
      console.log(`---- skip`);
    }
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

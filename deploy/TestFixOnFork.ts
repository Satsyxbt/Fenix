import { ethers } from 'hardhat';

import fs from 'fs';

import { mine, setCode } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { AliasDeployedContracts } from '../utils/Deploy';
import { InstanceName } from '../utils/Names';
import { VoterUpgradeableV2__factory } from '../typechain-types';
import { mockBlast } from '../test/utils/coreFixture';

async function main() {
  await mine();
  await mockBlast();
  let signer = await ethers.getImpersonatedSigner('0x0907fb24626a06e383BD289A0e9C8560b8cCC4b5');
  let CURRENT_EPOCH = 1731542400;

  let Voter = await ethers.getContractAt(InstanceName.VoterUpgradeable, '0x56129f1c0aED4aDBeE862986FAcE5Ba8c9aC3d9B');

  console.log('Before any actions');
  console.log('await Voter.totalWeightsPerEpoch(CURRENT_EPOCH)', await Voter.totalWeightsPerEpoch(CURRENT_EPOCH));

  let newImpl = await ethers.deployContract(InstanceName.VoterUpgradeable, [signer.address]);

  let ProxyAdmin = await ethers.getContractAt(InstanceName.ProxyAdmin, '0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5');
  await ProxyAdmin.connect(signer).upgrade(Voter.target, newImpl.target);

  await Voter.connect(signer).fixVotePower();

  console.log('AFTER FIXS');
  console.log('await Voter.totalWeightsPerEpoch(CURRENT_EPOCH)', await Voter.totalWeightsPerEpoch(CURRENT_EPOCH));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

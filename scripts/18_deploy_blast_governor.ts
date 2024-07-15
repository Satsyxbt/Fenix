import { ethers } from 'hardhat';
import { deployBase, deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';
import { PerpetualsGaugeUpgradeable, PerpetualsTradersRewarderUpgradeable, VoterUpgradeable } from '../typechain-types';
import { BLAST_PREDEPLOYED_ADDRESS, ZERO_ADDRESS } from '../test/utils/constants';

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let data = getDeploysData();

  let ProxyAdmin = data['ProxyAdmin'];

  await deployBase('BlastGovernorUpgradeable', 'BlastGovernorImplementation', [deployer.address]);

  data = getDeploysData();

  await deployProxy(ProxyAdmin, data['BlastGovernorImplementation'], 'BlastGovernor');

  data = getDeploysData();

  let BlastGovernor = await ethers.getContractAt('BlastGovernorUpgradeable', data['BlastGovernor']);
  await BlastGovernor.initialize();
  await BlastGovernor.grantRole(await BlastGovernor.GAS_HOLDER_ADDER_ROLE(), deployer.address);
  await BlastGovernor.grantRole(await BlastGovernor.GAS_WITHDRAWER_ROLE(), deployer.address);

  let Blast = await ethers.getContractAt('IBlastFull', BLAST_PREDEPLOYED_ADDRESS);
  await Blast.configureGovernorOnBehalf(BlastGovernor.target, data['BlastGovernorImplementation']);

  await BlastGovernor.addGasHolder(data['BlastGovernorImplementation']);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

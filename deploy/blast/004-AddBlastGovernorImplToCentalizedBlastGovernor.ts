import { AliasDeployedContracts, deploy, getBlastGovernorAddress, getDeployedContractAddress, logTx } from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();

  const BlastGovernor = await getBlastGovernorAddress();
  let Blast = await ethers.getContractAt('IBlastFull', THIRD_PART_CONTRACTS.Blast);
  let BlastGovernor_Proxy = await ethers.getContractAt('BlastGovernorUpgradeable', BlastGovernor);
  let ImplAddress = await getDeployedContractAddress(AliasDeployedContracts.BlastGovernorUpgradeable_Implementation);
  await logTx(Blast, Blast.configureGovernorOnBehalf(BlastGovernor_Proxy.target, ImplAddress));
  await logTx(BlastGovernor_Proxy, BlastGovernor_Proxy.addGasHolder(ImplAddress));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

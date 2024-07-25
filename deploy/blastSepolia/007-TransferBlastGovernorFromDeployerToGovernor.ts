import {
  AliasDeployedContracts,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTransaction,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const ProxyAdmin = await getProxyAdminAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const BlastGovernor = await ethers.getContractAt(InstanceName.BlastGovernorUpgradeable, await getBlastGovernorAddress());
  const Blast = await ethers.getContractAt(InstanceName.Blast, THIRD_PART_CONTRACTS.Blast);
  for (const [contractName, contractAddress] of Object.entries(DeployedContracts)) {
    const governor = await Blast.governorMap(contractAddress as string);
    if (governor.toLocaleLowerCase() == deployer.address.toLocaleLowerCase()) {
      console.log(`${contractName}(${contractAddress}) blast governor equal deployer(${deployer.address})`);
      console.log(`\tTransfer governor to blast centralized governor...`);
      await logTx(Blast, Blast.configureGovernorOnBehalf(BlastGovernor.target, contractAddress as string));
      console.log(`\tAdd contract to gas holders registry...`);
      await logTx(BlastGovernor, BlastGovernor.addGasHolder(contractAddress as string));
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

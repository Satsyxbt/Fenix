import { ethers } from 'hardhat';
import { AliasDeployedContracts, InstanceName } from '../utils/Names';
import { getBlastGovernorAddress, getDeployedContractsAddressList } from '../utils/Deploy';
import { pool } from '@cryptoalgebra/integral-core/typechain/contracts/interfaces';

async function main() {
  const DeployedContracts = await getDeployedContractsAddressList();

  let UtilsUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.UtilsUpgradeable,
    DeployedContracts[AliasDeployedContracts.UtilsUpgradeable_Proxy],
  );
  await UtilsUpgradeable_Proxy.multiUpgradeCall([]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

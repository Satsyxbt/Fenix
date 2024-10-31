import hre, { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy, getBlastGovernorAddress, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
import { getGauges } from '../../utils/Utils';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const BlastGovernor = await getBlastGovernorAddress();

  let gauges = await getGauges(hre);

  let rewarders = [
    '0x7eFbE8D78A0BE51A7386750B1529C14A94CE41B8',
    '0x6FB1256E3F3081AF1443b1A03F6EE459A75C5280',
    '0xdd3aAeDD5979181aE201115027bF6c61718FfaC5',
    '0x92522079d128ce22842a4433371F8563525412A8',
  ];
  const UtilsUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.UtilsUpgradeable,
    DeployedContracts[AliasDeployedContracts.UtilsUpgradeable_Proxy],
  );

  await logTx(UtilsUpgradeable_Proxy, UtilsUpgradeable_Proxy.multiUpgradeCall([...gauges, ...rewarders]));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

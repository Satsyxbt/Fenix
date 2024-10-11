import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let VeFnxDistributorUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.VeFnxDistributorUpgradeable_Implementation],
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.VeFnxDistributorUpgradeable_Proxy,
    verify: true,
  });

  let VeFnxDistributorUpgradeable = await ethers.getContractAt(
    InstanceName.VeFnxDistributorUpgradeable,
    VeFnxDistributorUpgradeable_Proxy.target,
  );
  await logTx(
    VeFnxDistributorUpgradeable,
    VeFnxDistributorUpgradeable.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.Fenix],
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

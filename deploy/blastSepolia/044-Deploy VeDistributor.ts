import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTransaction,
  logTx,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let VeFnxDistributorUpgradeable_Implementation = await deploy({
    deployer: deployer,
    name: InstanceName.VeFnxDistributorUpgradeable,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.VeFnxDistributorUpgradeable_Implementation,
    verify: true,
  });

  let instance = await deployProxy({
    saveAlias: AliasDeployedContracts.VeFnxDistributorUpgradeable_Proxy,
    admin: await getProxyAdminAddress(),
    logic: VeFnxDistributorUpgradeable_Implementation.target.toString(),
    deployer: deployer,
    verify: true,
  });

  let VeFnxDistributorUpgradeable = await ethers.getContractAt(InstanceName.VeFnxDistributorUpgradeable, instance.target);
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

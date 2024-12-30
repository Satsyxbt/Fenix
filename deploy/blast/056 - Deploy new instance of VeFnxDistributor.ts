import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();
  const TARGET_ADDRESS = '0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5';

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

  await logTx(
    VeFnxDistributorUpgradeable,
    VeFnxDistributorUpgradeable.grantRole(await VeFnxDistributorUpgradeable.DEFAULT_ADMIN_ROLE(), TARGET_ADDRESS),
  );

  await logTx(VeFnxDistributorUpgradeable, VeFnxDistributorUpgradeable.grantRole(ethers.id('DISTRIBUTOR_ROLE'), TARGET_ADDRESS));

  await logTx(VeFnxDistributorUpgradeable, VeFnxDistributorUpgradeable.grantRole(ethers.id('WITHDRAWER_ROLE'), TARGET_ADDRESS));

  await logTx(
    VeFnxDistributorUpgradeable,
    VeFnxDistributorUpgradeable.revokeRole(await VeFnxDistributorUpgradeable.DEFAULT_ADMIN_ROLE(), deployer),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

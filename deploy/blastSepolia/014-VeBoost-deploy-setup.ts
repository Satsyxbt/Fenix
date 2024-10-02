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

  let VeBoostUpgradeable_Implementation = await deploy({
    name: InstanceName.VeBoostUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.VeBoostUpgradeable_Implementation,
    constructorArguments: [BlastGovernor],
    verify: true,
  });

  let VeBoostUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: await VeBoostUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.VeBoostUpgradeable_Proxy,
    verify: true,
  });
  let VeBoostUpgradeable = await ethers.getContractAt(InstanceName.VeBoostUpgradeable, VeBoostUpgradeable_Proxy.target);
  await logTx(
    VeBoostUpgradeable,
    VeBoostUpgradeable.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.Fenix],
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.AlgebraFNXPriceProviderUpgradeable_Proxy],
    ),
  );
  let VotingEscrowUpgradeable = await ethers.getContractAt(
    InstanceName.VotingEscrowUpgradeable,
    DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
  );
  await logTx(VotingEscrowUpgradeable, VotingEscrowUpgradeable.updateAddress('veBoost', VeBoostUpgradeable.target));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

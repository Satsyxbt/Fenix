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
  const ProxyAdmin = await getProxyAdminAddress();

  let AlgebraFNXPriceProviderUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.AlgebraFNXPriceProviderUpgradeable_Implementation],
    admin: ProxyAdmin,
    saveAlias: AliasDeployedContracts.AlgebraFNXPriceProviderUpgradeable_Proxy,
    verify: true,
  });
  let AlgebraFNXPriceProviderUpgradeable = await ethers.getContractAt(
    InstanceName.AlgebraFNXPriceProviderUpgradeable,
    AlgebraFNXPriceProviderUpgradeable_Proxy.target,
  );

  await logTx(
    AlgebraFNXPriceProviderUpgradeable,
    AlgebraFNXPriceProviderUpgradeable.initialize(
      BlastGovernor,
      '0xb3B4484bdFb6885f96421c3399B666a1c9D27Fca',
      DeployedContracts[AliasDeployedContracts.Fenix],
      '0x4300000000000000000000000000000000000003',
    ),
  );

  let VeBoostUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.VeBoostUpgradeable_Implementation],
    admin: ProxyAdmin,
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
      AlgebraFNXPriceProviderUpgradeable_Proxy.target,
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

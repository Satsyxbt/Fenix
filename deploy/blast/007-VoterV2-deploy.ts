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
import { Roles } from '../../utils/Roles';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();
  const ProxyAdmin = await getProxyAdminAddress();

  let Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Implementation],
    admin: ProxyAdmin,
    saveAlias: AliasDeployedContracts.VoterUpgradeable_Proxy,
    verify: true,
  });

  const VoterUpgradeable_Proxy = await ethers.getContractAt(InstanceName.VoterUpgradeable, Proxy.target);
  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.initialize(BlastGovernor, DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy]),
  );

  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.grantRole(Roles.VoterV2.GOVERNANCE_ROLE, deployer.address));
  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.grantRole(Roles.VoterV2.VOTER_ADMIN_ROLE, deployer.address));

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('minter', DeployedContracts[AliasDeployedContracts.MinterUpgradeable_Proxy]),
  );

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('v2PoolFactory', DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy]),
  );

  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.updateAddress('v3PoolFactory', '0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df'));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

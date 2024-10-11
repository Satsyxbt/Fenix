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

  let Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Implementation],
    admin: ProxyAdmin,
    saveAlias: AliasDeployedContracts.VotingEscrowUpgradeable_Proxy,
    verify: true,
  });

  const VotingEscrowUpgradeable_Proxy = await ethers.getContractAt(InstanceName.VotingEscrowUpgradeable, Proxy.target);
  await logTx(
    VotingEscrowUpgradeable_Proxy,
    VotingEscrowUpgradeable_Proxy.initialize(BlastGovernor, DeployedContracts[AliasDeployedContracts.Fenix]),
  );

  await logTx(
    VotingEscrowUpgradeable_Proxy,
    VotingEscrowUpgradeable_Proxy.updateAddress('artProxy', DeployedContracts[AliasDeployedContracts.VeArtProxyUpgradeable_Proxy]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

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

  const VoterUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.VoterUpgradeable,
    DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('managedNFTManager', DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy]),
  );

  const VotingEscrowUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.VotingEscrowUpgradeable,
    DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
  );
  await logTx(
    VotingEscrowUpgradeable_Proxy,
    VotingEscrowUpgradeable_Proxy.updateAddress(
      'managedNFTManager',
      DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

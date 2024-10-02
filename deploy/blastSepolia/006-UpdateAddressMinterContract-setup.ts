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

  const MinterUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.MinterUpgradeable,
    DeployedContracts[AliasDeployedContracts.MinterUpgradeable_Proxy],
  );

  await logTx(MinterUpgradeable_Proxy, MinterUpgradeable_Proxy.setVoter(DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy]));
  await logTx(
    MinterUpgradeable_Proxy,
    MinterUpgradeable_Proxy.setVotingEscrow(DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

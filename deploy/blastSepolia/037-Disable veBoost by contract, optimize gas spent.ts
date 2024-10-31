import { ethers } from 'hardhat';
import { AliasDeployedContracts, getBlastGovernorAddress, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const BlastGovernor = await getBlastGovernorAddress();

  const VotingEscrowUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.VotingEscrowUpgradeable,
    DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
  );

  await logTx(VotingEscrowUpgradeable_Proxy, VotingEscrowUpgradeable_Proxy.updateAddress('veBoost', ethers.ZeroAddress));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

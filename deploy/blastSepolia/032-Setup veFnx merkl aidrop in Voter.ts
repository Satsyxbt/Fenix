import { ethers } from 'hardhat';
import { AliasDeployedContracts, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const DeployedContracts = await getDeployedContractsAddressList();

  const Voter = await ethers.getContractAt(InstanceName.VoterUpgradeable, DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy]);

  await logTx(
    Voter,
    Voter.updateAddress('veFnxMerklAidrop', DeployedContracts[AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Proxy]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

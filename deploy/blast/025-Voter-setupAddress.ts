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

  const VoterUpgradeable = await ethers.getContractAt(
    InstanceName.VoterUpgradeable,
    DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );

  await logTx(VoterUpgradeable, VoterUpgradeable.updateAddress('merklDistributor', '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae'));

  await logTx(
    VoterUpgradeable,
    VoterUpgradeable.updateAddress('veFnxMerklAidrop', DeployedContracts[AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Proxy]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

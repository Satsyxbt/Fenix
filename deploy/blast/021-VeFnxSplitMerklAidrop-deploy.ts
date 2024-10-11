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

  let VeFnxSplitMerklAidropUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Implementation],
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.VeFnxSplitMerklAidropUpgradeable_Proxy,
    verify: true,
  });

  let VeFnxSplitMerklAidropUpgradeable = await ethers.getContractAt(
    InstanceName.VeFnxSplitMerklAidropUpgradeable,
    VeFnxSplitMerklAidropUpgradeable_Proxy.target,
  );
  await logTx(
    VeFnxSplitMerklAidropUpgradeable,
    VeFnxSplitMerklAidropUpgradeable.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.Fenix],
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
      ethers.parseEther('0.5'),
    ),
  );

  await logTx(
    VeFnxSplitMerklAidropUpgradeable,
    VeFnxSplitMerklAidropUpgradeable.setIsAllowedClaimOperator(DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy], true),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

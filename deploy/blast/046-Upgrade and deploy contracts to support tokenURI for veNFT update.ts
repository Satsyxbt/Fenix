import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTransaction,
  logTx,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
import { ART_RPOXY_PARTS } from '../../utils/ArtProxy';
async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();

  await deploy({
    name: InstanceName.VoterUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.VoterUpgradeable_Implementation,
    verify: true,
  });

  await deploy({
    name: InstanceName.VotingEscrowUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.VotingEscrowUpgradeable_Implementation,
    verify: true,
  });

  await deploy({
    name: InstanceName.ManagedNFTManagerUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Implementation,
    verify: true,
  });

  await deploy({
    name: InstanceName.RewardAPIUpgradeable,
    deployer: deployer,
    constructorArguments: [],
    saveAlias: AliasDeployedContracts.RewardAPIUpgradeable_Implementation,
    verify: true,
  });

  let veArtProxyStaticInstance = await deploy({
    deployer: deployer,
    constructorArguments: [
      ART_RPOXY_PARTS.lockedIcon,
      ART_RPOXY_PARTS.unlockedIcon,
      ART_RPOXY_PARTS.transferablePart,
      ART_RPOXY_PARTS.notTransferablePart,
    ],
    name: InstanceName.VeArtProxyStatic,
    saveAlias: AliasDeployedContracts.VeArtProxyStatic,
    verify: true,
  });
  let veArtProxyStatic = await ethers.getContractAt(InstanceName.VeArtProxyStatic, veArtProxyStaticInstance.target);

  await logTx(veArtProxyStatic, veArtProxyStatic.setStartPart(ART_RPOXY_PARTS.startPart));
  await logTx(veArtProxyStatic, veArtProxyStatic.setEndPart(ART_RPOXY_PARTS.endPart));

  await deploy({
    deployer: deployer,
    constructorArguments: [
      veArtProxyStatic.target,
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
    ],
    name: InstanceName.VeArtProxy,
    saveAlias: AliasDeployedContracts.VeArtProxy,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

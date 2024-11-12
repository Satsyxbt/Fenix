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

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.VotingEscrowUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.VotingEscrowUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
    proxyAdmin: await getProxyAdminAddress(),
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

  let instance = await deploy({
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

  let VotingEscrow = await ethers.getContractAt(
    InstanceName.VotingEscrowUpgradeable,
    DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
  );

  await logTx(VotingEscrow, VotingEscrow.updateAddress('artProxy', instance.target));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

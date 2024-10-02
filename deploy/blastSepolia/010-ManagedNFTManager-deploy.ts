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

  let ManagedNFTManagerUpgradeable_Implementation = await deploy({
    name: InstanceName.ManagedNFTManagerUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Implementation,
    verify: true,
  });

  let Proxy = await deployProxy({
    deployer: deployer,
    logic: await ManagedNFTManagerUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy,
    verify: true,
  });

  const ManagedNFTManagerUpgradeable_Proxy = await ethers.getContractAt(InstanceName.ManagedNFTManagerUpgradeable, Proxy.target);
  await logTx(
    ManagedNFTManagerUpgradeable_Proxy,
    ManagedNFTManagerUpgradeable_Proxy.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

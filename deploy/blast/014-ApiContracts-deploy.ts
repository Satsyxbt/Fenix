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

  let PairAPIUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.PairAPIUpgradeable_Implementation],
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.PairAPIUpgradeable_Proxy,
    verify: true,
  });
  let PairAPIUpgradeable = await ethers.getContractAt(InstanceName.PairAPIUpgradeable, PairAPIUpgradeable_Proxy.target);
  await logTx(PairAPIUpgradeable, PairAPIUpgradeable.initialize(DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy]));

  let VeNFTAPIUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.VeNFTAPIUpgradeable_Implementation],
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.VeNFTAPIUpgradeable_Proxy,
    verify: true,
  });
  let VeNFTAPIUpgradeable = await ethers.getContractAt(InstanceName.VeNFTAPIUpgradeable, VeNFTAPIUpgradeable_Proxy.target);
  await logTx(VeNFTAPIUpgradeable, VeNFTAPIUpgradeable.initialize(DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy]));
  await logTx(VeNFTAPIUpgradeable, VeNFTAPIUpgradeable.setPairAPI(PairAPIUpgradeable.target));

  let RewardAPIUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: DeployedContracts[AliasDeployedContracts.RewardAPIUpgradeable_Implementation],
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.RewardAPIUpgradeable_Proxy,
    verify: true,
  });
  let RewardAPIUpgradeable = await ethers.getContractAt(InstanceName.RewardAPIUpgradeable, RewardAPIUpgradeable_Proxy.target);
  await logTx(RewardAPIUpgradeable, RewardAPIUpgradeable.initialize(DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy]));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

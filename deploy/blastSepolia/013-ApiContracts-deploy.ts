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

  let PairAPIUpgradeable_Implementation = await deploy({
    name: InstanceName.PairAPIUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.PairAPIUpgradeable_Implementation,
    verify: true,
  });
  let VeNFTAPIUpgradeable_Implementation = await deploy({
    name: InstanceName.VeNFTAPIUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.VeNFTAPIUpgradeable_Implementation,
    verify: true,
  });
  let RewardAPIUpgradeable_Implementation = await deploy({
    name: InstanceName.RewardAPIUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.RewardAPIUpgradeable_Implementation,
    verify: true,
  });

  let PairAPIUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: await PairAPIUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.PairAPIUpgradeable_Proxy,
    verify: true,
  });
  let PairAPIUpgradeable = await ethers.getContractAt(InstanceName.PairAPIUpgradeable, PairAPIUpgradeable_Proxy.target);
  await logTx(PairAPIUpgradeable, PairAPIUpgradeable.initialize(DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy]));

  let VeNFTAPIUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: await VeNFTAPIUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.VeNFTAPIUpgradeable_Proxy,
    verify: true,
  });
  let VeNFTAPIUpgradeable = await ethers.getContractAt(InstanceName.VeNFTAPIUpgradeable, VeNFTAPIUpgradeable_Proxy.target);
  await logTx(VeNFTAPIUpgradeable, VeNFTAPIUpgradeable.initialize(DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy]));
  await logTx(VeNFTAPIUpgradeable, VeNFTAPIUpgradeable.setPairAPI(PairAPIUpgradeable.target));

  let RewardAPIUpgradeable_Proxy = await deployProxy({
    deployer: deployer,
    logic: await RewardAPIUpgradeable_Implementation.getAddress(),
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

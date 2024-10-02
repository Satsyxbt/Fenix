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
import { BribeFactoryUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const BribeImplementation = await deploy({
    name: InstanceName.BribeUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.BribeUpgradeable_Implementation,
    verify: true,
  });

  const BribeFactoryUpgradeable_Implementation = (await deploy({
    name: InstanceName.BribeFactoryUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.BribeFactoryUpgradeable_Implementation,
    verify: true,
  })) as BribeFactoryUpgradeable;

  const Proxy = await deployProxy({
    deployer: deployer,
    logic: await BribeFactoryUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.BribeFactoryUpgradeable_Proxy,
    verify: true,
  });

  const BribeFactoryUpgradeable_Proxy = await ethers.getContractAt(InstanceName.BribeFactoryUpgradeable, Proxy.target);
  await logTx(
    BribeFactoryUpgradeable_Proxy,
    BribeFactoryUpgradeable_Proxy.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
      BribeImplementation.target,
    ),
  );
  await logTx(
    BribeFactoryUpgradeable_Proxy,
    BribeFactoryUpgradeable_Proxy.pushDefaultRewardToken(DeployedContracts[AliasDeployedContracts.Fenix]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

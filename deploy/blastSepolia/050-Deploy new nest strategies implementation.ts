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

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let newImpl = await deploy({
    name: InstanceName.CompoundVeFNXManagedNFTStrategyUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation,
    verify: true,
  });

  let Factory = await ethers.getContractAt(
    InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy],
  );

  await logTx(Factory, Factory.changeStrategyImplementation(newImpl.target));

  let UpgradeableCaller = await ethers.getContractAt(
    InstanceName.UtilsUpgradeable,
    DeployedContracts[AliasDeployedContracts.UtilsUpgradeable_Proxy],
  );

  await logTx(
    UpgradeableCaller,
    UpgradeableCaller.multiUpgradeCall([
      '0x8dee69b02652a4cfab572b7d1da65fe2f722f682',
      '0x6e66f35999a40b469d09a9346cf7ea8037dc6dea',
      '0x60c9791eef471b851d8d33e459eae4e3cd22ad62',
      '0x4dd49ecf06928d3871ba6c9e2942e9e7dc2ff8d6',
    ]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

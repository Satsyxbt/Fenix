import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const ProxyAdmin = await getProxyAdminAddress();
  const BlastGovernor = await getBlastGovernorAddress();

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.ManagedNFTManagerUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.ManagedNFTManagerUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
    proxyAdmin: await getProxyAdminAddress(),
    verify: true,
  });

  let CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation = await deploy({
    deployer: deployer,
    name: InstanceName.CompoundVeFNXManagedNFTStrategyUpgradeable,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation,
    verify: true,
  });

  let CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy],
  );

  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.changeStrategyImplementation(
      CompoundVeFNXManagedNFTStrategyUpgradeable_Implementation.target,
    ),
  );

  let UtilsUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.UtilsUpgradeable,
    DeployedContracts[AliasDeployedContracts.UtilsUpgradeable_Proxy],
  );

  await logTx(
    UtilsUpgradeable_Proxy,
    UtilsUpgradeable_Proxy.multiUpgradeCall([
      '0x6E66f35999A40B469D09A9346cf7EA8037dC6DeA',
      '0x60c9791eef471b851d8D33e459EAe4e3CD22AD62',
      '0x4Dd49ECF06928D3871BA6c9E2942e9e7DC2Ff8d6',
      '0x8DEE69B02652a4Cfab572b7D1dA65fe2F722f682',
    ]),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

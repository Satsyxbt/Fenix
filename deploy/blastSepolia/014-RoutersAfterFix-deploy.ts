import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  upgradeProxy,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  await deploy({
    name: InstanceName.RouterV2,
    deployer: deployer,
    constructorArguments: [
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
      THIRD_PART_CONTRACTS.Weth,
    ],
    saveAlias: AliasDeployedContracts.RouterV2,
    verify: true,
  });

  await deploy({
    name: InstanceName.UniswapV2PartialRouter,
    deployer: deployer,
    constructorArguments: [
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
      THIRD_PART_CONTRACTS.Weth,
    ],
    saveAlias: AliasDeployedContracts.UniswapV2PartialRouter,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

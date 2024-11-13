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
    name: InstanceName.VeNFTAPIUpgradeable,
    deployer: deployer,
    constructorArguments: [],
    saveAlias: AliasDeployedContracts.VeNFTAPIUpgradeable_Implementation,
    verify: true,
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

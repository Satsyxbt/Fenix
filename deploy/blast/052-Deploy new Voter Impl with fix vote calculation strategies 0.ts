import { ethers } from 'hardhat';
import {
  AliasDeployedContracts,
  deploy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
} from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

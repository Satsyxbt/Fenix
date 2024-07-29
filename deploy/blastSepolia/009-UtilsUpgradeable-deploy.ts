import { AliasDeployedContracts, deploy, deployProxy, getBlastGovernorAddress, getProxyAdminAddress } from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();

  let Implementation = await deploy({
    name: InstanceName.UtilsUpgradeable,
    verify: true,
    constructorArguments: [BlastGovernor],
    deployer: deployer,
    saveAlias: AliasDeployedContracts.UtilsUpgradeable_Implementation,
  });

  let Proxy = await deployProxy({
    deployer: deployer,
    logic: await Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.UtilsUpgradeable_Proxy,
    verify: true,
  });

  let Instance = await ethers.getContractAt(InstanceName.UtilsUpgradeable, Proxy.target);

  await Instance.initialize(BlastGovernor);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { AliasDeployedContracts, deploy, deployProxy, getDeployedContractAddress, logTx } from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { BlastGovernorUpgradeable } from '../../typechain-types';
import { InstanceName } from '../../utils/Names';
import { Roles } from '../../utils/Roles';

async function main() {
  const [deployer] = await ethers.getSigners();

  const BlastGovernorUpgradeableImplementation = (await deploy({
    name: InstanceName.BlastGovernorUpgradeable,
    deployer: deployer,
    constructorArguments: [deployer.address],
    saveAlias: AliasDeployedContracts.BlastGovernorUpgradeable_Implementation,
    verify: true,
  })) as BlastGovernorUpgradeable;

  const Proxy = await deployProxy({
    deployer: deployer,
    logic: await BlastGovernorUpgradeableImplementation.getAddress(),
    admin: await getDeployedContractAddress(AliasDeployedContracts.ProxyAdmin),
    saveAlias: AliasDeployedContracts.BlastGovernorUpgradeable_Proxy,
    verify: true,
  });

  const BlastGovernorUpgradeable = await ethers.getContractAt(InstanceName.BlastGovernorUpgradeable, Proxy.target);

  await logTx(BlastGovernorUpgradeable, BlastGovernorUpgradeable.initialize());

  await logTx(
    BlastGovernorUpgradeable,
    BlastGovernorUpgradeable.grantRole(Roles.BlastGovernorUpgradeable.GAS_HOLDER_ADDER_ROLE, deployer.address),
  );

  await logTx(
    BlastGovernorUpgradeable,
    BlastGovernorUpgradeable.grantRole(Roles.BlastGovernorUpgradeable.GAS_WITHDRAWER_ROLE, deployer.address),
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

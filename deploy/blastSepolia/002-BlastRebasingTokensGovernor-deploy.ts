import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getProxyAdminAddress,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { BlastGovernorUpgradeable } from '../../typechain-types';
import { InstanceName } from '../../utils/Names';
import { Roles } from '../../utils/Roles';

async function main() {
  const [deployer] = await ethers.getSigners();

  const BlastRebasingTokensGovernorUpgradeableImplementation = (await deploy({
    name: InstanceName.BlastRebasingTokensGovernorUpgradeable,
    deployer: deployer,
    constructorArguments: [deployer.address],
    saveAlias: AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Implementation,
    verify: true,
  })) as BlastGovernorUpgradeable;

  const Proxy = await deployProxy({
    deployer: deployer,
    logic: await BlastRebasingTokensGovernorUpgradeableImplementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy,
    verify: true,
  });

  const BlastRebasingTokensGovernorUpgradeable = await ethers.getContractAt(
    InstanceName.BlastRebasingTokensGovernorUpgradeable,
    Proxy.target,
  );

  await BlastRebasingTokensGovernorUpgradeable.initialize(await getBlastGovernorAddress());

  await BlastRebasingTokensGovernorUpgradeable.grantRole(
    Roles.BlastRebasingTokensGovernorUpgradeable.TOKEN_HOLDER_ADDER_ROLE,
    deployer.address,
  );

  await BlastRebasingTokensGovernorUpgradeable.grantRole(
    Roles.BlastRebasingTokensGovernorUpgradeable.TOKEN_WITHDRAWER_ROLE,
    deployer.address,
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

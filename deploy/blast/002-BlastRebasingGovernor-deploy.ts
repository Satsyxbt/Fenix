import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { BlastGovernorUpgradeable, BlastRebasingTokensGovernorUpgradeable } from '../../typechain-types';
import { InstanceName } from '../../utils/Names';
import { Roles } from '../../utils/Roles';

async function main() {
  const [deployer] = await ethers.getSigners();

  const BlastGovernor = await getBlastGovernorAddress();

  const BlastRebasingTokensGovernorUpgradeableImplementation = (await deploy({
    name: InstanceName.BlastRebasingTokensGovernorUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Implementation,
    verify: true,
  })) as BlastRebasingTokensGovernorUpgradeable;

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

  await logTx(BlastRebasingTokensGovernorUpgradeable, BlastRebasingTokensGovernorUpgradeable.initialize(BlastGovernor));

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.grantRole(
      Roles.BlastRebasingTokensGovernorUpgradeable.TOKEN_HOLDER_ADDER_ROLE,
      deployer.address,
    ),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.grantRole(Roles.BlastRebasingTokensGovernorUpgradeable.TOKEN_WITHDRAWER_ROLE, deployer.address),
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

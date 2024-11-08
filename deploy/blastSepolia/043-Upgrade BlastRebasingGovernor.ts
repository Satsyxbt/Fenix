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
import { YieldDistributionDirection } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const BlastGovernor = await getBlastGovernorAddress();

  await deployNewImplementationAndUpgradeProxy({
    implementationName: InstanceName.BlastRebasingTokensGovernorUpgradeable,
    deployer: deployer,
    implementationConstructorArguments: [BlastGovernor],
    implementationSaveAlias: AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Implementation,
    proxyAddress: DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
    proxyAdmin: await getProxyAdminAddress(),
    verify: true,
  });

  let BlastRebasingTokensGovernorUpgradeable = await ethers.getContractAt(
    InstanceName.BlastRebasingTokensGovernorUpgradeable,
    DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.setYieldDistributionDirectionsPercentage(
      0,
      ethers.parseEther('0.5'),
      ethers.parseEther('0.25'),
      ethers.parseEther('0.25'),
    ),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.grantRole(
      await BlastRebasingTokensGovernorUpgradeable.TOKEN_CLAIMER_ROLE(),
      '0x7d15db508dd097a5b0deaa366b6a86dee6367b33',
    ),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.grantRole(
      await BlastRebasingTokensGovernorUpgradeable.TOKEN_SWAPER_ROLE(),
      '0x7d15db508dd097a5b0deaa366b6a86dee6367b33',
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { YieldDistributionDirection } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

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
    BlastRebasingTokensGovernorUpgradeable.updateAddress(
      'votingEscrow',
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
    ),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.setYieldDistributionDirectionsPercentage(0, 0, ethers.parseEther('1'), 0),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.setDirectionAvailableToSwapToTargetToken(YieldDistributionDirection.Rise, true),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.grantRole(
      await BlastRebasingTokensGovernorUpgradeable.TOKEN_DISTRIBUTE_ROLE(),
      '0x7d15dB508dD097a5b0dEAA366B6A86DEe6367B33',
    ),
  );
  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.grantRole(
      await BlastRebasingTokensGovernorUpgradeable.TOKEN_SWAPER_ROLE(),
      '0x7d15dB508dD097a5b0dEAA366B6A86DEe6367B33',
    ),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.updateAddress('swapTargetToken', DeployedContracts[AliasDeployedContracts.Fenix]),
  );
  await logTx(
    BlastRebasingTokensGovernorUpgradeable,
    BlastRebasingTokensGovernorUpgradeable.updateAddress('swapRouter', '0xD952ACb88D36029A388555c19AA7031182f98932'),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

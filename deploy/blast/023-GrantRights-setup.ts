import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const BlastRebasingTokensGovernorUpgradeable = await ethers.getContractAt(
    InstanceName.BlastRebasingTokensGovernorUpgradeable,
    DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
  );

  await BlastRebasingTokensGovernorUpgradeable.grantRole(
    await BlastRebasingTokensGovernorUpgradeable.TOKEN_HOLDER_ADDER_ROLE(),
    DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
  );

  await BlastRebasingTokensGovernorUpgradeable.grantRole(
    await BlastRebasingTokensGovernorUpgradeable.TOKEN_HOLDER_ADDER_ROLE(),
    DeployedContracts[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

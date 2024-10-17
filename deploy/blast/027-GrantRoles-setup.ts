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
import { Roles } from '../../utils/Roles';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const TARGET_ADDRESS = '0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5';

  const VoterUpgradeable_Proxy = await ethers.getContractAt(
    'VoterUpgradeableV2',
    DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
  );

  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.grantRole(Roles.DEFAULT_ADMIN_ROLE, TARGET_ADDRESS));
  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.grantRole(Roles.VoterV2.GOVERNANCE_ROLE, TARGET_ADDRESS));
  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.grantRole(Roles.VoterV2.VOTER_ADMIN_ROLE, TARGET_ADDRESS));

  const ManagedNFTManagerUpgradeable_Proxy = await ethers.getContractAt(
    'ManagedNFTManagerUpgradeable',
    DeployedContracts[AliasDeployedContracts.ManagedNFTManagerUpgradeable_Proxy],
  );
  await logTx(ManagedNFTManagerUpgradeable_Proxy, ManagedNFTManagerUpgradeable_Proxy.grantRole(Roles.DEFAULT_ADMIN_ROLE, TARGET_ADDRESS));
  await logTx(
    ManagedNFTManagerUpgradeable_Proxy,
    ManagedNFTManagerUpgradeable_Proxy.grantRole(await ManagedNFTManagerUpgradeable_Proxy.MANAGED_NFT_ADMIN(), TARGET_ADDRESS),
  );

  const CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy = await ethers.getContractAt(
    'CompoundVeFNXManagedNFTStrategyFactoryUpgradeable',
    DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy],
  );
  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.grantRole(Roles.DEFAULT_ADMIN_ROLE, TARGET_ADDRESS),
  );
  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.grantRole(
      await CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.STRATEGY_CREATOR_ROLE(),
      TARGET_ADDRESS,
    ),
  );

  const BlastRebasingTokensGovernorUpgradeable_Proxy = await ethers.getContractAt(
    'BlastRebasingTokensGovernorUpgradeable',
    DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
  );
  await logTx(
    BlastRebasingTokensGovernorUpgradeable_Proxy,
    BlastRebasingTokensGovernorUpgradeable_Proxy.grantRole(Roles.DEFAULT_ADMIN_ROLE, TARGET_ADDRESS),
  );
  await logTx(
    BlastRebasingTokensGovernorUpgradeable_Proxy,
    BlastRebasingTokensGovernorUpgradeable_Proxy.grantRole(
      await BlastRebasingTokensGovernorUpgradeable_Proxy.TOKEN_HOLDER_ADDER_ROLE(),
      TARGET_ADDRESS,
    ),
  );
  await logTx(
    BlastRebasingTokensGovernorUpgradeable_Proxy,
    BlastRebasingTokensGovernorUpgradeable_Proxy.grantRole(
      await BlastRebasingTokensGovernorUpgradeable_Proxy.TOKEN_WITHDRAWER_ROLE(),
      TARGET_ADDRESS,
    ),
  );

  const BlastGovernorUpgradeable_Proxy = await ethers.getContractAt(
    'BlastGovernorUpgradeable',
    DeployedContracts[AliasDeployedContracts.BlastGovernorUpgradeable_Proxy],
  );
  await logTx(BlastGovernorUpgradeable_Proxy, BlastGovernorUpgradeable_Proxy.grantRole(Roles.DEFAULT_ADMIN_ROLE, TARGET_ADDRESS));
  await logTx(
    BlastGovernorUpgradeable_Proxy,
    BlastGovernorUpgradeable_Proxy.grantRole(await BlastGovernorUpgradeable_Proxy.GAS_HOLDER_ADDER_ROLE(), TARGET_ADDRESS),
  );
  await logTx(
    BlastGovernorUpgradeable_Proxy,
    BlastGovernorUpgradeable_Proxy.grantRole(await BlastGovernorUpgradeable_Proxy.GAS_WITHDRAWER_ROLE(), TARGET_ADDRESS),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

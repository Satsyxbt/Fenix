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

  let VoterUpgradeable_Implementation = await deploy({
    name: InstanceName.VoterUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.VoterUpgradeable_Implementation,
    verify: true,
  });

  let Proxy = await deployProxy({
    deployer: deployer,
    logic: await VoterUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.VoterUpgradeable_Proxy,
    verify: true,
  });

  const VoterUpgradeable_Proxy = await ethers.getContractAt(InstanceName.VoterUpgradeable, Proxy.target);
  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.initialize(BlastGovernor, DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy]),
  );

  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.grantRole(ethers.id('VOTER_ADMIN_ROLE'), deployer.address));
  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.grantRole(ethers.id('GOVERNANCE_ROLE'), deployer.address));

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('minter', DeployedContracts[AliasDeployedContracts.MinterUpgradeable_Proxy]),
  );

  await logTx(
    VoterUpgradeable_Proxy,
    VoterUpgradeable_Proxy.updateAddress('v2PoolFactory', DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy]),
  );

  await logTx(VoterUpgradeable_Proxy, VoterUpgradeable_Proxy.updateAddress('v3PoolFactory', '0x242A0C57EAf78A061db42D913DE7FA4eA648a1Ef'));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

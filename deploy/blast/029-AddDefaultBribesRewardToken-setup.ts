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
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();
  const ProxyAdmin = await getProxyAdminAddress();

  const BribeFactoryUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.BribeFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.BribeFactoryUpgradeable_Proxy],
  );

  await logTx(
    BribeFactoryUpgradeable_Proxy,
    BribeFactoryUpgradeable_Proxy.pushDefaultRewardToken('0x4300000000000000000000000000000000000004'),
  );
  await logTx(
    BribeFactoryUpgradeable_Proxy,
    BribeFactoryUpgradeable_Proxy.pushDefaultRewardToken('0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad'),
  );
  await logTx(
    BribeFactoryUpgradeable_Proxy,
    BribeFactoryUpgradeable_Proxy.pushDefaultRewardToken('0x4300000000000000000000000000000000000003'),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

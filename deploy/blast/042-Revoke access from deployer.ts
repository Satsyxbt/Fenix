import {
  AliasDeployedContracts,
  deploy,
  deployNewImplementationAndUpgradeProxy,
  getBlastGovernorAddress,
  getDeployedContractAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { GaugeType } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();

  // let BlastRebasingTokensGovernorUpgradeable_Proxy = await ethers.getContractAt(
  //   InstanceName.BlastRebasingTokensGovernorUpgradeable,
  //   DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
  // );
  // await logTx(
  //   BlastRebasingTokensGovernorUpgradeable_Proxy,
  //   BlastRebasingTokensGovernorUpgradeable_Proxy.revokeRole(
  //     '0x13c917b27f9272fd324bebe12db2b6900472b7e73f0c1eb5742a6a9b7b741eeb',
  //     deployer.address,
  //   ),
  // );
  // await logTx(
  //   BlastRebasingTokensGovernorUpgradeable_Proxy,
  //   BlastRebasingTokensGovernorUpgradeable_Proxy.revokeRole(
  //     '0x96f93e547c9c0f4da199cc643fe402efb93b3a591722ad8b3cb9231b9fb18873',
  //     deployer.address,
  //   ),
  // );
  // await logTx(
  //   BlastRebasingTokensGovernorUpgradeable_Proxy,
  //   BlastRebasingTokensGovernorUpgradeable_Proxy.revokeRole(
  //     '0x0000000000000000000000000000000000000000000000000000000000000000',
  //     deployer.address,
  //   ),
  // );

  let BlastGovernorUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.BlastGovernorUpgradeable,
    DeployedContracts[AliasDeployedContracts.BlastGovernorUpgradeable_Proxy],
  );

  // await logTx(
  //   BlastGovernorUpgradeable_Proxy,
  //   BlastGovernorUpgradeable_Proxy.revokeRole('0xb02835ed23866236aee0427e99946731326ed8467586213250ac98c7b9cae230', deployer.address),
  // );

  // await logTx(
  //   BlastGovernorUpgradeable_Proxy,
  //   BlastGovernorUpgradeable_Proxy.revokeRole('0x0000000000000000000000000000000000000000000000000000000000000000', deployer.address),
  // );

  await logTx(
    BlastGovernorUpgradeable_Proxy,
    BlastGovernorUpgradeable_Proxy.renounceRole('0xe562760eaa817d85ec1bf58364c4d65adb65d99d113c6785ef9aa66567076c95', deployer.address),
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

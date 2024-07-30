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
import { FenixRaiseUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const FenixRaiseUpgradeable_Implementation = (await deploy({
    name: InstanceName.FenixRaiseUpgradeable,
    deployer: deployer,
    constructorArguments: [BlastGovernor],
    saveAlias: AliasDeployedContracts.FenixRaiseUpgradeable_Implementation,
    verify: true,
  })) as FenixRaiseUpgradeable;

  const Proxy = await deployProxy({
    deployer: deployer,
    logic: await FenixRaiseUpgradeable_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.FenixRaiseUpgradeable_Proxy,
    verify: true,
  });

  const FenixRaiseUpgradeable = await ethers.getContractAt(
    InstanceName.FenixRaiseUpgradeable,
    DeployedContracts[AliasDeployedContracts.FenixRaiseUpgradeable_Proxy],
  );

  await logTx(
    FenixRaiseUpgradeable,
    FenixRaiseUpgradeable.initialize(
      BlastGovernor,
      '0xF80a52151d69D0552d10751D8C4efAF8ADA8dA6c',
      DeployedContracts[AliasDeployedContracts.Fenix],
      deployer.address,
      ethers.parseEther('4'),
      ethers.ZeroAddress,
      0,
    ),
  );

  await logTx(
    FenixRaiseUpgradeable,
    FenixRaiseUpgradeable.setDepositCaps(ethers.parseEther('65000'), ethers.parseEther('100'), ethers.parseEther('50')),
  );

  await logTx(FenixRaiseUpgradeable, FenixRaiseUpgradeable.setTimestamps(1719450107, 1719490107, 1719990107, 1722440334));

  await logTx(
    FenixRaiseUpgradeable,
    FenixRaiseUpgradeable.setWhitelistRoot('0x7fabd917d4afd47860601e28ab3309a02ba5a497ad59cd00ffec0346b1a32b7e'),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

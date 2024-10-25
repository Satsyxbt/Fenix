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
import hre, { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';
import { IAlgebraFactory } from '@cryptoalgebra/integral-core/typechain';

import { AccessControlEnumerableUpgradeable } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const MockToken = await ethers.deployContract(InstanceName.ERC20OwnableMock, ['MOK1', 'MOK1', 18]);
  const MockToken_2 = await ethers.deployContract(InstanceName.ERC20OwnableMock, ['MOK2', 'MOK2', 9]);

  await MockToken.waitForDeployment();
  await MockToken_2.waitForDeployment();

  let AlgebraFactory = await ethers.getContractAt('IAlgebraFactory', DeployedContracts[AliasDeployedContracts.AlgebraFactory_Proxy]);

  let BasePluginV1Factory_Proxy = await ethers.getContractAt(
    'IAlgebraFactory',
    DeployedContracts[AliasDeployedContracts.BasePluginV1Factory_Proxy],
  );

  let BlastRebasingTokensGovernorUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.BlastRebasingTokensGovernorUpgradeable,
    DeployedContracts[AliasDeployedContracts.BlastRebasingTokensGovernorUpgradeable_Proxy],
  );
  let BlastGovernorUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.BlastGovernorUpgradeable,
    DeployedContracts[AliasDeployedContracts.BlastGovernorUpgradeable_Proxy],
  );

  let PairFactoryUpgradeable = await ethers.getContractAt(
    InstanceName.PairFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.PairFactoryUpgradeable_Proxy],
  );

  await logTx(
    BasePluginV1Factory_Proxy,
    BasePluginV1Factory_Proxy.setDefaultBlastGovernor(DeployedContracts[AliasDeployedContracts.BlastGovernorUpgradeable_Proxy]),
  );

  await logTx(
    BlastRebasingTokensGovernorUpgradeable_Proxy,
    BlastRebasingTokensGovernorUpgradeable_Proxy.grantRole(
      await BlastRebasingTokensGovernorUpgradeable_Proxy.TOKEN_HOLDER_ADDER_ROLE(),
      AlgebraFactory.target,
    ),
  );
  await logTx(
    BlastRebasingTokensGovernorUpgradeable_Proxy,
    BlastRebasingTokensGovernorUpgradeable_Proxy.grantRole(
      await BlastRebasingTokensGovernorUpgradeable_Proxy.TOKEN_HOLDER_ADDER_ROLE(),
      DeployedContracts[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
    ),
  );
  await logTx(
    BlastGovernorUpgradeable_Proxy,
    BlastGovernorUpgradeable_Proxy.grantRole(
      await BlastGovernorUpgradeable_Proxy.GAS_HOLDER_ADDER_ROLE(),
      DeployedContracts[AliasDeployedContracts.FeesVaultFactoryUpgradeable_Proxy],
    ),
  );
  await logTx(
    BlastGovernorUpgradeable_Proxy,
    BlastGovernorUpgradeable_Proxy.grantRole(await BlastGovernorUpgradeable_Proxy.GAS_HOLDER_ADDER_ROLE(), AlgebraFactory.target),
  );
  await logTx(
    PairFactoryUpgradeable,
    PairFactoryUpgradeable.createPair('0x187488f4ea0eB78E17EC42eb93d2AF2aB9cb9759', '0x2bAa70789767975b280bD5Dd5ea42B007Ad3f811', true),
  );

  await logTx(
    AlgebraFactory,
    AlgebraFactory.createPool('0x187488f4ea0eB78E17EC42eb93d2AF2aB9cb9759', '0x2bAa70789767975b280bD5Dd5ea42B007Ad3f811'),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

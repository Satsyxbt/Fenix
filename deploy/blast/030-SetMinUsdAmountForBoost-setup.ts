import { ethers } from 'hardhat';
import { AliasDeployedContracts, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const DeployedContracts = await getDeployedContractsAddressList();

  const VeBoostUpgradeable = await ethers.getContractAt(
    InstanceName.VeBoostUpgradeable,
    DeployedContracts[AliasDeployedContracts.VeBoostUpgradeable_Proxy],
  );

  await logTx(VeBoostUpgradeable, VeBoostUpgradeable.setMinUSDAmount(ethers.parseEther('100')));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

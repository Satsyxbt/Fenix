import { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
import { VeFNXClaimer } from '../../typechain-types';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();

  let Instance = await deploy({
    deployer: deployer,
    name: InstanceName.veFNXClaimer,
    saveAlias: AliasDeployedContracts.veFNXClaimer,
    constructorArguments: [
      DeployedContracts[AliasDeployedContracts.Fenix],
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
    ],
    verify: true,
  });

  let veFNXClaimer = await ethers.getContractAt(InstanceName.veFNXClaimer, Instance.target);
  const TARGET_ADDRESS = '0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5';

  await logTx(veFNXClaimer, veFNXClaimer.transferOwnership(TARGET_ADDRESS));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy, getBlastGovernorAddress, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';
import { THIRD_PART_CONTRACTS } from '../../utils/Constants';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let Instance = await deploy({
    name: InstanceName.OpenOceanVeNftDirectBuyer,
    deployer: deployer,
    constructorArguments: [
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.VotingEscrowUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.Fenix],
      THIRD_PART_CONTRACTS.BLAST_OPEN_OCEAN_EXCHANGE,
    ],
    saveAlias: AliasDeployedContracts.OpenOceanVeNftDirectBuyer,
    verify: true,
  });

  let Contract = await ethers.getContractAt(InstanceName.OpenOceanVeNftDirectBuyer, Instance.target);
  await logTx(Contract, Contract.transferOwnership('0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5'));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

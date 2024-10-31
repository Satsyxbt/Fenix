import { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy, getBlastGovernorAddress, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const DeployedContracts = await getDeployedContractsAddressList();
  const BlastGovernor = await getBlastGovernorAddress();

  let SingelTokenVirtualRewarderUpgradeable = await deploy({
    name: InstanceName.SingelTokenVirtualRewarderUpgradeable,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.SingelTokenVirtualRewarderUpgradeable_Implementation,
    verify: true,
    constructorArguments: [BlastGovernor],
  });

  const CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy = await ethers.getContractAt(
    InstanceName.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable,
    DeployedContracts[AliasDeployedContracts.CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy],
  );

  await logTx(
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy,
    CompoundVeFNXManagedNFTStrategyFactoryUpgradeable_Proxy.changeVirtualRewarderImplementation(
      SingelTokenVirtualRewarderUpgradeable.target,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

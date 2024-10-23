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

  let GaugeRewader_Implementation = await deploy({
    name: InstanceName.GaugeRewarder,
    deployer: deployer,
    saveAlias: AliasDeployedContracts.GaugeRewader_Implementation,
    constructorArguments: [BlastGovernor],
    verify: true,
  });

  let GaugeRewader_Proxy = await deployProxy({
    deployer: deployer,
    logic: await GaugeRewader_Implementation.getAddress(),
    admin: await getProxyAdminAddress(),
    saveAlias: AliasDeployedContracts.GaugeRewader_Proxy,
    verify: true,
  });

  let GaugeRewader = await ethers.getContractAt(InstanceName.GaugeRewarder, GaugeRewader_Proxy.target);

  await logTx(
    GaugeRewader,
    GaugeRewader.initialize(
      BlastGovernor,
      DeployedContracts[AliasDeployedContracts.Fenix],
      DeployedContracts[AliasDeployedContracts.VoterUpgradeable_Proxy],
      DeployedContracts[AliasDeployedContracts.MinterUpgradeable_Proxy],
    ),
  );

  await logTx(GaugeRewader, GaugeRewader.setSigner('0x72bEe8a409977fb340fe137d067540ea88685927'));
  await logTx(GaugeRewader, GaugeRewader.grantRole(ethers.id('REWARDER_ROLE'), deployer.address));
  await logTx(GaugeRewader, GaugeRewader.grantRole(ethers.id('CLAMER_FOR_ROLE'), deployer.address));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

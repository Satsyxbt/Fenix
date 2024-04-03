import { deployBase, getDeployedDataFromDeploys, getDeploysData } from './utils';
import hre from 'hardhat';

const TARGET = '';
async function main() {
  let deploysData = await getDeployedDataFromDeploys();
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  await deploysData.Minter.transferOwnership(TARGET);

  await deploysData.FeesVaultFactory.revokeRole(await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(), deployer.address);
  await deploysData.FeesVaultFactory.revokeRole(await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), deployer.address);

  await deploysData.PairFactory.revokeRole(await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), TARGET);
  await deploysData.PairFactory.revokeRole(await deploysData.PairFactory.FEES_MANAGER_ROLE(), TARGET);

  await deploysData.FeesVaultFactory.grantRole(await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), TARGET);
  await deploysData.PairFactory.grantRole(await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), TARGET);

  await deploysData.FeesVaultFactory.revokeRole(await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), TARGET);
  await deploysData.PairFactory.revokeRole(await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), TARGET);

  await deploysData.VotingEscrow.setTeam(TARGET);
  await deploysData.VeFnxDistributor.transferOwnership(TARGET);
  await deploysData.BribeFactory.transferOwnership(TARGET);
  await deploysData.GaugeFactoryType.transferOwnership(TARGET);
  await deploysData.GaugeFactoryType2.transferOwnership(TARGET);
  await deploysData.GaugeFactoryType3.transferOwnership(TARGET);
  await deploysData.ProxyAdmin.transferOwnership(TARGET);
  await deploysData.MerklGaugeMiddleman.transferOwnership(TARGET);
  await deploysData.RFenix.transferOwnership(TARGET);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

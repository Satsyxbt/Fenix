import { getDeployedDataFromDeploys } from '../../utils';
import hre from 'hardhat';

const TARGET = '0xED8276141873621c18258D1c963C9F5d4014b5E5';
async function main() {
  let deploysData = await getDeployedDataFromDeploys();
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  console.log(`Transfer Fenix tokens
  -- Before
  \t totalSupply: ${await deploysData.Fenix.totalSupply()}
  \t old owner balance: ${await deploysData.Fenix.balanceOf(deployer.address)}
  \t new owner balance: ${await deploysData.Fenix.balanceOf(TARGET)}
  `);
  await deploysData.Fenix.transfer(TARGET, await deploysData.Fenix.balanceOf(deployer.address));
  console.log(`
  -- After
  \t totalSupply: ${await deploysData.Fenix.totalSupply()}
  \t old owner balance: ${await deploysData.Fenix.balanceOf(deployer.address)}
  \t new owner balance: ${await deploysData.Fenix.balanceOf(TARGET)}
  `);

  console.log(`Transfer Minter Ownership:
  -- Current state
  \t owner() - ${await deploysData.Minter.owner()}
  \t pendingOwner() - ${await deploysData.Minter.pendingOwner()}
  `);
  await deploysData.Minter.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.Minter.owner()}
  \t pendingOwner() - ${await deploysData.Minter.pendingOwner()}
  `);

  console.log(`Transfer RFenix Ownership:
  -- Current state
  \t owner() - ${await deploysData.RFenix.owner()}
  \t pendingOwner() - ${await deploysData.RFenix.pendingOwner()}
  `);
  await deploysData.RFenix.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.RFenix.owner()}
  \t pendingOwner() - ${await deploysData.RFenix.pendingOwner()}
  `);

  console.log(`Transfer VeFnxDistributor Ownership:
  -- Current state
  \t owner() - ${await deploysData.VeFnxDistributor.owner()}
  \t pendingOwner() - ${await deploysData.VeFnxDistributor.pendingOwner()}
  `);
  await deploysData.VeFnxDistributor.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.VeFnxDistributor.owner()}
  \t pendingOwner() - ${await deploysData.VeFnxDistributor.pendingOwner()}
  `);

  console.log(`Transfer BribeFactory Ownership:
  -- Current state
  \t owner() - ${await deploysData.BribeFactory.owner()}
  `);
  await deploysData.BribeFactory.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.BribeFactory.owner()}
  `);

  console.log(`Transfer GaugeFactoryType Ownership:
  -- Current state
  \t owner() - ${await deploysData.GaugeFactoryType.owner()}
  `);
  await deploysData.GaugeFactoryType.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.GaugeFactoryType.owner()}
  `);

  console.log(`Transfer GaugeFactoryType2 Ownership:
  -- Current state
  \t owner() - ${await deploysData.GaugeFactoryType2.owner()}
  `);
  await deploysData.GaugeFactoryType2.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.GaugeFactoryType2.owner()}
  `);

  console.log(`Transfer GaugeFactoryType3 Ownership:
  -- Current state
  \t owner() - ${await deploysData.GaugeFactoryType3.owner()}
  `);
  await deploysData.GaugeFactoryType3.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.GaugeFactoryType3.owner()}
  `);

  console.log(`Transfer MerklGaugeMiddleman Ownership:
  -- Current state
  \t owner() - ${await deploysData.MerklGaugeMiddleman.owner()}
  `);
  await deploysData.MerklGaugeMiddleman.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.MerklGaugeMiddleman.owner()}
  `);

  console.log(`Transfer VotingEscrow Ownership:
  -- Current state
  \t team() - ${await deploysData.VotingEscrow.team()}
  `);
  await deploysData.VotingEscrow.setTeam(TARGET);
  console.log(`:
  -- After state
  \t team() - ${await deploysData.VotingEscrow.team()}
  `);

  console.log(`Transfer Voter Ownership:
  -- Current state
  \t admin() - ${await deploysData.Voter.admin()}
  \t governance() - ${await deploysData.Voter.governance()}
  `);
  await deploysData.Voter.setVoterAdmin(TARGET);
  await deploysData.Voter.setGovernance(TARGET);
  console.log(`:
  -- After state
  \t team() - ${await deploysData.Voter.admin()}
  \t governance() - ${await deploysData.Voter.governance()}
  `);

  console.log(`Transfer FeesVaultFactory Ownership:
  -- Current state
  \t old owner DEFAULT_ADMIN_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(),
    deployer.address,
  )}
  \t old owner CLAIM_FEES_CALLER_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(),
    deployer.address,
  )}
  \t old owner FEES_VAULT_ADMINISTRATOR_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(),
    deployer.address,
  )}
  \t new owner DEFAULT_ADMIN_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(),
    TARGET,
  )}
  \t new owner FEES_VAULT_ADMINISTRATOR_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(),
    TARGET,
  )}
  \t new owner CLAIM_FEES_CALLER_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(),
    TARGET,
  )}
  `);

  if (await deploysData.FeesVaultFactory.hasRole(await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(), deployer.address)) {
    await deploysData.FeesVaultFactory.revokeRole(await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(), deployer.address);
  }

  if (await deploysData.FeesVaultFactory.hasRole(await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), deployer.address)) {
    await deploysData.FeesVaultFactory.revokeRole(await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), deployer.address);
  }

  await deploysData.FeesVaultFactory.grantRole(await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), TARGET);
  await deploysData.FeesVaultFactory.grantRole(await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(), TARGET);
  await deploysData.FeesVaultFactory.grantRole(await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), TARGET);

  await deploysData.FeesVaultFactory.revokeRole(await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), deployer.address);

  console.log(` -- After state
  \t old owner DEFAULT_ADMIN_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(),
    deployer.address,
  )}
  \t old owner CLAIM_FEES_CALLER_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(),
    deployer.address,
  )}
  \t old owner FEES_VAULT_ADMINISTRATOR_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(),
    deployer.address,
  )}
  \t new owner DEFAULT_ADMIN_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.DEFAULT_ADMIN_ROLE(),
    TARGET,
  )}
  \t new owner FEES_VAULT_ADMINISTRATOR_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(),
    TARGET,
  )}
  \t new owner CLAIM_FEES_CALLER_ROLE - ${await deploysData.FeesVaultFactory.hasRole(
    await deploysData.FeesVaultFactory.CLAIM_FEES_CALLER_ROLE(),
    TARGET,
  )}
  `);

  console.log(`Tranfer PairFactory Ownership
  -- Before state
  \t old owner DEFAULT_ADMIN_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.DEFAULT_ADMIN_ROLE(),
    deployer.address,
  )}
  \t old owner PAIRS_ADMINISTRATOR_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(),
    deployer.address,
  )}
  \t old owner PAIRS_CREATOR_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.PAIRS_CREATOR_ROLE(),
    deployer.address,
  )}
  \t old owner FEES_MANAGER_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.FEES_MANAGER_ROLE(),
    deployer.address,
  )}
  \t new owner DEFAULT_ADMIN_ROLE - ${await deploysData.PairFactory.hasRole(await deploysData.PairFactory.DEFAULT_ADMIN_ROLE(), TARGET)}
  \t new owner PAIRS_CREATOR_ROLE - ${await deploysData.PairFactory.hasRole(await deploysData.PairFactory.PAIRS_CREATOR_ROLE(), TARGET)}
  \t new owner PAIRS_ADMINISTRATOR_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(),
    TARGET,
  )}
  \t new owner FEES_MANAGER_ROLE - ${await deploysData.PairFactory.hasRole(await deploysData.PairFactory.FEES_MANAGER_ROLE(), TARGET)}
  `);

  if (await deploysData.PairFactory.hasRole(await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), deployer.address)) {
    await deploysData.PairFactory.revokeRole(await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), deployer.address);
  }
  if (await deploysData.PairFactory.hasRole(await deploysData.PairFactory.FEES_MANAGER_ROLE(), deployer.address)) {
    await deploysData.PairFactory.revokeRole(await deploysData.PairFactory.FEES_MANAGER_ROLE(), deployer.address);
  }
  if (await deploysData.PairFactory.hasRole(await deploysData.PairFactory.PAIRS_CREATOR_ROLE(), deployer.address)) {
    await deploysData.PairFactory.revokeRole(await deploysData.PairFactory.PAIRS_CREATOR_ROLE(), deployer.address);
  }

  await deploysData.PairFactory.grantRole(await deploysData.PairFactory.DEFAULT_ADMIN_ROLE(), TARGET);
  await deploysData.PairFactory.grantRole(await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), TARGET);
  await deploysData.PairFactory.grantRole(await deploysData.PairFactory.PAIRS_CREATOR_ROLE(), TARGET);
  await deploysData.PairFactory.grantRole(await deploysData.PairFactory.FEES_MANAGER_ROLE(), TARGET);
  await deploysData.PairFactory.revokeRole(await deploysData.PairFactory.DEFAULT_ADMIN_ROLE(), deployer.address);

  console.log(` -- After state
  \t old owner DEFAULT_ADMIN_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.DEFAULT_ADMIN_ROLE(),
    deployer.address,
  )}
  \t old owner PAIRS_ADMINISTRATOR_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(),
    deployer.address,
  )}
  \t old owner PAIRS_CREATOR_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.PAIRS_CREATOR_ROLE(),
    deployer.address,
  )}
  \t old owner FEES_MANAGER_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.FEES_MANAGER_ROLE(),
    deployer.address,
  )}
  \t new owner DEFAULT_ADMIN_ROLE - ${await deploysData.PairFactory.hasRole(await deploysData.PairFactory.DEFAULT_ADMIN_ROLE(), TARGET)}
  \t new owner PAIRS_CREATOR_ROLE - ${await deploysData.PairFactory.hasRole(await deploysData.PairFactory.PAIRS_CREATOR_ROLE(), TARGET)}
  \t new owner PAIRS_ADMINISTRATOR_ROLE - ${await deploysData.PairFactory.hasRole(
    await deploysData.PairFactory.PAIRS_ADMINISTRATOR_ROLE(),
    TARGET,
  )}
  \t new owner FEES_MANAGER_ROLE - ${await deploysData.PairFactory.hasRole(await deploysData.PairFactory.FEES_MANAGER_ROLE(), TARGET)}
  `);

  console.log(`Transfer ProxyAdmin Ownership:
  -- Current state
  \t owner() - ${await deploysData.ProxyAdmin.owner()}
  `);
  await deploysData.ProxyAdmin.transferOwnership(TARGET);
  console.log(`:
  -- After state
  \t owner() - ${await deploysData.ProxyAdmin.owner()}
  `);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

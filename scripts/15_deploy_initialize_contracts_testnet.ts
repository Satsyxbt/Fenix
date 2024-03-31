import { ethers } from 'hardhat';
import { getDeploysData } from './utils';

const WETH = '0x4200000000000000000000000000000000000023';
const USDB = '0x4200000000000000000000000000000000000022';
const BLAST_POINTS = '0x2fc95838c71e76ec69ff817983BFf17c710F34E0';
const BLAST_POINTS_OPERATOR = '0x5888eEe48C0173681109Be60396D75bA2c02f632';
const BLAST_GOVERNOR = '0x9140D359f2855E6540609dd4A93773ED1f45f509';
const V3_PAIR_FACTORY = '0x37f23c8371B01f044B22E2ec854895F9b44e80d0';
const DEPLOYER = '0x9140D359f2855E6540609dd4A93773ED1f45f509';

async function main() {
  console.log('15_deploy_initialize_contracts_testnet -- started');
  let data = getDeploysData();

  let feesVaultFactory = await ethers.getContractAt('FeesVaultFactoryUpgradeable', data['FeesVaultFactory']);
  await feesVaultFactory.initialize(BLAST_GOVERNOR, BLAST_POINTS, BLAST_POINTS_OPERATOR, data['Voter'], data['FeesVaultImplementation'], {
    toGaugeRate: 0,
    recipients: [DEPLOYER],
    rates: [10000],
  });

  let pairFactory = await ethers.getContractAt('PairFactoryUpgradeable', data['PairFactory']);
  await pairFactory.initialize(BLAST_GOVERNOR, BLAST_POINTS, BLAST_POINTS_OPERATOR, data['PairImplementation'], feesVaultFactory.target);

  await pairFactory.grantRole(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), DEPLOYER);
  await pairFactory.grantRole(await pairFactory.FEES_MANAGER_ROLE(), DEPLOYER);

  await pairFactory.setIsPublicPoolCreationMode(true);
  await pairFactory.setProtocolFee(1000);
  await pairFactory.setConfigurationForRebaseToken(WETH, true, 2);
  await pairFactory.setConfigurationForRebaseToken(USDB, true, 2);

  await feesVaultFactory.grantRole(await feesVaultFactory.CLAIM_FEES_CALLER_ROLE(), DEPLOYER);
  await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), DEPLOYER);
  await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), V3_PAIR_FACTORY);
  await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), pairFactory.target);

  console.log('15_deploy_initialize_contracts_testnet -- finished');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

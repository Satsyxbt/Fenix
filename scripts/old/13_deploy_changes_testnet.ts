import { ethers } from 'hardhat';
import { deployProxy, getDeploysData, saveDeploysData } from '../utils';
import { deployBase } from '../utils';

const WETH = '0x4200000000000000000000000000000000000023';
const USDB = '0x4200000000000000000000000000000000000022';
const BLAST_POINTS = '0x2fc95838c71e76ec69ff817983BFf17c710F34E0';

const BLAST_POINTS_OPERATOR = '0x5888eEe48C0173681109Be60396D75bA2c02f632';
const BLAST_GOVERNOR = '0x9140D359f2855E6540609dd4A93773ED1f45f509';

const V3_PAIR_FACTORY = '0x37f23c8371B01f044B22E2ec854895F9b44e80d0';

async function main() {
  console.log('13_deploy_v1_1_changes -- started');

  await deployBase('PairFactoryUpgradeable', 'PairFactoryImplementation');
  await deployBase('Pair', 'PairImplementation');

  await deployBase('FeesVaultFactoryUpgradeable', 'FeesVaultFactoryImplementation');
  await deployBase('FeesVaultUpgradeable', 'FeesVaultImplementation');

  let data = getDeploysData();

  await deployProxy(data['ProxyAdmin'], data['PairFactoryImplementation'], 'PairFactory');

  await deployProxy(data['ProxyAdmin'], data['FeesVaultFactoryImplementation'], 'FeesVaultFactory');

  data = getDeploysData();

  let feesVaultFactory = await ethers.getContractAt('FeesVaultFactoryUpgradeable', data['FeesVaultFactory']);
  await feesVaultFactory.initialize(BLAST_GOVERNOR, BLAST_POINTS, BLAST_POINTS_OPERATOR, data['Voter'], data['FeesVaultImplementation'], {
    toGaugeRate: 0,
    recipients: ['0x9140D359f2855E6540609dd4A93773ED1f45f509'],
    rates: [10000],
  });

  let pairFactory = await ethers.getContractAt('PairFactoryUpgradeable', data['PairFactory']);
  await pairFactory.initialize(BLAST_GOVERNOR, BLAST_POINTS, BLAST_POINTS_OPERATOR, data['PairImplementation'], feesVaultFactory.target);

  await pairFactory.setIsPublicPoolCreationMode(true);

  await pairFactory.setProtocolFee(1000);

  await pairFactory.setConfigurationForRebaseToken(WETH, true, 2);
  await pairFactory.setConfigurationForRebaseToken(USDB, true, 2);

  await feesVaultFactory.grantRole(await feesVaultFactory.CLAIM_FEES_CALLER_ROLE(), '0x9140D359f2855E6540609dd4A93773ED1f45f509');
  await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), '0x9140D359f2855E6540609dd4A93773ED1f45f509');
  await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), V3_PAIR_FACTORY);
  await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), pairFactory.target);

  await pairFactory.setConfigurationForRebaseToken(USDB, true, 2);
  await pairFactory.setConfigurationForRebaseToken(WETH, true, 2);

  console.log('13_deploy_v1_1_changes -- finished');
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

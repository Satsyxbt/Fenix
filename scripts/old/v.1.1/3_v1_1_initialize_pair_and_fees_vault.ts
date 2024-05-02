import { deployProxy, getDeploysData } from '../../utils';
import { deployBase } from '../../utils';
import { ethers } from 'hardhat';

const WETH = '0x4300000000000000000000000000000000000004';
const USDB = '0x4300000000000000000000000000000000000003';
const BLAST_POINTS = '0x2536FE9ab3F511540F2f9e2eC2A805005C3Dd800';
const BLAST_POINTS_OPERATOR = '0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4';
const BLAST_GOVERNOR = '0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30';
const V3_PAIR_FACTORY = '0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df';
const DEPLOYER = '0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30';
const FENIX_TRESUARY = '0xAC12571907b0aEE0eFd2BC13505B88284d5854db';

async function main() {
  let data = getDeploysData();
  let feesVaultFactory = await ethers.getContractAt('FeesVaultFactoryUpgradeable', data['FeesVaultFactory']);
  await feesVaultFactory.initialize(BLAST_GOVERNOR, BLAST_POINTS, BLAST_POINTS_OPERATOR, data['Voter'], data['FeesVaultImplementation'], {
    toGaugeRate: 0,
    recipients: [FENIX_TRESUARY],
    rates: [10000],
  });

  let pairFactory = await ethers.getContractAt('PairFactoryUpgradeable', data['PairFactory']);
  await pairFactory.initialize(BLAST_GOVERNOR, BLAST_POINTS, BLAST_POINTS_OPERATOR, data['PairImplementation'], feesVaultFactory.target);

  await feesVaultFactory.grantRole(await feesVaultFactory.CLAIM_FEES_CALLER_ROLE(), DEPLOYER);
  await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), DEPLOYER);
  await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), V3_PAIR_FACTORY);
  await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), pairFactory.target);

  await pairFactory.grantRole(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), DEPLOYER);
  await pairFactory.grantRole(await pairFactory.FEES_MANAGER_ROLE(), DEPLOYER);

  await pairFactory.setProtocolFee(1000);

  await pairFactory.setConfigurationForRebaseToken(WETH, true, 2);
  await pairFactory.setConfigurationForRebaseToken(USDB, true, 2);

  await feesVaultFactory.setConfigurationForRebaseToken(WETH, true, 2);
  await feesVaultFactory.setConfigurationForRebaseToken(USDB, true, 2);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

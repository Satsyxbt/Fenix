import { ethers } from 'hardhat';
import { deployProxy, getDeployedDataFromDeploys, getDeploysData } from '../utils';
import { deployBase } from '../utils';

const FNX_fnUSDB_V3_PAIR = '0x3D4074Eb14bD269C82df3de111552A48b6b41018';
const fnUSD = '0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a';
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let data = getDeploysData();
  let t = await getDeployedDataFromDeploys();
  let ProxyAdmin = data['ProxyAdmin'];

  await deployBase('VeBoostUpgradeable', 'VeBoostImplementation');
  await deployBase('AlgebraFNXPriceProviderUpgradeable', 'AlgebraFNXPriceProviderImplementation');

  data = getDeploysData();

  await deployProxy(ProxyAdmin, data['VeBoostImplementation'], 'VeBoost');
  await deployProxy(ProxyAdmin, data['AlgebraFNXPriceProviderImplementation'], 'AlgebraFNXPriceProvider');

  data = getDeploysData();

  let algebraFNXPriceProvider = await ethers.getContractAt('AlgebraFNXPriceProviderUpgradeable', data['AlgebraFNXPriceProvider']);

  await algebraFNXPriceProvider.initialize(deployer.address, FNX_fnUSDB_V3_PAIR, t.Fenix.target, fnUSD);

  let veBoost = await ethers.getContractAt('VeBoostUpgradeable', data['VeBoost']);
  await veBoost.initialize(deployer.address, t.Fenix.target, t.VotingEscrow.target, data['AlgebraFNXPriceProvider']);

  await t.VotingEscrow.setVeBoost(veBoost.target);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

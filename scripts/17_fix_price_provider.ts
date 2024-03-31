import { ethers } from 'hardhat';
import { deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';

const FNX_fnUSDB_V3_PAIR = '0x73a432d0758aDED25C1A8Ba4610e20EA4aE28ca9';
const fnUSD = '0x9e0f170B90b66C8a0f32A2FDBfc06FC479970e3a';
async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let data = getDeploysData();
  let t = await getDeployedDataFromDeploys();
  let ProxyAdmin = data['ProxyAdmin'];
  data = getDeploysData();

  await deployProxy(ProxyAdmin, data['AlgebraFNXPriceProviderImplementation'], 'AlgebraFNXPriceProvider');

  data = getDeploysData();

  let algebraFNXPriceProvider = await ethers.getContractAt('AlgebraFNXPriceProviderUpgradeable', data['AlgebraFNXPriceProvider']);

  await algebraFNXPriceProvider.initialize(deployer.address, FNX_fnUSDB_V3_PAIR, data['Fenix'], fnUSD);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

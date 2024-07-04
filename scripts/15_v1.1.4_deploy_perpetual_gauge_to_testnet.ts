import { ethers } from 'hardhat';
import { deployBase, deployProxy, getDeployedDataFromDeploys, getDeploysData } from './utils';
import { PerpetualsGaugeUpgradeable, PerpetualsTradersRewarderUpgradeable, VoterUpgradeable } from '../typechain-types';
import { ZERO_ADDRESS } from '../test/utils/constants';

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  let data = getDeploysData();

  let ProxyAdmin = data['ProxyAdmin'];

  await deployBase('PerpetualsTradersRewarderUpgradeable', 'PerpetualsTradersRewarderImplementation');
  await deployBase('PerpetualsGaugeUpgradeable', 'PerpetualsGaugeImplementation');

  data = getDeploysData();

  await deployProxy(ProxyAdmin, data['PerpetualsGaugeImplementation'], 'PerpetualsGauge');
  await deployProxy(ProxyAdmin, data['PerpetualsTradersRewarderImplementation'], 'PerpetualsTradersRewarder');

  data = getDeploysData();

  let PerpetualsGaugeUpgradeable = (await ethers.getContractAt(
    'PerpetualsGaugeUpgradeable',
    data['PerpetualsGauge'],
  )) as any as PerpetualsGaugeUpgradeable;

  let Voter = (await ethers.getContractAt('VoterUpgradeableV1_2', data['Voter'])) as any as VoterUpgradeable;

  let PerpetualsTradersRewarderUpgradeable = (await ethers.getContractAt(
    'PerpetualsTradersRewarderUpgradeable',
    data['PerpetualsTradersRewarder'],
  )) as any as PerpetualsTradersRewarderUpgradeable;

  await PerpetualsGaugeUpgradeable.initialize(
    deployer.address,
    data['Fenix'],
    Voter.target,
    PerpetualsTradersRewarderUpgradeable.target,
    'Fenix Perpetual DEX',
  );
  await PerpetualsTradersRewarderUpgradeable.initialize(
    deployer.address,
    PerpetualsGaugeUpgradeable.target,
    data['Fenix'],
    deployer.address,
  );

  await Voter.createCustomGauge(
    PerpetualsGaugeUpgradeable.target,
    PerpetualsGaugeUpgradeable.target,
    data['Fenix'],
    ZERO_ADDRESS,
    'Fenix Bribes: Perpetual DEX',
    'Fenix Swap Fee: Perpetual DEX',
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

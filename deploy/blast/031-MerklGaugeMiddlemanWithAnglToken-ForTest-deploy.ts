import { ethers } from 'hardhat';
import { AliasDeployedContracts, deploy, getBlastGovernorAddress, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  let Instance = await deploy({
    name: InstanceName.MerklGaugeMiddleman,
    deployer: deployer,
    constructorArguments: [BlastGovernor, '0xa7c167f58833c5e25848837f45a1372491a535ed', '0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd'],
    saveAlias: 'MerklGaugeMiddlemanWithERC20MockToken',
    verify: true,
  });

  let MerklGaugeMiddleman = await ethers.getContractAt(InstanceName.MerklGaugeMiddleman, Instance.target);
  await logTx(MerklGaugeMiddleman, MerklGaugeMiddleman.transferOwnership('0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5'));
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

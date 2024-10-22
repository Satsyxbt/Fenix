import { ethers } from 'hardhat';
import { deploy, getBlastGovernorAddress, getDeployedContractsAddressList, logTx } from '../../utils/Deploy';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();

  let Token = await deploy({
    name: InstanceName.ERC20OwnableMock,
    deployer: deployer,
    constructorArguments: ['MerklGaugeMiddleman ERC20 Mock token', 'MGMEMT', 18],
    saveAlias: 'ERC20MockTokenForMerklGaugeMiddleman',
  });

  await deploy({
    name: InstanceName.MerklGaugeMiddleman,
    deployer: deployer,
    constructorArguments: [BlastGovernor, Token.target, '0x8BB4C975Ff3c250e0ceEA271728547f3802B36Fd'],
    saveAlias: 'MerklGaugeMiddlemanWithERC20MockToken',
    verify: true,
  });

  let ERC20OwnableMock = await ethers.getContractAt(InstanceName.ERC20OwnableMock, Token.target);
  await logTx(ERC20OwnableMock, ERC20OwnableMock.mint(deployer.address, ethers.parseEther('10000000')));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

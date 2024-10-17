import {
  AliasDeployedContracts,
  deploy,
  deployProxy,
  getBlastGovernorAddress,
  getDeployedContractsAddressList,
  getProxyAdminAddress,
  logTx,
} from '../../utils/Deploy';
import { ethers } from 'hardhat';
import { InstanceName } from '../../utils/Names';

async function main() {
  const [deployer] = await ethers.getSigners();
  const BlastGovernor = await getBlastGovernorAddress();
  const DeployedContracts = await getDeployedContractsAddressList();

  const TARGET_ADDRESS = '0x0907fb24626a06e383bd289a0e9c8560b8ccc4b5';

  const LIST = [
    AliasDeployedContracts.VotingEscrowUpgradeable_Proxy,
    AliasDeployedContracts.GaugeFactory_V2Pools_Proxy,
    AliasDeployedContracts.GaugeFactory_V3Pools_Proxy,
    AliasDeployedContracts.PairAPIUpgradeable_Proxy,
    AliasDeployedContracts.RewardAPIUpgradeable_Proxy,
    AliasDeployedContracts.VeNFTAPIUpgradeable_Proxy,
    AliasDeployedContracts.RouterV2PathProviderUpgradeable_Proxy,
    AliasDeployedContracts.MerklGaugeMiddleman,
  ];

  for (let i = 0; i < LIST.length; i++) {
    const AliasName = LIST[i];
    const contractAddress = DeployedContracts[AliasName];

    if (contractAddress) {
      const contract = await ethers.getContractAt('Ownable', contractAddress);
      await logTx(contract, contract.transferOwnership(TARGET_ADDRESS));
    } else {
      console.warn('Miss contract address for', AliasName);
      return;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

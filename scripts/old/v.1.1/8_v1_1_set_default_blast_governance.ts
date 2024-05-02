import { getDeployedDataFromDeploys, getDeploysData } from '../../utils';

const TARGET_BLAST_GOVERNOR = '0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4';

async function main() {
  let deploysData = await getDeployedDataFromDeploys();

  await deploysData.BribeFactory.setDefaultBlastGovernor(TARGET_BLAST_GOVERNOR);
  await deploysData.GaugeFactoryType.setDefaultBlastGovernor(TARGET_BLAST_GOVERNOR);
  await deploysData.GaugeFactoryType2.setDefaultBlastGovernor(TARGET_BLAST_GOVERNOR);
  await deploysData.GaugeFactoryType3.setDefaultBlastGovernor(TARGET_BLAST_GOVERNOR);
  await deploysData.PairFactory.setDefaultBlastGovernor(TARGET_BLAST_GOVERNOR);
  await deploysData.FeesVaultFactory.setDefaultBlastGovernor(TARGET_BLAST_GOVERNOR);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

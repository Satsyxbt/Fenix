import { ethers } from 'hardhat';

import list from './list.json';
import v2Pools from './pools_v2.json';
import v3Pools from './pools_v3.json';

const BLAST_ADDRESS = '0x4300000000000000000000000000000000000002';

async function main() {
  let infos: {
    address: string;
    etherBalance: bigint;
  }[] = [];

  let totalEthereumBalance = BigInt(0);
  const Blast = await ethers.getContractAt('IBlastMock', BLAST_ADDRESS);
  const FeesVaultFactory = await ethers.getContractAt('FeesVaultFactoryUpgradeable', '0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB');

  async function getAndPush(address: string) {
    let etherBalance = (await Blast.readGasParams(address)).etherBalance;
    if (etherBalance > BigInt(0)) {
      infos.push({
        address: address,
        etherBalance: (await Blast.readGasParams(address)).etherBalance,
      });
    }
  }
  await Promise.all(
    list.map(async (contract) => {
      await getAndPush(contract);
    }),
  );
  await Promise.all(
    v2Pools.map(async (pool) => {
      const pair = await ethers.getContractAt('Pair', pool);
      await getAndPush(pool);
      await getAndPush(await FeesVaultFactory.getVaultForPool(pool));
      await getAndPush(await pair.fees());
    }),
  );
  await Promise.all(
    v3Pools.map(async (pool) => {
      await getAndPush(pool);
      await getAndPush(await FeesVaultFactory.getVaultForPool(pool));
    }),
  );

  infos.sort((a, b) => {
    if (b.etherBalance > a.etherBalance) {
      return 1;
    } else if (b.etherBalance < a.etherBalance) {
      return -1;
    }
  });

  infos.forEach((t) => {
    console.log(t.address, ':', ethers.formatEther(t.etherBalance));
    totalEthereumBalance += t.etherBalance;
  });
  console.log();
  console.log('Total ethereum balance:', ethers.formatEther(totalEthereumBalance));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

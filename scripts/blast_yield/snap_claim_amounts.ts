import { ethers } from 'hardhat';

import v2Pools from './pools_v2.json';
import v3Pools from './pools_v3.json';

const USDB_ADDRESS = '0x4300000000000000000000000000000000000003';
const WETH_ADDRESS = '0x4300000000000000000000000000000000000004';

async function main() {
  let infos: {
    title: string;
    address: string;
    weth: bigint;
    usdb: bigint;
    feesVaultWeth: bigint;
    feesVaultUsdb: bigint;
    feesUsdb: bigint;
    feesWeth: bigint;
    feesVault: string;
    fees: string;
  }[] = [];

  let totalWETHToClaim = BigInt(0);
  let totalUSDBToClaim = BigInt(0);
  const USDB = await ethers.getContractAt('IERC20RebasingMock', USDB_ADDRESS);
  const WETH = await ethers.getContractAt('IERC20RebasingMock', WETH_ADDRESS);

  const FeesVaultFactory = await ethers.getContractAt('FeesVaultFactoryUpgradeable', '0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB');

  await Promise.all(
    v2Pools.map(async (pool) => {
      const pair = await ethers.getContractAt('Pair', pool);
      const token0 = await ethers.getContractAt('IERC20Metadata', await pair.token0());
      const token1 = await ethers.getContractAt('IERC20Metadata', await pair.token1());
      const token0Symbol = await token0.symbol();
      const token1Symbol = await token1.symbol();
      let info = {
        title: `V2 ${token0Symbol}-${token1Symbol} : ${pool}`,
        address: pool,
        weth: BigInt(0),
        usdb: BigInt(0),
        feesVaultWeth: BigInt(0),
        feesVaultUsdb: BigInt(0),
        feesWeth: BigInt(0),
        feesUsdb: BigInt(0),
        feesVault: ethers.ZeroAddress,
        fees: ethers.ZeroAddress,
      };
      info.feesVault = await FeesVaultFactory.getVaultForPool(pool);
      info.fees = await pair.fees();

      if ([token0.target, token1.target].includes(USDB_ADDRESS)) {
        info.usdb = await USDB.getClaimableAmount(pool);
        info.feesVaultUsdb = await USDB.getClaimableAmount(info.feesVault);
        info.feesUsdb = await USDB.getClaimableAmount(info.fees);
      }
      if ([token0.target, token1.target].includes(WETH_ADDRESS)) {
        info.weth = await WETH.getClaimableAmount(pool);
        info.feesVaultWeth = await WETH.getClaimableAmount(info.feesVault);
        info.feesWeth = await WETH.getClaimableAmount(info.fees);
      }
      infos.push(info);
    }),
  );
  await Promise.all(
    v3Pools.map(async (pool) => {
      const pair = await ethers.getContractAt('Pair', pool);
      const token0 = await ethers.getContractAt('IERC20Metadata', await pair.token0());
      const token1 = await ethers.getContractAt('IERC20Metadata', await pair.token1());
      const token0Symbol = await token0.symbol();
      const token1Symbol = await token1.symbol();
      let info = {
        title: `V3 ${token0Symbol}-${token1Symbol} : ${pool}`,
        address: pool,
        weth: BigInt(0),
        usdb: BigInt(0),
        feesVaultWeth: BigInt(0),
        feesVaultUsdb: BigInt(0),
        feesWeth: BigInt(0),
        feesUsdb: BigInt(0),
        feesVault: ethers.ZeroAddress,
        fees: ethers.ZeroAddress,
      };
      info.feesVault = await FeesVaultFactory.getVaultForPool(pool);

      if ([token0.target, token1.target].includes(USDB_ADDRESS)) {
        info.usdb = await USDB.getClaimableAmount(pool);
        info.feesVaultUsdb = await USDB.getClaimableAmount(info.feesVault);
      }
      if ([token0.target, token1.target].includes(WETH_ADDRESS)) {
        info.weth = await WETH.getClaimableAmount(pool);
        info.feesVaultWeth = await WETH.getClaimableAmount(info.feesVault);
      }
      infos.push(info);
    }),
  );

  infos.sort((a, b) => {
    if (b.usdb > a.usdb) {
      return 1;
    } else if (b.usdb < a.usdb) {
      return -1;
    }
  });

  infos.forEach((t) => {
    if (t.usdb > BigInt(0) || t.weth > BigInt(0)) {
      console.log(`${t.title}`);
      console.log(`\t USDB to claim: ${ethers.formatEther(t.usdb)}`);
      console.log(`\t WETH to claim: ${ethers.formatEther(t.weth)}`);
      console.log(`\t FeesVault: ${t.feesVault}`);
      console.log(`\t\t USDB to claim: ${ethers.formatEther(t.feesVaultUsdb)}`);
      console.log(`\t\t WETH to claim: ${ethers.formatEther(t.feesVaultWeth)}`);
      totalUSDBToClaim += t.feesVaultUsdb + t.usdb;
      totalWETHToClaim += t.feesVaultWeth + t.weth;
      if (t.fees != ethers.ZeroAddress) {
        console.log(`\t Fees: ${t.fees}`);
        console.log(`\t\t USDB to claim: ${ethers.formatEther(t.feesUsdb)}`);
        console.log(`\t\t WETH to claim: ${ethers.formatEther(t.feesWeth)}`);
        totalUSDBToClaim += t.feesUsdb;
        totalWETHToClaim += t.feesWeth;
      }
    }
  });
  console.log();
  console.log('Total USDB to claim:', ethers.formatEther(totalUSDBToClaim));
  console.log('Total WETH to claim:', ethers.formatEther(totalWETHToClaim));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { ethers } from 'hardhat';
import { DynamicFeeModuleTest, FenixV3Factory, Pair, PoolTest } from '../../typechain-types/index';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { PairFactoryUpgradeable } from '../typechain-types/contracts/dex/v2/thena';
import { ERC20Mock__factory } from '../typechain-types/factories/contracts/core/mocks';
import { ERC20Mock } from '../typechain-types/contracts/core/mocks';
import { factoryV2Fixture, factoryV3Fixture } from '../utils/fixture';
import bn from 'bignumber.js';
bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

export function encodePriceSqrt(reserve1: bigint | BigInt | number, reserve0: bigint | BigInt | number): bigint {
  return BigInt(new bn(reserve1.toString()).div(reserve0.toString()).sqrt().multipliedBy(new bn(2).pow(96)).integerValue(3).toString());
}

describe('MainCompare', function () {
  let deployer: HardhatEthersSigner;
  let others: HardhatEthersSigner[];
  let proxyAdmin: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;

  let factoryV2: PairFactoryUpgradeable;
  let factoryV3: FenixV3Factory;

  let v2Stable: Pair;
  let v2StableDynamicFeeModule: DynamicFeeModuleTest;

  let v3DynamicFeeModule: DynamicFeeModuleTest;
  let v3Pool: PoolTest;

  let erc20factory: ERC20Mock__factory;
  let token18: ERC20Mock;
  let token6: ERC20Mock;

  async function createV3Pool(factory: FenixV3Factory): Promise<{ feeModule: DynamicFeeModuleTest; pool: PoolTest }> {
    const DynamicFeeModuleFactory = await ethers.getContractFactory('DynamicFeeModuleTest');
    const MockFactory = await ethers.getContractFactory('PoolTest');

    const feeModule = (await DynamicFeeModuleFactory.deploy()) as any as DynamicFeeModuleTest;

    const mockPool = (await MockFactory.deploy()) as any as PoolTest;
    await feeModule.initialize(factory.target, mockPool.target, [3000 - 0.01e4, 15000 - 3000, 360, 60000, 59, 8500, 0.01e4]);

    return {
      feeModule: feeModule,
      pool: mockPool,
    };
  }

  before(async function () {
    [deployer, proxyAdmin, otherUser, ...others] = await ethers.getSigners();
    factoryV3 = await factoryV3Fixture(deployer, proxyAdmin);
    factoryV2 = await factoryV2Fixture(deployer, proxyAdmin);

    erc20factory = (await ethers.getContractFactory('ERC20Mock')) as ERC20Mock__factory;
    token18 = await erc20factory.deploy('WETH', 'WETH', 18);
    token6 = await erc20factory.deploy('USDT', 'USDT', 6);

    await factoryV2.createPair(token18.target, token6.target, true);

    const pairV2Factory = await ethers.getContractFactory('Pair');
    v2Stable = pairV2Factory.attach(await factoryV2.getPair(token18.target, token6.target, true)) as Pair;

    if ((await v2Stable.token0()) == token18.target) {
      console.log('WETH - token 0', await v2Stable.token0());
      console.log('USDT - token 1', await v2Stable.token1());
    } else {
      console.log('USDT - token 0', await v2Stable.token0());
      console.log('WETH - token 1', await v2Stable.token1());
    }

    const feeModuleFactory = await ethers.getContractFactory('DynamicFeeModuleTest');
    v2StableDynamicFeeModule = feeModuleFactory.attach(await v2Stable.feeModule()) as DynamicFeeModuleTest;

    const res = await createV3Pool(factoryV3);
    v3DynamicFeeModule = res.feeModule;
    v3Pool = res.pool;

    await v2StableDynamicFeeModule.setDynamicFeeConfiguration({
      alpha1: 2900,
      alpha2: 15000 - 3000,
      beta1: 360,
      beta2: 60000,
      gamma1: 59,
      gamma2: 8500,
      baseFee: 100,
    });
    await v3DynamicFeeModule.setDynamicFeeConfiguration({
      alpha1: 2900,
      alpha2: 15000 - 3000,
      beta1: 360,
      beta2: 60000,
      gamma1: 59,
      gamma2: 8500,
      baseFee: 100,
    });

    await v3Pool.initialize(v3DynamicFeeModule.target, encodePriceSqrt(1, 1));

    await token18.mint(v2Stable.target, ethers.parseEther('1'));
    await token6.mint(v2Stable.target, ethers.parseEther('1'));

    await v2Stable.mint(deployer.address);
  });

  async function printInfV2() {
    console.log(`v2DynamicFeeModule.getCurrentFee() , ${await v2StableDynamicFeeModule.getCurrentFee()}`);
    console.log(`v2Pool.fee() , ${await v2Stable.fee()}`);
    console.log(`v2Pool.sqrtPriceX96 , ${await v2Stable.sqrtPriceX96()}`);
    console.log(`v2Pool.tick , ${await v2Stable.tick()}`);
  }

  async function printInfV3() {
    console.log(`v3DynamicFeeModule.getCurrentFee() , ${await v3DynamicFeeModule.getCurrentFee()}`);
    console.log(`v3Pool.fee() , ${await v3Pool.fee()}`);
    console.log(`v3Pool.slot0().sqrtPriceX96 , ${(await v3Pool.slot0()).sqrtPriceX96}`);
    console.log(`v3Pool.slot0().tick , ${(await v3Pool.slot0()).tick}`);
  }
  describe('Dynamic fee', function () {
    it('initialize state', async function () {
      await printInfV3();
      await printInfV2();
    });
    it('test support dynamic fee', async function () {
      console.log('BEFORE');
      await printInfV3();
      await printInfV2();
      await v2StableDynamicFeeModule.advanceTime(30);
      await v3DynamicFeeModule.advanceTime(30);

      await token18.mint(v2Stable.target, ethers.parseEther('0.00025'));
      await v2Stable.sync();
      await v3Pool.swapToTick(await v2Stable.tick());

      console.log('AFTER');
      await printInfV3();
      await printInfV2();
    });
    it('test support dynamic fee', async function () {
      console.log('BEFORE');
      await printInfV3();
      await printInfV2();
      await v2StableDynamicFeeModule.advanceTime(30);
      await v3DynamicFeeModule.advanceTime(30);

      await token18.mint(v2Stable.target, ethers.parseEther('0.000101'));
      await v2Stable.sync();
      await v3Pool.swapToTick(await v2Stable.tick());

      console.log('AFTER');
      await printInfV3();
      await printInfV2();

      for (let index = 0; index < 50; index++) {
        console.log(index + ' BEFORE');
        await printInfV3();
        await printInfV2();
        await v2StableDynamicFeeModule.advanceTime(3600);
        await v3DynamicFeeModule.advanceTime(3600);

        await token18.mint(v2Stable.target, ethers.parseEther('0.000101'));
        await v2Stable.sync();
        await v3Pool.swapToTick(await v2Stable.tick());

        console.log('AFTER');
        await printInfV3();
        await printInfV2();
      }
    });
  });
});

import { ethers } from 'hardhat';
import { DynamicFeeModuleTest, Pair } from '../../typechain-types/index';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { PairFactoryUpgradeable } from '../typechain-types/contracts/dex/v2/thena';
import { ERC20Mock__factory } from '../typechain-types/factories/contracts/core/mocks';
import { ERC20Mock } from '../typechain-types/contracts/core/mocks';
import { factoryV2Fixture } from '../utils/fixture';

describe('asdasd', function () {
  let deployer: HardhatEthersSigner;
  let others: HardhatEthersSigner[];
  let proxyAdmin: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;

  let factoryV2: PairFactoryUpgradeable;
  let v2Stable: Pair;
  let v2StableDynamicFeeModule: DynamicFeeModuleTest;

  let v2Volatility: Pair;
  let v2VolatilityDynamicFeeModule: DynamicFeeModuleTest;
  let erc20factory: ERC20Mock__factory;
  let token18: ERC20Mock;
  let token6: ERC20Mock;

  before(async function () {
    [deployer, proxyAdmin, otherUser, ...others] = await ethers.getSigners();

    factoryV2 = await factoryV2Fixture(deployer, proxyAdmin);

    erc20factory = (await ethers.getContractFactory('ERC20Mock')) as ERC20Mock__factory;
    token18 = await erc20factory.deploy('WETH', 'WETH', 18);
    token6 = await erc20factory.deploy('USDT', 'USDT', 18);

    await factoryV2.createPair(token18.target, token6.target, false);
    await factoryV2.createPair(token18.target, token6.target, true);

    const pairV2Factory = await ethers.getContractFactory('Pair');
    v2Stable = pairV2Factory.attach(await factoryV2.getPair(token18.target, token6.target, true)) as Pair;
    v2Volatility = pairV2Factory.attach(await factoryV2.getPair(token18.target, token6.target, false)) as Pair;

    if ((await v2Stable.token0()) == token18.target) {
      console.log('WETH - token 0', await v2Stable.token0());
      console.log('USDT - token 1', await v2Stable.token1());
    } else {
      console.log('USDT - token 0', await v2Stable.token0());
      console.log('WETH - token 1', await v2Stable.token1());
    }

    const feeModuleFactory = await ethers.getContractFactory('DynamicFeeModuleTest');
    v2StableDynamicFeeModule = feeModuleFactory.attach(await v2Stable.feeModule()) as DynamicFeeModuleTest;
    v2VolatilityDynamicFeeModule = feeModuleFactory.attach(await v2Volatility.feeModule()) as DynamicFeeModuleTest;
  });

  async function printInfV2(pair: Pair) {
    return `--- fee() ${await pair.fee()}, --- tick() ${await pair.tick()}, --sqrtPriceX96() ${await pair.sqrtPriceX96()}`;
  }
  async function print(title: string) {
    console.log(title);
    console.log(`-- v2Stable`, await printInfV2(v2Stable));
  }
  describe('Dynamic fee', function () {
    it('test support dynamic fee', async function () {
      await print(`Before first mint:`);
      await token18.mint(v2Stable.target, ethers.parseEther('1'));
      await token6.mint(v2Stable.target, ethers.parseEther('1'));

      await v2Stable.mint(deployer.address);

      await token18.mint(v2Volatility.target, ethers.parseEther('1'));
      await token6.mint(v2Volatility.target, ethers.parseEther('1'));
      await v2Volatility.mint(deployer.address);

      await print(`After first mint:`);
      for (let index = 0; index < 50; index++) {
        await v2StableDynamicFeeModule.advanceTime(1800);
        await token18.mint(v2Stable.target, ethers.parseEther('0.0001'));
        await v2Stable.sync();
        await print(`After swap:`);
      }
      // await token18.mint(v2Stable.target, ethers.parseEther('0.00025'));
      // await token18.mint(v2Volatility.target, ethers.parseEther('0.00025'));
      // await v2Stable.sync();
      // await v2Volatility.sync();

      // await v2StableDynamicFeeModule.advanceTime(30);

      // await token18.mint(v2Stable.target, 1e5);
      // await token18.mint(v2Volatility.target, 1e5);

      // await v2Stable.swap(0, 1e4, deployer.address, '0x');
      // await v2Volatility.swap(0, 1e4, deployer.address, '0x');

      // await print(`After swap:`);
      // await token18.mint(v2Stable.target, ethers.parseEther('0.00025'));
      // await token18.mint(v2Volatility.target, ethers.parseEther('0.00025'));
      // await v2Stable.sync();
      // await v2Volatility.sync();

      // await v2StableDynamicFeeModule.advanceTime(30);

      // await token18.mint(v2Stable.target, 1e5);
      // await token18.mint(v2Volatility.target, 1e5);

      // await v2Stable.swap(0, 1e4, deployer.address, '0x');
      // await v2Volatility.swap(0, 1e4, deployer.address, '0x');

      // await print(`After swap:`);
      // await token18.mint(v2Stable.target, ethers.parseEther('0.1'));
      // await token18.mint(v2Volatility.target, ethers.parseEther('0.1'));

      // await v2StableDynamicFeeModule.advanceTime(30);

      // await v2Stable.sync();
      // await v2Volatility.sync();

      // await print(`After swap:`);
      // await v2StableDynamicFeeModule.advanceTime(3600);

      // await token18.mint(v2Stable.target, ethers.parseEther('2'));
      // await token18.mint(v2Volatility.target, ethers.parseEther('2'));

      // await v2Stable.sync();
      // await v2Volatility.sync();

      // await print(`After swap:`);
    });
  });
});

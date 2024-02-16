import { ethers } from 'hardhat';
import { UniV2ToV3MathTest } from '../../typechain-types/index';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import bn from 'bignumber.js';
import { expect, use } from 'chai';
import { TickMathTest } from '../typechain-types/contracts/dex/v3/core/test';
import Decimal from 'decimal.js';

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

const MIN_SQRT_RATIO = BigInt('4295128739');
const MAX_SQRT_RATIO = BigInt('1461446703485210103287273052203988822378723970342');
const ONE = BigInt(1);
const Q_127 = BigInt(2) ** BigInt(127);
const Q96 = BigInt(2) ** BigInt(96);
const Q192 = Q96 ** BigInt(2);
// returns the sqrt price as a 64x96
export function encodePriceSqrt(reserve1: bigint | BigInt | number, reserve0: bigint | BigInt | number): bigint {
  return BigInt(new bn(reserve1.toString()).div(reserve0.toString()).sqrt().multipliedBy(new bn(2).pow(96)).integerValue(3).toString());
}

describe('Test 123', function () {
  let deployer: HardhatEthersSigner;
  let others: HardhatEthersSigner[];
  let otherUser: HardhatEthersSigner;

  let UniV2ToV3Math: UniV2ToV3MathTest;
  let tickMath: TickMathTest;

  const MIN_TICK = -887272;
  const MAX_TICK = 887272;

  before(async function () {
    [deployer, otherUser, ...others] = await ethers.getSigners();

    const UniV2ToV3MathTestFactory = await ethers.getContractFactory('UniV2ToV3MathTest');
    UniV2ToV3Math = await UniV2ToV3MathTestFactory.deploy();

    const factory = await ethers.getContractFactory('TickMathTest');
    tickMath = (await factory.deploy()) as TickMathTest;
  });

  describe('it', async () => {
    it('1/1', async () => {
      expect(encodePriceSqrt(1, 1)).to.be.eq(Q96);
      expect(await UniV2ToV3Math.calculateSqrtRatio(1, 1)).to.be.eq(Q96);
    });

    it('100/1', async () => {
      expect(encodePriceSqrt(100, 1)).to.be.eq(BigInt('792281625142643375935439503360'));
      expect(await UniV2ToV3Math.calculateSqrtRatio(100, 1)).to.be.eq(BigInt('792281625142643375935439503360'));
    });

    it('1/100', async () => {
      expect(encodePriceSqrt(1, 100)).to.be.eq(BigInt('7922816251426433759354395033'));
      expect(await UniV2ToV3Math.calculateSqrtRatio(1, 100)).to.be.eq(BigInt('7922816251426433759354395033'));
    });

    it('111/333', async () => {
      expect(encodePriceSqrt(111, 333)).to.be.eq(BigInt('45742400955009932534161870629'));
      expect(await UniV2ToV3Math.calculateSqrtRatio(111, 333)).to.be.eq(BigInt('45742400955009932534161870629'));
    });

    it('333/111', async () => {
      expect(encodePriceSqrt(333, 111)).to.be.eq(BigInt('137227202865029797602485611888'));
      expect(await UniV2ToV3Math.calculateSqrtRatio(333, 111)).to.be.eq(BigInt('137227202865029797602485611888'));
    });

    it('101e6/100e18', async () => {
      expect(encodePriceSqrt(101e6, 100e18)).to.be.eq(BigInt('79623317895830914510639'));
      expect(await UniV2ToV3Math.calculateSqrtRatio(101e6, 100e18)).to.be.eq(BigInt('79623317895830914510639'));
    });
    it('100e18/101e6', async () => {
      expect(encodePriceSqrt(100e18, 101e6)).to.be.eq(BigInt('137227202865029797602485611888'));
      expect(await UniV2ToV3Math.calculateSqrtRatio(100e18, 101e6)).to.be.eq(BigInt('137227202865029797602485611888'));
    });
    it('weth/usdt', async () => {
      expect(await UniV2ToV3Math.calculateSqrtRatio(1e18, 3000e6)).to.be.eq(BigInt('4339505179874779489431521786241532828'));
      expect(encodePriceSqrt(1e18, 3000e6)).to.be.eq(BigInt('4339505179874779489431521786241532828'));
    });

    it('1e18, 1e18', async () => {
      console.log(
        'await UniV2ToV3Math.calculateSqrtRatio(1e18, 1e18)',
        await UniV2ToV3Math.calculateSqrtRatio(ethers.parseEther('1'), ethers.parseEther('1')),
      );
      console.log('encodePriceSqrt', encodePriceSqrt(ethers.parseEther('1'), ethers.parseEther('1')));
      console.log(
        'tick from calculateSqrtRatio',
        await tickMath.getTickAtSqrtRatio(await UniV2ToV3Math.calculateSqrtRatio(ethers.parseEther('1'), ethers.parseEther('1'))),
      );
      console.log(
        'tick from encodePriceSqrt',
        await tickMath.getTickAtSqrtRatio(encodePriceSqrt(ethers.parseEther('1'), ethers.parseEther('1'))),
      );
      console.log('Change price, 0.02%');

      console.log(
        'await UniV2ToV3Math.calculateSqrtRatio(1.0002e18, 1e18)',
        await UniV2ToV3Math.calculateSqrtRatio(ethers.parseEther('1.00025'), ethers.parseEther('1')),
      );
      console.log('encodePriceSqrt', encodePriceSqrt(ethers.parseEther('1.00025'), ethers.parseEther('1')));

      console.log(
        'tick from calculateSqrtRatio',
        await tickMath.getTickAtSqrtRatio(await UniV2ToV3Math.calculateSqrtRatio(ethers.parseEther('1.00025'), ethers.parseEther('1'))),
      );
      console.log(
        'tick from encodePriceSqrt',
        await tickMath.getTickAtSqrtRatio(encodePriceSqrt(ethers.parseEther('1.00025'), ethers.parseEther('1'))),
      );
    });
  });
});

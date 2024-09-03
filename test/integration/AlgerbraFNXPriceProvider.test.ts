import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ONE_ETHER, ZERO_ADDRESS } from '../utils/constants';

import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import {
  AlgebraFNXPriceProviderUpgradeable,
  AlgebraFNXPriceProviderUpgradeable__factory,
  ERC20Mock,
  Fenix,
  PoolMock,
} from '../../typechain-types';
import {
  FactoryFixture,
  SignersList,
  deployAlgebraCore,
  deployERC20MockToken,
  deployFenixToken,
  deployTransaperntUpgradeableProxy,
  getSigners,
  mockBlast,
} from '../utils/coreFixture';

describe('AlgebraFNXPriceProvider', function () {
  let signers: SignersList;

  let factory: AlgebraFNXPriceProviderUpgradeable__factory;
  let implementation: AlgebraFNXPriceProviderUpgradeable;
  let priceProvider: AlgebraFNXPriceProviderUpgradeable;

  let fenix: Fenix;
  let tokenTR6: ERC20Mock;
  let tokenTR18: ERC20Mock;

  let poolMock: PoolMock;

  let algebraCore: FactoryFixture;

  beforeEach(async function () {
    signers = await getSigners();

    let blastPointsMock = await mockBlast();

    fenix = await deployFenixToken(signers.deployer, signers.blastGovernor.address, signers.deployer.address);
    tokenTR6 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);
    tokenTR18 = await deployERC20MockToken(signers.deployer, 'TR18', 'TR18', 18);
    poolMock = await ethers.deployContract('PoolMock');

    factory = await ethers.getContractFactory('AlgebraFNXPriceProviderUpgradeable');
    implementation = await factory.deploy(signers.deployer.address);
    priceProvider = factory.attach(
      await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress()),
    ) as AlgebraFNXPriceProviderUpgradeable;

    await priceProvider.initialize(signers.blastGovernor.address, poolMock.target, fenix.target, tokenTR6.target);

    algebraCore = await deployAlgebraCore(await blastPointsMock.getAddress());

    await algebraCore.factory.grantRole(await algebraCore.factory.POOLS_CREATOR_ROLE(), signers.deployer.address);

    await poolMock.setTick(0);
    await poolMock.setUnlocked(true);
    await poolMock.setTokens(fenix.target, tokenTR6.target);
  });

  describe('Deployment', function () {
    it('Should fail if try initialize on implementation', async function () {
      await expect(implementation.initialize(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith(
        ERRORS.Initializable.Initialized,
      );
    });
    it('Should fail if try second time to initialize', async function () {
      await expect(
        priceProvider.initialize(signers.blastGovernor.address, poolMock.target, fenix.target, tokenTR6.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should fail if try set zero address', async function () {
      let pp = factory.attach(
        await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress()),
      ) as AlgebraFNXPriceProviderUpgradeable;

      await expect(pp.initialize(ZERO_ADDRESS, poolMock.target, fenix.target, tokenTR6.target)).to.be.revertedWithCustomError(
        pp,
        'AddressZero',
      );
      await expect(pp.initialize(signers.blastGovernor.address, ZERO_ADDRESS, fenix.target, tokenTR6.target)).to.be.revertedWithCustomError(
        pp,
        'AddressZero',
      );
      await expect(
        pp.initialize(signers.blastGovernor.address, poolMock.target, ZERO_ADDRESS, tokenTR6.target),
      ).to.be.revertedWithCustomError(pp, 'AddressZero');
      await expect(pp.initialize(signers.blastGovernor.address, poolMock.target, fenix.target, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        pp,
        'AddressZero',
      );
    });

    describe('Should corect setup and calculate initial parameters', async () => {
      it('other parameters', async function () {
        expect(await priceProvider.FNX()).to.be.eq(fenix.target);
        expect(await priceProvider.pool()).to.be.eq(poolMock.target);
        expect(await priceProvider.USD()).to.be.eq(tokenTR6.target);
      });

      it('for usd with 6 decimals', async function () {
        expect(await priceProvider.ONE_USD()).to.be.eq(1e6);
      });

      it('for usd with 18 decimals', async function () {
        let pp = factory.attach(
          await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress()),
        ) as AlgebraFNXPriceProviderUpgradeable;

        await pp.initialize(signers.blastGovernor.address, poolMock.target, fenix.target, tokenTR18.target);
        expect(await pp.ONE_USD()).to.be.eq(ethers.parseEther('1'));
      });
    });

    describe('#currentTick', async () => {
      it('Should fail if pool locked', async () => {
        await poolMock.setUnlocked(false);
        await expect(priceProvider.currentTick()).to.be.revertedWithCustomError(priceProvider, 'PoolIsLocked');
      });
      it('Should corect return current pool tick', async () => {
        expect(await priceProvider.currentTick()).to.be.eq(0);

        await poolMock.setTick(1);

        expect(await priceProvider.currentTick()).to.be.eq(1);

        await poolMock.setTick(-5);
        expect(await priceProvider.currentTick()).to.be.eq(-5);

        await poolMock.setTick(28965);
        expect(await priceProvider.currentTick()).to.be.eq(28965);
      });
    });

    const sqrtPriceToPrice = (sqrtPriceX96: bigint, token0Decimals: number, token1Decimals: number) => {
      let mathPrice = Number(sqrtPriceX96) ** 2 / 2 ** 192;
      const decimalAdjustment = 10 ** (token0Decimals - token1Decimals);
      const price = mathPrice * decimalAdjustment;
      return price;
    };

    describe('#getUsdToFNXPrice', async () => {
      const TEST = [
        {
          usdTokenDecimals: 6,
          fnxPer1USD: ONE_ETHER * BigInt(2360),
          fenixReserve: ethers.parseEther('2360'),
          usdReserve: 1e6,
        },
        {
          usdTokenDecimals: 6,
          fnxPer1USD: ONE_ETHER,
          fenixReserve: ethers.parseEther('1'),
          usdReserve: 1e6,
        },
        {
          usdTokenDecimals: 6,
          fnxPer1USD: ONE_ETHER * BigInt(2),
          fenixReserve: ethers.parseEther('2'),
          usdReserve: 1e6,
        },
        {
          usdTokenDecimals: 6,
          fnxPer1USD: ONE_ETHER * BigInt(30),
          fenixReserve: ethers.parseEther('30'),
          usdReserve: 1e6,
        },
        {
          usdTokenDecimals: 6,
          fnxPer1USD: ethers.parseEther('1.256'),
          fenixReserve: ethers.parseEther('1256'),
          usdReserve: 1000e6,
        },
        {
          usdTokenDecimals: 6,
          fnxPer1USD: ethers.parseEther('13.4121996'),
          fenixReserve: ethers.parseEther('7256'),
          usdReserve: 541e6,
        },
        {
          usdTokenDecimals: 6,
          fnxPer1USD: ethers.parseEther('0.5'),
          fenixReserve: ethers.parseEther('270.5'),
          usdReserve: 541e6,
        },
        {
          usdTokenDecimals: 18,
          fnxPer1USD: ONE_ETHER,
          fenixReserve: ethers.parseEther('1'),
          usdReserve: ethers.parseEther('1'),
        },
        {
          usdTokenDecimals: 18,
          fnxPer1USD: ONE_ETHER * BigInt(2),
          fenixReserve: ethers.parseEther('2'),
          usdReserve: ethers.parseEther('1'),
        },
        {
          usdTokenDecimals: 18,
          fnxPer1USD: ONE_ETHER * BigInt(30),
          fenixReserve: ethers.parseEther('30'),
          usdReserve: ethers.parseEther('1'),
        },
        {
          usdTokenDecimals: 18,
          fnxPer1USD: ethers.parseEther('1.256'),
          fenixReserve: ethers.parseEther('1256'),
          usdReserve: ethers.parseEther('1000'),
        },
        {
          usdTokenDecimals: 18,
          fnxPer1USD: ethers.parseEther('13.4121996'),
          fenixReserve: ethers.parseEther('7256'),
          usdReserve: ethers.parseEther('541'),
        },
        {
          usdTokenDecimals: 18,
          fnxPer1USD: ethers.parseEther('0.01'),
          fenixReserve: ethers.parseEther('1'),
          usdReserve: ethers.parseEther('100'),
        },
        {
          usdTokenDecimals: 21,
          fnxPer1USD: ONE_ETHER,
          fenixReserve: ethers.parseEther('1'),
          usdReserve: ethers.parseEther('1000'),
        },
        {
          usdTokenDecimals: 21,
          fnxPer1USD: ONE_ETHER * BigInt(2),
          fenixReserve: ethers.parseEther('2'),
          usdReserve: ethers.parseEther('1000'),
        },
        {
          usdTokenDecimals: 21,
          fnxPer1USD: ONE_ETHER * BigInt(30),
          fenixReserve: ethers.parseEther('30'),
          usdReserve: ethers.parseEther('1000'),
        },
        {
          usdTokenDecimals: 21,
          fnxPer1USD: ethers.parseEther('1.256'),
          fenixReserve: ethers.parseEther('1256'),
          usdReserve: ethers.parseEther('1000000'),
        },
        {
          usdTokenDecimals: 21,
          fnxPer1USD: ethers.parseEther('13.4121996'),
          fenixReserve: ethers.parseEther('7256'),
          usdReserve: ethers.parseEther('541000'),
        },
        {
          usdTokenDecimals: 21,
          fnxPer1USD: ethers.parseEther('0.3333'),
          fenixReserve: ethers.parseEther('110'),
          usdReserve: ethers.parseEther('330000'),
        },
      ];
      for (const iterator of TEST) {
        it(`usdDecimals: ${iterator.usdTokenDecimals} fnxPerOneUsd: ${ethers.formatEther(iterator.fnxPer1USD)}`, async () => {
          let token = await deployERC20MockToken(signers.deployer, 'T', 'T', iterator.usdTokenDecimals);

          let deployedPoolAddr = await algebraCore.factory.createPool.staticCall(fenix.target, token.target);

          await algebraCore.factory.createPool(fenix.target, token.target);

          let pool = await ethers.getContractAt(POOL_ABI, deployedPoolAddr);

          let price = encodePriceSqrt(iterator.usdReserve, iterator.fenixReserve);
          if ((await pool.token0()) == token.target) {
            price = encodePriceSqrt(iterator.fenixReserve, iterator.usdReserve);
            console.log('sqrtPriceToPrice', sqrtPriceToPrice(price, iterator.usdTokenDecimals, 18));
          } else {
            console.log('sqrtPriceToPrice', 1 / sqrtPriceToPrice(price, 18, iterator.usdTokenDecimals));
          }

          await pool.initialize(price);

          let pp = factory.attach(
            await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress()),
          ) as AlgebraFNXPriceProviderUpgradeable;

          await pp.initialize(signers.blastGovernor.address, pool.target, fenix.target, token.target);

          console.log(ethers.formatEther(await pp.getUsdToFNXPrice()));
          expect(await pp.getUsdToFNXPrice()).to.be.closeTo(iterator.fnxPer1USD, iterator.fnxPer1USD / BigInt(1000));
        });
      }
    });
  });
});

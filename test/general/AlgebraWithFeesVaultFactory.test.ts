import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import {
  abi as CALLE_ABI,
  bytecode as CALLE_BYTECODE,
} from '@cryptoalgebra/integral-core/artifacts/contracts/test/TestAlgebraCallee.sol/TestAlgebraCallee.json';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock } from '../../typechain-types';
import { ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, FactoryFixture, deployAlgebraCore, deployERC20MockToken } from '../utils/coreFixture';

import { createPoolFunctions, encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { TestAlgebraCallee__factory } from '@cryptoalgebra/integral-core/typechain';

describe('AlgebraWithFeesVaultFactory', function () {
  let deployed: CoreFixtureDeployed;
  let signers: {
    deployer: HardhatEthersSigner;
    blastGovernor: HardhatEthersSigner;
    fenixTeam: HardhatEthersSigner;
    proxyAdmin: HardhatEthersSigner;
    otherUser1: HardhatEthersSigner;
    otherUser2: HardhatEthersSigner;
    otherUser3: HardhatEthersSigner;
    otherUser4: HardhatEthersSigner;
    otherUser5: HardhatEthersSigner;
  };
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let tokenTK9: ERC20Mock;
  let algebraCore: FactoryFixture;

  before('deployed', async () => {
    deployed = await loadFixture(completeFixture);
    algebraCore = await deployAlgebraCore(await deployed.blastPoints.getAddress());

    signers = deployed.signers;

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);
    tokenTK9 = await deployERC20MockToken(deployed.signers.deployer, 'TK9', 'TK9', 9);
  });

  it('Correct change feesVault for algebraFactory', async () => {
    expect(await algebraCore.factory.vaultFactory()).to.be.not.eq(deployed.feesVaultFactory.target);
    await algebraCore.factory.setVaultFactory(deployed.feesVaultFactory.target);
    await deployed.feesVaultFactory.grantRole(await deployed.feesVaultFactory.WHITELISTED_CREATOR_ROLE(), algebraCore.factory.target);

    expect(await algebraCore.factory.vaultFactory()).to.be.eq(deployed.feesVaultFactory.target);
    expect(await algebraCore.factory.vaultFactory()).to.be.not.eq(algebraCore.vault.target);
  });

  it('Should corect deploy new pair with new feesVault factory', async () => {
    let factory = algebraCore.factory;
    await factory.grantRole(await factory.POOLS_CREATOR_ROLE(), signers.deployer.address);

    let deployedPoolAddr = await factory.createPool.staticCall(tokenTK18.target, tokenTK6.target);
    expect(await deployed.feesVaultFactory.getVaultForPool(deployedPoolAddr)).to.be.eq(ZERO_ADDRESS);

    await factory.createPool(tokenTK18.target, tokenTK6.target);

    expect(await factory.poolByPair(tokenTK18.target, tokenTK6.target)).to.be.eq(deployedPoolAddr);
    expect(await deployed.feesVaultFactory.getVaultForPool(deployedPoolAddr)).to.be.not.eq(ZERO_ADDRESS);

    let pool = await ethers.getContractAt(POOL_ABI, deployedPoolAddr);
    await pool.initialize(encodePriceSqrt(1, 1));

    expect(await deployed.feesVaultFactory.getVaultForPool(deployedPoolAddr)).to.be.eq(await pool.communityVault());
    expect(await deployed.feesVaultFactory.getVaultForPool(deployedPoolAddr)).to.be.not.eq(ZERO_ADDRESS);

    await factory.createPool(tokenTK18.target, tokenTK9.target);
    expect(await deployed.feesVaultFactory.getVaultForPool(deployedPoolAddr)).to.be.not.eq(
      await deployed.feesVaultFactory.getVaultForPool(await factory.poolByPair(tokenTK18.target, tokenTK9.target)),
    );
  });

  it('Should corect transfer fee to feesVault which was created', async () => {
    let factory = algebraCore.factory;
    let deployedPoolAddr = await factory.poolByPair(tokenTK18.target, tokenTK6.target);
    let pool = await ethers.getContractAt(POOL_ABI, deployedPoolAddr);

    let feesVault = await ethers.getContractAt('FeesVaultUpgradeable', await pool.communityVault());

    expect(await tokenTK18.balanceOf(feesVault.target)).to.be.eq(ZERO);
    expect(await tokenTK6.balanceOf(feesVault.target)).to.be.eq(ZERO);

    let callerFactory = (await ethers.getContractFactory(CALLE_ABI, CALLE_BYTECODE)) as any as TestAlgebraCallee__factory;
    let caller = await callerFactory.deploy();

    let poolFunctions = await createPoolFunctions({
      swapTarget: caller,
      token0: tokenTK18 as any,
      token1: tokenTK6 as any,
      pool: pool as any,
    });

    await tokenTK18.mint(signers.deployer.address, ethers.parseEther('10000'));
    await tokenTK6.mint(signers.deployer.address, ethers.parseEther('100000'));

    await poolFunctions.mint(signers.deployer.address, -60, 60, ethers.parseEther('1'));

    expect(await tokenTK18.balanceOf(feesVault.target)).to.be.eq(ZERO);
    expect(await tokenTK6.balanceOf(feesVault.target)).to.be.eq(ZERO);

    expect(await pool.totalFeeGrowth0Token()).to.be.eq(ZERO);
    expect(await pool.totalFeeGrowth1Token()).to.be.eq(ZERO);

    await pool.setCommunityFee(100); // 100%

    if ((await pool.token0()) == tokenTK18.target) {
      await poolFunctions.swap0ForExact1(ethers.parseEther('1'), '0x0000000000000000000000000000000000000001');
    } else {
      await poolFunctions.swap1ForExact0(ethers.parseEther('1'), '0x0000000000000000000000000000000000000001');
    }

    expect(await tokenTK18.balanceOf(feesVault.target)).to.be.greaterThan(ZERO);
    expect(await tokenTK6.balanceOf(feesVault.target)).to.be.eq(ZERO);
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  FeesVaultFactoryUpgradeable,
  IERC20RebasingMock,
  PairFactoryUpgradeable,
  PairFactoryUpgradeable__factory,
} from '../../typechain-types';
import { USDB_PREDEPLOYED_ADDRESS, WETH_PREDEPLOYED_ADDRESS, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';

const PRECISION = 10000;
describe('PairFactoryUpgradeable Contract', function () {
  if (process.env.BLAST_FORK === 'true') {
    const BLAST_POINTS_TESTNET_CONTRACT = '0x2fc95838c71e76ec69ff817983BFf17c710F34E0';

    let signers: SignersList;
    let pairFactoryFactory: PairFactoryUpgradeable__factory;
    let pairFactory: PairFactoryUpgradeable;
    let feesVaultFactory: FeesVaultFactoryUpgradeable;
    let deployed: CoreFixtureDeployed;
    let tokenTK18: ERC20Mock;
    let tokenTK6: ERC20Mock;
    let poolAddress: string;
    let poolAddress2: string;

    beforeEach(async function () {
      deployed = await loadFixture(completeFixture);
      signers = deployed.signers;

      pairFactoryFactory = await ethers.getContractFactory('PairFactoryUpgradeable');
      pairFactory = deployed.v2PairFactory;
      feesVaultFactory = deployed.feesVaultFactory;

      tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
      tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

      await deployed.feesVaultFactory.grantRole(await deployed.feesVaultFactory.WHITELISTED_CREATOR_ROLE(), pairFactory.target);
      await deployed.feesVaultFactory.grantRole(await deployed.feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
      await pairFactory.grantRole(await pairFactory.PAIRS_ADMINISTRATOR_ROLE(), signers.deployer.address);

      await deployed.feesVaultFactory.setDefaultBlastPoints(BLAST_POINTS_TESTNET_CONTRACT);
      await pairFactory.setDefaultBlastPoints(BLAST_POINTS_TESTNET_CONTRACT);

      await pairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
      await pairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, true);
      poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);
      poolAddress2 = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, false);
    });

    describe('#createPair', async () => {
      it('success create pair and set rebase mode for tokens in feesVault, fees, pair', async () => {
        await pairFactory.setConfigurationForRebaseToken(WETH_PREDEPLOYED_ADDRESS, true, 2);
        await feesVaultFactory.setConfigurationForRebaseToken(WETH_PREDEPLOYED_ADDRESS, true, 2);

        let pairAddr = await pairFactory.createPair.staticCall(WETH_PREDEPLOYED_ADDRESS, tokenTK6.target, false);
        await pairFactory.createPair(WETH_PREDEPLOYED_ADDRESS, tokenTK6.target, false);

        let weth = (await ethers.getContractAt('IERC20RebasingMock', WETH_PREDEPLOYED_ADDRESS)) as any as IERC20RebasingMock;

        let fees = await (await ethers.getContractAt('Pair', pairAddr)).fees();
        let feesVault = await feesVaultFactory.getVaultForPool(pairAddr);

        expect(await weth.getConfiguration(fees)).to.be.eq(2);
        expect(await weth.getConfiguration(feesVault)).to.be.eq(2);
        expect(await weth.getConfiguration(pairAddr)).to.be.eq(2);
      });
      it('success create pair and set blast points operator for fees, vaults and pair', async () => {
        let points = await ethers.getContractAt('BlastPointsMock', BLAST_POINTS_TESTNET_CONTRACT);
        let pairAddr = await pairFactory.createPair.staticCall(WETH_PREDEPLOYED_ADDRESS, tokenTK6.target, false);

        expect(await points.operatorMap(pairAddr)).to.be.eq(ZERO_ADDRESS);
        await pairFactory.createPair(WETH_PREDEPLOYED_ADDRESS, tokenTK6.target, false);

        expect(await points.operatorMap(pairAddr)).to.be.eq(signers.blastGovernor.address);

        let fees = await (await ethers.getContractAt('Pair', pairAddr)).fees();

        expect(await points.operatorMap(fees)).to.be.eq(signers.blastGovernor.address);
        expect(await points.operatorMap(await feesVaultFactory.getVaultForPool(pairAddr))).to.be.eq(signers.blastGovernor.address);
      });
      it('success create pair and set default configuration mode for token0', async () => {
        await pairFactory.setConfigurationForRebaseToken(WETH_PREDEPLOYED_ADDRESS, true, 1);
        let weth = (await ethers.getContractAt('IERC20RebasingMock', WETH_PREDEPLOYED_ADDRESS)) as any as IERC20RebasingMock;
        let pairAddr = await pairFactory.createPair.staticCall(WETH_PREDEPLOYED_ADDRESS, tokenTK6.target, false);

        expect(await weth.getConfiguration(pairAddr)).to.be.eq(0);
        await pairFactory.createPair(WETH_PREDEPLOYED_ADDRESS, tokenTK6.target, false);

        expect(await weth.getConfiguration(pairAddr)).to.be.eq(1);
      });
      it('success create pair and set default configuration mode for token1', async () => {
        let usdb = (await ethers.getContractAt('IERC20RebasingMock', USDB_PREDEPLOYED_ADDRESS)) as any as IERC20RebasingMock;
        let pairAddr = await pairFactory.createPair.staticCall(deployed.fenix.target, USDB_PREDEPLOYED_ADDRESS, false);

        expect(await usdb.getConfiguration(pairAddr)).to.be.eq(0);

        await pairFactory.setConfigurationForRebaseToken(USDB_PREDEPLOYED_ADDRESS, true, 2);
        await pairFactory.createPair(deployed.fenix.target, USDB_PREDEPLOYED_ADDRESS, false);

        expect(await usdb.getConfiguration(pairAddr)).to.be.eq(2);
      });
    });
  } else {
    it('Skip if not blast fork', async () => {});
  }
});

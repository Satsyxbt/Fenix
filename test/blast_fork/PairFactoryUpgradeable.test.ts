import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  FeesVaultFactory,
  FeesVaultFactory__factory,
  FeesVaultUpgradeable,
  BlastMock,
  IBlastMock,
  PairFactoryUpgradeable__factory,
  PairFactoryUpgradeable,
  Pair,
  ERC20Mock,
  Pair__factory,
  IERC20Rebasing,
  IERC20RebasingMock,
} from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {
  BLAST_PREDEPLOYED_ADDRESS,
  ERRORS,
  ONE,
  USDB_PREDEPLOYED_ADDRESS,
  WETH_PREDEPLOYED_ADDRESS,
  ZERO_ADDRESS,
  getAccessControlError,
} from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  deployV2PairFactory,
} from '../utils/coreFixture';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

const PRECISION = 10000;
describe('PairFactoryUpgradeable Contract', function () {
  if (process.env.BLAST_FORK === 'true') {
    let signers: SignersList;
    let pairFactoryFactory: PairFactoryUpgradeable__factory;
    let pairFactory: PairFactoryUpgradeable;
    let feesVaultFactory: FeesVaultFactory;
    let deployed: CoreFixtureDeployed;
    let tokenTK18: ERC20Mock;
    let tokenTK6: ERC20Mock;
    let poolAddress: string;
    let poolAddress2: string;

    async function fixture(): Promise<CoreFixtureDeployed> {
      return await completeFixture(true);
    }

    beforeEach(async function () {
      deployed = await loadFixture(fixture);
      signers = deployed.signers;

      pairFactoryFactory = await ethers.getContractFactory('PairFactoryUpgradeable');
      pairFactory = deployed.v2PairFactory;
      feesVaultFactory = deployed.feesVaultFactory;

      tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
      tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

      await feesVaultFactory.setWhitelistedCreatorStatus(pairFactory.target, true);

      await pairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, false);
      await pairFactory.connect(signers.deployer).createPair(tokenTK18.target, tokenTK6.target, true);
      poolAddress = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, true);
      poolAddress2 = await pairFactory.getPair(tokenTK18.target, tokenTK6.target, false);
    });

    describe('#createPair', async () => {
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

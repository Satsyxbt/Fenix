import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ERC20Mock,
  FeesVaultFactoryUpgradeable,
  FeesVaultUpgradeable,
  FeesVaultUpgradeable__factory,
  PoolMock,
  PoolMock__factory,
  VoterMock,
  VoterMock__factory,
} from '../../typechain-types';
import { DEAD_ADDRESS, ERRORS, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
} from '../utils/coreFixture';
import { CASES } from './cases';

const PRECISION = BigInt(10000);
const DEFAULT_CONFIGURATION = {
  toGaugeRate: PRECISION,
  toPartnerRate: 0,
  toProtocolRate: 0,
  protocolRecipient: ZERO_ADDRESS,
  partnerRecipient: ZERO_ADDRESS,
};

describe('FeesVault Contract', function () {
  let signers: SignersList;
  let feesVaultFactory: FeesVaultFactoryUpgradeable;

  let feesVault: FeesVaultUpgradeable;
  let factory: FeesVaultUpgradeable__factory;
  let poolMockFactory: PoolMock__factory;
  let voterMockFactory: VoterMock__factory;

  let voterMock: VoterMock;
  let poolMock: PoolMock;

  let deployed: CoreFixtureDeployed;
  let creator: HardhatEthersSigner;
  let gauge: HardhatEthersSigner;

  let token0: ERC20Mock;
  let token1: ERC20Mock;

  const PARTNER_RECIPIENT = '0x0000000000000000000000000000000000001234';
  const PROTOCOL_RECIPIENT = '0x0000000000000000000000000000000000002456';

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    creator = signers.fenixTeam;
    gauge = signers.blastGovernor;

    feesVaultFactory = deployed.feesVaultFactory;

    factory = await ethers.getContractFactory('FeesVaultUpgradeable');

    poolMockFactory = await ethers.getContractFactory('PoolMock');
    voterMockFactory = await ethers.getContractFactory('VoterMock');

    voterMock = await voterMockFactory.deploy();

    await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), creator.address);
    await feesVaultFactory.setVoter(voterMock.target);
    poolMock = await poolMockFactory.deploy();

    await feesVaultFactory.connect(creator).createVaultForPool(poolMock.target);
    feesVault = factory.attach(await feesVaultFactory.getVaultForPool(poolMock.target)) as FeesVaultUpgradeable;

    token0 = await deployERC20MockToken(signers.deployer, 'TRO18', 'TRO18', 18);
    token1 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);

    await poolMock.setTokens(token0.target, token1.target);

    await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
  });

  describe('Deployments', async () => {
    it('should correct set initial factory address', async () => {
      expect(await feesVault.factory()).to.be.eq(feesVaultFactory.target);
    });
    it('should correct set pool address', async () => {
      expect(await feesVault.pool()).to.be.eq(poolMock.target);
    });
    it('fails if try initialzie with zero blast points address', async () => {
      let vault = factory.attach(
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await deployed.feesVaultImplementation.getAddress(),
        ),
      ) as FeesVaultUpgradeable;

      await expect(
        vault.initialize(
          signers.blastGovernor.address,
          ZERO_ADDRESS,
          signers.blastGovernor.address,
          feesVaultFactory.target,
          poolMock.target,
        ),
      ).to.be.revertedWithCustomError(vault, 'AddressZero');
      await expect(
        vault.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          ZERO_ADDRESS,
          feesVaultFactory.target,
          poolMock.target,
        ),
      ).to.be.revertedWithCustomError(vault, 'AddressZero');
    });
    it('fails if try initialzie contract twice', async () => {
      await expect(
        feesVault.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          feesVaultFactory.target,
          poolMock.target,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('fails if provide zero governor address', async () => {
      let vault = factory.attach(
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await deployed.feesVaultImplementation.getAddress(),
        ),
      ) as FeesVaultUpgradeable;

      await expect(
        vault.initialize(
          ZERO_ADDRESS,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          feesVaultFactory.target,
          poolMock.target,
        ),
      ).to.be.revertedWithCustomError(vault, 'AddressZero');
    });
    it('fails if try initialize with zero factory address', async () => {
      let vault = factory.attach(
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await deployed.feesVaultImplementation.getAddress(),
        ),
      ) as FeesVaultUpgradeable;

      await expect(
        vault.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          ZERO_ADDRESS,
          poolMock.target,
        ),
      ).to.be.revertedWithCustomError(vault, 'AddressZero');
    });
    it('fails if try initialize with zero pool address', async () => {
      let vault = factory.attach(
        await deployTransaperntUpgradeableProxy(
          signers.deployer,
          signers.proxyAdmin.address,
          await deployed.feesVaultImplementation.getAddress(),
        ),
      ) as FeesVaultUpgradeable;

      await expect(
        vault.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          feesVaultFactory.target,
          ZERO_ADDRESS,
        ),
      ).to.be.revertedWithCustomError(vault, 'AddressZero');
    });
    it('initialize disabled on implementation', async () => {
      let vault = await (await ethers.getContractFactory('FeesVaultUpgradeable')).deploy(signers.deployer.address);
      await expect(
        vault.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          feesVaultFactory.target,
          poolMock.target,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
  });

  describe('_checkAccessForManageBlastERC20Rebasing', async () => {
    it('fail if try call from not FEES_VAULT_ADMINISTRATOR_ROLE', async () => {
      await expect(feesVault.connect(signers.otherUser1).configure(token0.target, 1)).to.be.revertedWithCustomError(
        feesVault,
        'AccessDenied',
      );
    });
    it('fail if try call from not FEES_VAULT_ADMINISTRATOR_ROLE', async () => {
      await expect(feesVault.connect(signers.otherUser1).configure(token0.target, 1)).to.be.revertedWithCustomError(
        feesVault,
        'AccessDenied',
      );
    });
  });
  describe('#emergencyRecoverERC20', async () => {
    it('fails if caller is not FEES_VAULT_ADMINISTRATOR_ROLE role', async () => {
      await expect(feesVault.connect(signers.otherUser1).emergencyRecoverERC20(token0.target, 1)).to.be.revertedWithCustomError(
        feesVault,
        'AccessDenied',
      );
    });
    it('fails if contract not have enought balance', async () => {
      await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
      await expect(feesVault.emergencyRecoverERC20(token0.target, 1)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
    it('should corect recover all tokens from contract', async () => {
      await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);

      await token0.mint(feesVault.target, ONE_ETHER);
      expect(await token0.balanceOf(feesVault)).to.be.eq(ONE_ETHER);
      expect(await token0.balanceOf(signers.deployer.address)).to.be.eq(ZERO);

      await feesVault.emergencyRecoverERC20(token0.target, ONE_ETHER);

      expect(await token0.balanceOf(signers.deployer.address)).to.be.eq(ONE_ETHER);
      expect(await token0.balanceOf(feesVault)).to.be.eq(ZERO);
    });
    it('should corect recover 60% tokens from contract', async () => {
      await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);

      await token1.mint(feesVault.target, ONE_ETHER);
      expect(await token1.balanceOf(feesVault)).to.be.eq(ONE_ETHER);
      expect(await token1.balanceOf(signers.deployer.address)).to.be.eq(ZERO);

      await feesVault.emergencyRecoverERC20(token1.target, (ONE_ETHER * BigInt(6)) / BigInt(10));

      expect(await token1.balanceOf(signers.deployer.address)).to.be.eq((ONE_ETHER * BigInt(6)) / BigInt(10));
      expect(await token1.balanceOf(feesVault)).to.be.eq((ONE_ETHER * BigInt(4)) / BigInt(10));
    });
  });

  describe('claimFees', async () => {
    it('fails if caller is not gauge and toGaugeRate > 0', async () => {
      expect(await feesVaultFactory.getDistributionConfig(feesVault.target)).to.be.deep.eq([10000, [], []]);
      await expect(feesVault.connect(signers.otherUser1).claimFees()).to.be.revertedWithCustomError(feesVault, 'AccessDenied');
    });
    it('fails if caller is gauge not for this fees vault', async () => {
      await voterMock.setGauge(gauge.address, DEAD_ADDRESS);
      expect(await feesVaultFactory.getDistributionConfig(feesVault.target)).to.be.deep.eq([10000, [], []]);
      await expect(feesVault.connect(gauge).claimFees()).to.be.revertedWithCustomError(feesVault, 'PoolMismatch');
    });

    it('fails if toGaugeRate = 0, and caller not CLAIM_FEES_CALLER_ROLE', async () => {
      await feesVaultFactory.setCustomDistributionConfig(feesVault.target, {
        toGaugeRate: 0,
        recipients: [signers.blastGovernor.address],
        rates: [10000],
      });

      expect(await feesVaultFactory.getDistributionConfig(feesVault.target)).to.be.deep.eq([0, [signers.blastGovernor.address], [10000]]);
      await expect(feesVault.connect(signers.otherUser1).claimFees()).to.be.revertedWithCustomError(feesVault, 'AccessDenied');

      await feesVaultFactory.grantRole(await feesVaultFactory.CLAIM_FEES_CALLER_ROLE(), signers.otherUser1.address);
      await expect(feesVault.connect(signers.otherUser1).claimFees()).to.be.not.reverted;
    });
    it('always should take actual Voter address from factory', async () => {
      let newVoter = await voterMockFactory.deploy();

      await voterMock.setGauge(gauge.address, poolMock.target);

      await expect(feesVault.connect(gauge).claimFees()).to.be.not.reverted;

      await feesVaultFactory.setVoter(newVoter.target);

      await expect(feesVault.connect(gauge).claimFees()).to.be.revertedWithCustomError(feesVault, 'AccessDenied');
    });
    it('success claim fees from vault, specific case with events check, 95.5% to protocol, 4.5% partnet', async () => {
      const iterator = {
        name: 'Default configuration 100% to recipient, 0, 0 wei',
        config: {
          toGaugeRate: 0,
          recipients: [PROTOCOL_RECIPIENT, PARTNER_RECIPIENT],
          rates: [9550, 450],
        },
        token0: ethers.parseEther('356.4'),
        token1: 123e6,
        recipientsExpectBalancesToken0: [ethers.parseEther('340.36200'), ethers.parseEther('16.03800')],
        recipientsExpectBalancesToken1: [117465000, 5535000],
        gaugeExpectBalanceToken0: 0,
        gaugeExpectBalanceToken1: 0,
      };

      expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);

      for (let i = 0; i < iterator.config.recipients.length; i++) {
        expect(await token0.balanceOf(iterator.config.recipients[i])).to.be.eq(ZERO);
      }

      await feesVaultFactory.setCustomDistributionConfig(feesVault.target, iterator.config);
      await voterMock.setGauge(gauge.address, poolMock.target);

      expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
      for (let i = 0; i < iterator.config.recipients.length; i++) {
        expect(await token0.balanceOf(iterator.config.recipients[i])).to.be.eq(ZERO);
      }
      await token0.mint(feesVault.target, iterator.token0);
      await token1.mint(feesVault.target, iterator.token1);

      await feesVaultFactory.grantRole(await feesVaultFactory.CLAIM_FEES_CALLER_ROLE(), signers.deployer.address);
      let res = await feesVault.connect(signers.deployer).claimFees.staticCall();
      let tx = await feesVault.connect(signers.deployer).claimFees();

      await expect(tx)
        .to.be.emit(feesVault, 'FeesToOtherRecipient')
        .withArgs(token0.target, PROTOCOL_RECIPIENT, ethers.parseEther('340.36200'));
      await expect(tx)
        .to.be.emit(feesVault, 'FeesToOtherRecipient')
        .withArgs(token0.target, PARTNER_RECIPIENT, ethers.parseEther('16.03800'));
      await expect(tx).to.be.emit(feesVault, 'FeesToOtherRecipient').withArgs(token1.target, PROTOCOL_RECIPIENT, 117465000);
      await expect(tx).to.be.emit(feesVault, 'FeesToOtherRecipient').withArgs(token1.target, PARTNER_RECIPIENT, 5535000);
      await expect(tx).to.be.not.emit(feesVault, 'FeesToGauge');

      await expect(tx)
        .to.be.emit(feesVault, 'Fees')
        .withArgs(poolMock.target, token0.target, token1.target, ethers.parseEther('356.4'), 123e6);

      expect(res[0]).to.be.eq(iterator.gaugeExpectBalanceToken0);
      expect(res[1]).to.be.eq(iterator.gaugeExpectBalanceToken1);

      for (let i = 0; i < iterator.config.recipients.length; i++) {
        expect(await token0.balanceOf(iterator.config.recipients[i])).to.be.eq(iterator.recipientsExpectBalancesToken0[i]);
        expect(await token1.balanceOf(iterator.config.recipients[i])).to.be.eq(iterator.recipientsExpectBalancesToken1[i]);
      }
      expect(await token0.balanceOf(gauge.address)).to.be.eq(iterator.gaugeExpectBalanceToken0);
      expect(await token1.balanceOf(gauge.address)).to.be.eq(iterator.gaugeExpectBalanceToken1);
    });

    describe('success claim fees from vault', async () => {
      for (const iterator of CASES) {
        it(`case ${iterator.name}`, async () => {
          expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
          for (let i = 0; i < iterator.config.recipients.length; i++) {
            expect(await token0.balanceOf(iterator.config.recipients[i])).to.be.eq(ZERO);
          }

          await feesVaultFactory.setCustomDistributionConfig(feesVault.target, iterator.config);
          await voterMock.setGauge(gauge.address, poolMock.target);

          expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
          for (let i = 0; i < iterator.config.recipients.length; i++) {
            expect(await token0.balanceOf(iterator.config.recipients[i])).to.be.eq(ZERO);
          }
          await token0.mint(feesVault.target, iterator.token0);
          await token1.mint(feesVault.target, iterator.token1);

          let res = await feesVault.connect(gauge).claimFees.staticCall();
          let tx = await feesVault.connect(gauge).claimFees();

          if (iterator.gaugeExpectBalanceToken0 > 0) {
            await expect(tx).to.be.emit(feesVault, 'FeesToGauge').withArgs(token0, gauge.address, iterator.gaugeExpectBalanceToken0);
          }

          if (iterator.gaugeExpectBalanceToken1 > 0) {
            await expect(tx).to.be.emit(feesVault, 'FeesToGauge').withArgs(token1, gauge.address, iterator.gaugeExpectBalanceToken1);
          }

          expect(res[0]).to.be.eq(iterator.gaugeExpectBalanceToken0);
          expect(res[1]).to.be.eq(iterator.gaugeExpectBalanceToken1);

          for (let i = 0; i < iterator.config.recipients.length; i++) {
            expect(await token0.balanceOf(iterator.config.recipients[i])).to.be.eq(iterator.recipientsExpectBalancesToken0[i]);
            expect(await token1.balanceOf(iterator.config.recipients[i])).to.be.eq(iterator.recipientsExpectBalancesToken1[i]);
          }
          expect(await token0.balanceOf(gauge.address)).to.be.eq(iterator.gaugeExpectBalanceToken0);
          expect(await token1.balanceOf(gauge.address)).to.be.eq(iterator.gaugeExpectBalanceToken1);
        });
      }
    });
  });
});

import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  FeesVaultFactory,
  FeesVaultFactory__factory,
  FeesVaultUpgradeable,
  BlastMock,
  IBlastMock,
  FeesVaultUpgradeable__factory,
  PoolMock__factory,
  VoterMock__factory,
  VoterMock,
  PoolMock,
  ERC20Mock,
} from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { BLAST_PREDEPLOYED_ADDRESS, DEAD_ADDRESS, ERRORS, ONE, ONE_ETHER, ZERO, ZERO_ADDRESS } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../utils/coreFixture';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { deployERC20Mock } from '../../scripts/utils';

const PRECISION = BigInt(10000);
describe('FeesVault Contract', function () {
  let signers: SignersList;
  let feesVaultFactory: FeesVaultFactory;

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

    await feesVaultFactory.setWhitelistedCreatorStatus(creator.address, true);
    await feesVaultFactory.setVoter(voterMock.target);
    poolMock = await poolMockFactory.deploy();

    await feesVaultFactory.connect(creator).createVaultForPool(poolMock.target);
    feesVault = factory.attach(await feesVaultFactory.getVaultForPool(poolMock.target)) as FeesVaultUpgradeable;

    token0 = await deployERC20MockToken(signers.deployer, 'TRO18', 'TRO18', 18);
    token1 = await deployERC20MockToken(signers.deployer, 'TR6', 'TR6', 6);

    await poolMock.setTokens(token0.target, token1.target);
  });

  describe('Deployments', async () => {
    it('has PRECISION', async () => {
      expect(await feesVault.PRECISION()).to.be.eq(PRECISION);
    });
    it('should correct set default distribution settings', async () => {
      expect(await feesVault.toGaugeRate()).to.be.eq(PRECISION);
      expect(await feesVault.toProtocolRate()).to.be.eq(ZERO);
      expect(await feesVault.toPartnerRate()).to.be.eq(ZERO);
      expect(await feesVault.protocolRecipient()).to.be.eq(ZERO_ADDRESS);
      expect(await feesVault.partnerRecipient()).to.be.eq(ZERO_ADDRESS);
    });

    it('should correct set initial factory address', async () => {
      expect(await feesVault.factory()).to.be.eq(feesVaultFactory.target);
    });
    it('should correct set voter address', async () => {
      expect(await feesVault.voter()).to.be.eq(voterMock.target);
    });
    it('should correct set pool address', async () => {
      expect(await feesVault.pool()).to.be.eq(poolMock.target);
    });

    it('fails if try initialzie contract twice', async () => {
      await expect(
        feesVault.initialize(signers.blastGovernor.address, feesVaultFactory.target, poolMock.target, voterMock.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('initialize disabled on implementation', async () => {
      let vault = await (await ethers.getContractFactory('FeesVaultUpgradeable')).deploy();
      await expect(
        vault.initialize(signers.blastGovernor.address, feesVaultFactory.target, poolMock.target, voterMock.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
  });
  describe('#setProtocolRecipient', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(feesVault.connect(signers.otherUser1).setProtocolRecipient(signers.otherUser1.address)).to.be.revertedWithCustomError(
        feesVault,
        'AccessDenied',
      );
    });
    it('success set new protocol recipient address and emit event', async () => {
      expect(await feesVault.protocolRecipient()).to.be.eq(ZERO_ADDRESS);

      await expect(feesVault.connect(signers.deployer).setProtocolRecipient(signers.otherUser1.address))
        .to.be.emit(feesVault, 'SetProtocolRecipient')
        .withArgs(ZERO_ADDRESS, signers.otherUser1.address);

      expect(await feesVault.protocolRecipient()).to.be.eq(signers.otherUser1.address);
    });
  });
  describe('#setPartnerRecipient', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(feesVault.connect(signers.otherUser1).setPartnerRecipient(signers.otherUser1.address)).to.be.revertedWithCustomError(
        feesVault,
        'AccessDenied',
      );
    });
    it('success set new protocol recipient address and emit event', async () => {
      expect(await feesVault.partnerRecipient()).to.be.eq(ZERO_ADDRESS);

      await expect(feesVault.connect(signers.deployer).setPartnerRecipient(signers.otherUser1.address))
        .to.be.emit(feesVault, 'SetPartnerRecipient')
        .withArgs(ZERO_ADDRESS, signers.otherUser1.address);

      expect(await feesVault.partnerRecipient()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#emergencyRecoverERC20', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(feesVault.connect(signers.otherUser1).emergencyRecoverERC20(token0.target, 1)).to.be.revertedWithCustomError(
        feesVault,
        'AccessDenied',
      );
    });
    it('fails if contract not have enought balance', async () => {
      await expect(feesVault.emergencyRecoverERC20(token0.target, 1)).to.be.revertedWith('ERC20: transfer amount exceeds balance');
    });
    it('should corect recover all tokens from contract', async () => {
      await token0.mint(feesVault.target, ONE_ETHER);
      expect(await token0.balanceOf(feesVault)).to.be.eq(ONE_ETHER);
      expect(await token0.balanceOf(signers.deployer.address)).to.be.eq(ZERO);

      await feesVault.emergencyRecoverERC20(token0.target, ONE_ETHER);

      expect(await token0.balanceOf(signers.deployer.address)).to.be.eq(ONE_ETHER);
      expect(await token0.balanceOf(feesVault)).to.be.eq(ZERO);
    });
    it('should corect recover 60% tokens from contract', async () => {
      await token1.mint(feesVault.target, ONE_ETHER);
      expect(await token1.balanceOf(feesVault)).to.be.eq(ONE_ETHER);
      expect(await token1.balanceOf(signers.deployer.address)).to.be.eq(ZERO);

      await feesVault.emergencyRecoverERC20(token1.target, (ONE_ETHER * BigInt(6)) / BigInt(10));

      expect(await token1.balanceOf(signers.deployer.address)).to.be.eq((ONE_ETHER * BigInt(6)) / BigInt(10));
      expect(await token1.balanceOf(feesVault)).to.be.eq((ONE_ETHER * BigInt(4)) / BigInt(10));
    });
  });

  describe('#setDistributionConfig', async () => {
    it('fails if caller is not factory owner', async () => {
      await expect(feesVault.connect(signers.otherUser1).setDistributionConfig(PRECISION, 0, 0)).to.be.revertedWithCustomError(
        feesVault,
        'AccessDenied',
      );
    });
    it('fails if try set incorrect rates', async () => {
      await expect(feesVault.setDistributionConfig(0, 0, 0)).to.be.revertedWithCustomError(feesVault, 'IncorectDistributionConfig');
      await expect(feesVault.setDistributionConfig(1, 1, 1)).to.be.revertedWithCustomError(feesVault, 'IncorectDistributionConfig');
      await expect(feesVault.setDistributionConfig(PRECISION - ONE, 0, 0)).to.be.revertedWithCustomError(
        feesVault,
        'IncorectDistributionConfig',
      );
      await expect(feesVault.setDistributionConfig(PRECISION + ONE, 0, 1)).to.be.revertedWithCustomError(
        feesVault,
        'IncorectDistributionConfig',
      );
      await expect(
        feesVault.setDistributionConfig(PRECISION / BigInt(2), PRECISION / BigInt(2), PRECISION / BigInt(2)),
      ).to.be.revertedWithCustomError(feesVault, 'IncorectDistributionConfig');
    });
    it('fails if try set not ZERO rate for zero address recipient', async () => {
      await expect(feesVault.setDistributionConfig(0, PRECISION, 0)).to.be.revertedWithCustomError(feesVault, 'RecipientNotSetuped');
      await expect(feesVault.setDistributionConfig(0, 0, PRECISION)).to.be.revertedWithCustomError(feesVault, 'RecipientNotSetuped');

      await feesVault.setProtocolRecipient(signers.deployer.address);
      await expect(feesVault.setDistributionConfig(0, PRECISION, 0)).to.be.not.revertedWithCustomError(feesVault, 'RecipientNotSetuped');

      await feesVault.setPartnerRecipient(signers.deployer.address);
      await expect(feesVault.setDistributionConfig(0, 0, PRECISION)).to.be.not.revertedWithCustomError(feesVault, 'RecipientNotSetuped');
    });
    describe('success set new distribtuion config', async () => {
      const CASES = [
        [PRECISION, 0, 0],
        [0, PRECISION, 0],
        [0, 0, PRECISION],
        [1000, 9000, 0],
        [1000, 4000, 5000],
        [2500, 3500, 4000],
      ];
      beforeEach(async () => {
        await feesVault.setPartnerRecipient(signers.deployer.address);
        await feesVault.setProtocolRecipient(signers.deployer.address);
      });

      for (const iterator of CASES) {
        it(`case ${iterator}`, async () => {
          await expect(feesVault.setDistributionConfig(iterator[0], iterator[1], iterator[2]))
            .to.be.emit(feesVault, 'SetDistributionConfig')
            .withArgs(iterator[0], iterator[1], iterator[2]);
          expect(await feesVault.toGaugeRate()).to.be.eq(iterator[0]);
          expect(await feesVault.toProtocolRate()).to.be.eq(iterator[1]);
          expect(await feesVault.toPartnerRate()).to.be.eq(iterator[2]);
        });
      }
    });
  });

  describe('claimFees', async () => {
    it('fails if caller is not gauge', async () => {
      await expect(feesVault.connect(signers.otherUser1).claimFees()).to.be.revertedWithCustomError(feesVault, 'AccessDenied');
    });
    it('fails if caller is gauge not for this fees vault', async () => {
      await voterMock.setGauge(gauge.address, DEAD_ADDRESS);

      await expect(feesVault.connect(gauge).claimFees()).to.be.revertedWithCustomError(feesVault, 'PoolMismatch');
    });
    it('specific case with one wei rest', async () => {
      let iterator = {
        toGaugeRate: 9999,
        toProtocolRate: 1,
        toPartnerRate: 0,
        token0Amount: 100,
        token1Amount: 100,
        result0: [99, 0, 0],
        result1: [99, 0, 0],
      };
      expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      expect(await token1.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      if (iterator.toProtocolRate > 0) {
        await feesVault.setProtocolRecipient(PROTOCOL_RECIPIENT);
      }
      if (iterator.toPartnerRate > 0) {
        await feesVault.setPartnerRecipient(PARTNER_RECIPIENT);
      }
      await voterMock.setGauge(gauge.address, poolMock.target);

      await feesVault.setDistributionConfig(iterator.toGaugeRate, iterator.toProtocolRate, iterator.toPartnerRate);

      expect(await feesVault.toGaugeRate()).to.be.eq(iterator.toGaugeRate);
      expect(await feesVault.toProtocolRate()).to.be.eq(iterator.toProtocolRate);
      expect(await feesVault.toPartnerRate()).to.be.eq(ZERO);
      expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      await token0.mint(feesVault.target, iterator.token0Amount);
      await token1.mint(feesVault.target, iterator.token1Amount);

      let res = await feesVault.connect(gauge).claimFees.staticCall();
      let tx = await feesVault.connect(gauge).claimFees();
      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
        .withArgs(token0.target, iterator.result0[0], iterator.result0[1], iterator.result0[2]);

      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
        .withArgs(token1.target, iterator.result1[0], iterator.result1[1], iterator.result1[2]);

      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,address,address,uint256,uint256)')
        .withArgs(poolMock.target, token0.target, token1.target, iterator.token0Amount, iterator.token1Amount);

      expect(res.gauge0).to.be.eq(iterator.result0[0]);
      expect(res.gauge1).to.be.eq(iterator.result1[0]);

      expect(await token0.balanceOf(gauge.address)).to.be.eq(iterator.result0[0]);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(iterator.result0[1]);
      expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(iterator.result0[2]);

      expect(await token1.balanceOf(gauge.address)).to.be.eq(iterator.result1[0]);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(iterator.result1[1]);
      expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(iterator.result1[2]);
    });
    it('sucess call without fees', async () => {
      let iterator = {
        toGaugeRate: 9000,
        toProtocolRate: 600,
        toPartnerRate: 400,
        token0Amount: 0,
        token1Amount: 0,
        result0: [0, 0, 0],
        result1: [0, 0, 0],
      };
      expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      expect(await token1.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      if (iterator.toProtocolRate > 0) {
        await feesVault.setProtocolRecipient(PROTOCOL_RECIPIENT);
      }
      if (iterator.toPartnerRate > 0) {
        await feesVault.setPartnerRecipient(PARTNER_RECIPIENT);
      }
      await voterMock.setGauge(gauge.address, poolMock.target);

      await feesVault.setDistributionConfig(iterator.toGaugeRate, iterator.toProtocolRate, iterator.toPartnerRate);

      expect(await feesVault.toGaugeRate()).to.be.eq(iterator.toGaugeRate);
      expect(await feesVault.toProtocolRate()).to.be.eq(iterator.toProtocolRate);
      expect(await feesVault.toPartnerRate()).to.be.eq(iterator.toPartnerRate);
      expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      await token0.mint(feesVault.target, iterator.token0Amount);
      await token1.mint(feesVault.target, iterator.token1Amount);

      let res = await feesVault.connect(gauge).claimFees.staticCall();
      let tx = await feesVault.connect(gauge).claimFees();
      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
        .withArgs(token0.target, iterator.result0[0], iterator.result0[1], iterator.result0[2]);

      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
        .withArgs(token1.target, iterator.result1[0], iterator.result1[1], iterator.result1[2]);

      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,address,address,uint256,uint256)')
        .withArgs(poolMock.target, token0.target, token1.target, iterator.token0Amount, iterator.token1Amount);

      expect(res.gauge0).to.be.eq(iterator.result0[0]);
      expect(res.gauge1).to.be.eq(iterator.result1[0]);

      expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);

      expect(await token1.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
    });

    it('90% to gauge, 4% to partner, 6% to protocol', async () => {
      let iterator = {
        toGaugeRate: 9000,
        toProtocolRate: 600,
        toPartnerRate: 400,
        token0Amount: ethers.parseEther('123.4561001'),
        token1Amount: ethers.parseUnits('54.512', 'gwei'),
        result0: [ethers.parseEther('111.11049009'), ethers.parseEther('7.407366006'), ethers.parseEther('4.938244004')],
        result1: [ethers.parseUnits('49.0608', 'gwei'), ethers.parseUnits('3.27072', 'gwei'), ethers.parseUnits('2.18048', 'gwei')],
      };
      expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      expect(await token1.balanceOf(gauge.address)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      if (iterator.toProtocolRate > 0) {
        await feesVault.setProtocolRecipient(PROTOCOL_RECIPIENT);
      }
      if (iterator.toPartnerRate > 0) {
        await feesVault.setPartnerRecipient(PARTNER_RECIPIENT);
      }
      await voterMock.setGauge(gauge.address, poolMock.target);

      await feesVault.setDistributionConfig(iterator.toGaugeRate, iterator.toProtocolRate, iterator.toPartnerRate);

      expect(await feesVault.toGaugeRate()).to.be.eq(iterator.toGaugeRate);
      expect(await feesVault.toProtocolRate()).to.be.eq(iterator.toProtocolRate);
      expect(await feesVault.toPartnerRate()).to.be.eq(iterator.toPartnerRate);
      expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

      await token0.mint(feesVault.target, iterator.token0Amount);
      await token1.mint(feesVault.target, iterator.token1Amount);

      let res = await feesVault.connect(gauge).claimFees.staticCall();
      let tx = await feesVault.connect(gauge).claimFees();
      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
        .withArgs(token0.target, iterator.result0[0], iterator.result0[1], iterator.result0[2]);

      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
        .withArgs(token1.target, iterator.result1[0], iterator.result1[1], iterator.result1[2]);

      await expect(tx)
        .to.be.emit(feesVault, 'Fees(address,address,address,uint256,uint256)')
        .withArgs(poolMock.target, token0.target, token1.target, iterator.token0Amount, iterator.token1Amount);

      expect(res.gauge0).to.be.eq(iterator.result0[0]);
      expect(res.gauge1).to.be.eq(iterator.result1[0]);

      expect(await token0.balanceOf(gauge.address)).to.be.eq(iterator.result0[0]);
      expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(iterator.result0[1]);
      expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(iterator.result0[2]);

      expect(await token1.balanceOf(gauge.address)).to.be.eq(iterator.result1[0]);
      expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(iterator.result1[1]);
      expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(iterator.result1[2]);
    });

    describe('success claim fees from vault', async () => {
      const CASES = [
        {
          toGaugeRate: PRECISION,
          toProtocolRate: 0,
          toPartnerRate: 0,
          token0Amount: 10000,
          token1Amount: 50,
          result0: [10000, 0, 0],
          result1: [50, 0, 0],
        },
        {
          toGaugeRate: 0,
          toProtocolRate: PRECISION,
          toPartnerRate: 0,
          token0Amount: 10000,
          token1Amount: 50,
          result0: [0, 10000, 0],
          result1: [0, 50, 0],
        },
        {
          toGaugeRate: 0,
          toProtocolRate: 0,
          toPartnerRate: PRECISION,
          token0Amount: 10000,
          token1Amount: 50,
          result0: [0, 0, 10000],
          result1: [0, 0, 50],
        },
        {
          toGaugeRate: 1,
          toProtocolRate: 9998,
          toPartnerRate: 1,
          token0Amount: 10000,
          token1Amount: 0,
          result0: [1, 9998, 1],
          result1: [0, 0, 0],
        },
        {
          toGaugeRate: 9000,
          toProtocolRate: 200,
          toPartnerRate: 800,
          token0Amount: ethers.parseEther('1250'),
          token1Amount: ethers.parseUnits('900', 'gwei'),
          result0: [ethers.parseEther('1125'), ethers.parseEther('25'), ethers.parseEther('100')],
          result1: [ethers.parseUnits('810', 'gwei'), ethers.parseUnits('18', 'gwei'), ethers.parseUnits('72', 'gwei')],
        },
        {
          toGaugeRate: 5000,
          toProtocolRate: 3000,
          toPartnerRate: 2000,
          token0Amount: ethers.parseEther('100'),
          token1Amount: ethers.parseEther('200'),
          result0: [ethers.parseEther('50'), ethers.parseEther('30'), ethers.parseEther('20')],
          result1: [ethers.parseEther('100'), ethers.parseEther('60'), ethers.parseEther('40')],
        },
        {
          toGaugeRate: 2500,
          toProtocolRate: 2500,
          toPartnerRate: 5000,
          token0Amount: ethers.parseEther('50'),
          token1Amount: ethers.parseEther('100'),
          result0: [ethers.parseEther('12.5'), ethers.parseEther('12.5'), ethers.parseEther('25')],
          result1: [ethers.parseEther('25'), ethers.parseEther('25'), ethers.parseEther('50')],
        },
        {
          toGaugeRate: 8000,
          toProtocolRate: 1000,
          toPartnerRate: 1000,
          token0Amount: ethers.parseEther('500'),
          token1Amount: ethers.parseEther('1000'),
          result0: [ethers.parseEther('400'), ethers.parseEther('50'), ethers.parseEther('50')],
          result1: [ethers.parseEther('800'), ethers.parseEther('100'), ethers.parseEther('100')],
        },
        {
          toGaugeRate: 3333,
          toProtocolRate: 3333,
          toPartnerRate: 3334,
          token0Amount: ethers.parseEther('300'),
          token1Amount: ethers.parseEther('600'),
          result0: [ethers.parseEther('99.99'), ethers.parseEther('99.99'), ethers.parseEther('100.02')],
          result1: [ethers.parseEther('199.98'), ethers.parseEther('199.98'), ethers.parseEther('200.04')],
        },
      ];

      for (const iterator of CASES) {
        it(`case ${iterator.toGaugeRate + ',' + iterator.toProtocolRate + ',' + iterator.toPartnerRate}`, async () => {
          expect(await token0.balanceOf(gauge.address)).to.be.eq(ZERO);
          expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
          expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

          expect(await token1.balanceOf(gauge.address)).to.be.eq(ZERO);
          expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
          expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

          if (iterator.toProtocolRate > 0) {
            await feesVault.setProtocolRecipient(PROTOCOL_RECIPIENT);
          }
          if (iterator.toPartnerRate > 0) {
            await feesVault.setPartnerRecipient(PARTNER_RECIPIENT);
          }
          await voterMock.setGauge(gauge.address, poolMock.target);

          await feesVault.setDistributionConfig(iterator.toGaugeRate, iterator.toProtocolRate, iterator.toPartnerRate);

          expect(await feesVault.toGaugeRate()).to.be.eq(iterator.toGaugeRate);
          expect(await feesVault.toProtocolRate()).to.be.eq(iterator.toProtocolRate);
          expect(await feesVault.toPartnerRate()).to.be.eq(iterator.toPartnerRate);
          expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
          expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(ZERO);
          expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);
          expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(ZERO);

          await token0.mint(feesVault.target, iterator.token0Amount);
          await token1.mint(feesVault.target, iterator.token1Amount);

          let res = await feesVault.connect(gauge).claimFees.staticCall();
          let tx = await feesVault.connect(gauge).claimFees();
          await expect(tx)
            .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
            .withArgs(token0.target, iterator.result0[0], iterator.result0[1], iterator.result0[2]);

          await expect(tx)
            .to.be.emit(feesVault, 'Fees(address,uint256,uint256,uint256)')
            .withArgs(token1.target, iterator.result1[0], iterator.result1[1], iterator.result1[2]);

          await expect(tx)
            .to.be.emit(feesVault, 'Fees(address,address,address,uint256,uint256)')
            .withArgs(poolMock.target, token0.target, token1.target, iterator.token0Amount, iterator.token1Amount);

          expect(res.gauge0).to.be.eq(iterator.result0[0]);
          expect(res.gauge1).to.be.eq(iterator.result1[0]);

          expect(await token0.balanceOf(gauge.address)).to.be.eq(iterator.result0[0]);
          expect(await token0.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(iterator.result0[1]);
          expect(await token0.balanceOf(PARTNER_RECIPIENT)).to.be.eq(iterator.result0[2]);

          expect(await token1.balanceOf(gauge.address)).to.be.eq(iterator.result1[0]);
          expect(await token1.balanceOf(PROTOCOL_RECIPIENT)).to.be.eq(iterator.result1[1]);
          expect(await token1.balanceOf(PARTNER_RECIPIENT)).to.be.eq(iterator.result1[2]);
        });
      }
    });
  });
});

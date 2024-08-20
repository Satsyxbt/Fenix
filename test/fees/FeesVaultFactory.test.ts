import { expect } from 'chai';
import { ethers } from 'hardhat';
import { FeesVaultUpgradeable, FeesVaultFactoryUpgradeable, FeesVaultFactoryUpgradeable__factory } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ERRORS, ZERO_ADDRESS, getAccessControlError } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, SignersList, deployTransaperntUpgradeableProxy } from '../utils/coreFixture';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('FeesVaultFactory Contract', function () {
  let signers: SignersList;
  let feesVaultFactory: FeesVaultFactoryUpgradeable;
  let feesVaultImplementation: FeesVaultUpgradeable;
  let factory: FeesVaultFactoryUpgradeable__factory;
  let deployed: CoreFixtureDeployed;
  let implementation: FeesVaultFactoryUpgradeable;

  let creator: HardhatEthersSigner;
  let mockPoolAddress1 = '0x1100000000000000000000000000000000000111';
  let mockPoolAddress2 = '0x1100000000000000000000000000000000000112';

  const DEFAULT_DISTRIBUTION_CONFIG = {
    toGaugeRate: 10000,
    recipients: [],
    rates: [],
  };
  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    creator = signers.fenixTeam;

    feesVaultFactory = deployed.feesVaultFactory;
    feesVaultImplementation = deployed.feesVaultImplementation;
    factory = await ethers.getContractFactory('FeesVaultFactoryUpgradeable');

    implementation = await factory.deploy(signers.deployer.address);

    await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), creator.address);
  });

  describe('Deployments', async () => {
    it('should correct set voter', async () => {
      expect(await feesVaultFactory.voter()).to.be.eq(deployed.voter.target);
    });
    it('has CLAIM_FEES_CALLER_ROLE', async () => {
      expect(await feesVaultFactory.CLAIM_FEES_CALLER_ROLE()).to.be.eq(
        '0xfe49275f0792362c35d68ef6a44cd32d365c9617abd3c30568953b5891b0420d',
      );
    });
    it('has WHITELISTED_CREATOR_ROLE', async () => {
      expect(await feesVaultFactory.WHITELISTED_CREATOR_ROLE()).to.be.eq(
        '0x400be8cdea82c593ef278a0994f451d04daad18f3a2ced40bcac267b98678ad2',
      );
    });
    it('has FEES_VAULT_ADMINISTRATOR_ROLE', async () => {
      expect(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE()).to.be.eq(
        '0x6318e0386017ad20a3ceaccdcc5664338f312d23d7291730079e3aa16981ac1e',
      );
    });
    it('should correct set initial feesVault implementation', async () => {
      expect(await feesVaultFactory.feesVaultImplementation()).to.be.eq(feesVaultImplementation.target);
    });
    it('should correct set defaultBlastGovernor', async () => {
      expect(await feesVaultFactory.defaultBlastGovernor()).to.be.eq(signers.blastGovernor.address);
    });
    it('should correct set defaultBlastPoints', async () => {
      expect(await feesVaultFactory.defaultBlastPoints()).to.be.eq(deployed.blastPoints.target);
    });
    it('should correct set defaultBlastPointsOperator', async () => {
      expect(await feesVaultFactory.defaultBlastPointsOperator()).to.be.eq(signers.blastGovernor.address);
    });
    it('should correct set DEFAULT_ADMIN role for deployer in contract', async () => {
      expect(await feesVaultFactory.hasRole(await feesVaultFactory.DEFAULT_ADMIN_ROLE(), signers.deployer.address)).to.be.true;
    });
    it('fail if try initialize on implementation', async () => {
      let implementation = await factory.deploy(signers.blastGovernor.address);
      await expect(
        implementation.initialize(
          signers.blastGovernor.address,
          deployed.blastPoints.target,
          signers.blastGovernor.address,
          deployed.voter.target,
          feesVaultImplementation.target,
          DEFAULT_DISTRIBUTION_CONFIG,
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });

    it('fails if provide zero governor address', async () => {
      let instance = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress())).target,
      ) as any as FeesVaultFactoryUpgradeable;
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            ZERO_ADDRESS,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            DEFAULT_DISTRIBUTION_CONFIG,
          ),
      ).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fails if provide zero voter address', async () => {
      let instance = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress())).target,
      ) as any as FeesVaultFactoryUpgradeable;
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            ZERO_ADDRESS,
            await feesVaultImplementation.getAddress(),
            DEFAULT_DISTRIBUTION_CONFIG,
          ),
      ).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fails if provide zero implementation address', async () => {
      let instance = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress())).target,
      ) as any as FeesVaultFactoryUpgradeable;
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            ZERO_ADDRESS,
            DEFAULT_DISTRIBUTION_CONFIG,
          ),
      ).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fails if provide zero blastPoints address', async () => {
      let instance = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress())).target,
      ) as any as FeesVaultFactoryUpgradeable;
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            ZERO_ADDRESS,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            DEFAULT_DISTRIBUTION_CONFIG,
          ),
      ).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fails if provide zero blastPoints operator address', async () => {
      let instance = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress())).target,
      ) as any as FeesVaultFactoryUpgradeable;
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            ZERO_ADDRESS,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            DEFAULT_DISTRIBUTION_CONFIG,
          ),
      ).to.be.revertedWithCustomError(factory, 'AddressZero');
    });
    it('fails if provide incorrect distribution config', async () => {
      let instance = factory.attach(
        (await deployTransaperntUpgradeableProxy(signers.deployer, signers.proxyAdmin.address, await implementation.getAddress())).target,
      ) as any as FeesVaultFactoryUpgradeable;

      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            {
              toGaugeRate: 9999,
              recipients: [],
              rates: [],
            },
          ),
      ).to.be.revertedWithCustomError(factory, 'IncorrectRates');
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            {
              toGaugeRate: 10001,
              recipients: [],
              rates: [],
            },
          ),
      ).to.be.revertedWithCustomError(factory, 'IncorrectRates');
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            {
              toGaugeRate: 5000,
              recipients: [signers.blastGovernor.address],
              rates: [5001],
            },
          ),
      ).to.be.revertedWithCustomError(factory, 'IncorrectRates');
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            {
              toGaugeRate: 0,
              recipients: [signers.blastGovernor.address],
              rates: [],
            },
          ),
      ).to.be.revertedWithCustomError(factory, 'ArraysLengthMismatch');
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            {
              toGaugeRate: 0,
              recipients: [],
              rates: [1],
            },
          ),
      ).to.be.revertedWithCustomError(factory, 'ArraysLengthMismatch');
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            {
              toGaugeRate: 0,
              recipients: [signers.blastGovernor.address],
              rates: [1, 1],
            },
          ),
      ).to.be.revertedWithCustomError(factory, 'ArraysLengthMismatch');
      await expect(
        instance
          .connect(signers.deployer)
          .initialize(
            signers.blastGovernor.address,
            deployed.blastPoints.target,
            signers.blastGovernor.address,
            deployed.voter.target,
            await feesVaultImplementation.getAddress(),
            {
              toGaugeRate: 0,
              recipients: [signers.blastGovernor.address, signers.deployer.address],
              rates: [1],
            },
          ),
      ).to.be.revertedWithCustomError(factory, 'ArraysLengthMismatch');
    });
  });

  describe('#setVoter', async () => {
    it('fails if caller not DEFAULT_ADMIN_ROLE', async () => {
      await expect(feesVaultFactory.connect(signers.otherUser1).setVoter(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await feesVaultFactory.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
      );
    });
    it('fails if try set ZERO_ADDRESS', async () => {
      await expect(feesVaultFactory.setVoter(ZERO_ADDRESS)).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
    });
    it('success set new voter address and emit event', async () => {
      expect(await feesVaultFactory.voter()).to.be.eq(deployed.voter.target);

      await expect(feesVaultFactory.connect(signers.deployer).setVoter(signers.otherUser1.address))
        .to.be.emit(feesVaultFactory, 'SetVoter')
        .withArgs(deployed.voter.target, signers.otherUser1.address);

      expect(await feesVaultFactory.voter()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#changeImplementation', async () => {
    it('fails if caller not DEFAULT_ADMIN_ROLE', async () => {
      await expect(feesVaultFactory.connect(signers.otherUser1).changeImplementation(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await feesVaultFactory.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address),
      );
    });
    it('fails if try set ZERO_ADDRESS', async () => {
      await expect(feesVaultFactory.changeImplementation(ZERO_ADDRESS)).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
    });
    it('success set new implementations address and emit event', async () => {
      expect(await feesVaultFactory.feesVaultImplementation()).to.be.eq(feesVaultImplementation.target);

      await expect(feesVaultFactory.connect(signers.deployer).changeImplementation(signers.otherUser1.address))
        .to.be.emit(feesVaultFactory, 'FeesVaultImplementationChanged')
        .withArgs(feesVaultImplementation.target, signers.otherUser1.address);

      expect(await feesVaultFactory.feesVaultImplementation()).to.be.eq(signers.otherUser1.address);
    });
  });

  describe('#_checkAccessForBlastFactoryManager', async () => {
    describe('#setDefaultBlastGovernor', async () => {
      it('fails if caller not FEE_VAULT_ADMINISTATOR_ROLE', async () => {
        await expect(feesVaultFactory.connect(signers.otherUser1).setDefaultBlastGovernor(signers.otherUser1.address)).to.be.revertedWith(
          getAccessControlError(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
        );
      });
      it('fails if try set ZERO_ADDRESS', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(feesVaultFactory.setDefaultBlastGovernor(ZERO_ADDRESS)).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
      });
      it('success set new default blast governor address and emit event', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);

        expect(await feesVaultFactory.defaultBlastGovernor()).to.be.eq(signers.blastGovernor.address);

        await expect(feesVaultFactory.connect(signers.deployer).setDefaultBlastGovernor(signers.otherUser1.address))
          .to.be.emit(feesVaultFactory, 'DefaultBlastGovernor')
          .withArgs(signers.otherUser1.address);

        expect(await feesVaultFactory.defaultBlastGovernor()).to.be.eq(signers.otherUser1.address);
      });
    });
    describe('#setDefaultBlastPoints', async () => {
      it('fails if caller not FEE_VAULT_ADMINISTATOR_ROLE', async () => {
        await expect(feesVaultFactory.connect(signers.otherUser1).setDefaultBlastPoints(signers.otherUser1.address)).to.be.revertedWith(
          getAccessControlError(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.otherUser1.address),
        );
      });
      it('fails if try set ZERO_ADDRESS', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(feesVaultFactory.setDefaultBlastPoints(ZERO_ADDRESS)).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
      });
      it('success set new default blast points address and emit event', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);

        expect(await feesVaultFactory.defaultBlastPoints()).to.be.eq(deployed.blastPoints.target);

        await expect(feesVaultFactory.connect(signers.deployer).setDefaultBlastPoints(signers.otherUser1.address))
          .to.be.emit(feesVaultFactory, 'DefaultBlastPoints')
          .withArgs(signers.otherUser1.address);

        expect(await feesVaultFactory.defaultBlastPoints()).to.be.eq(signers.otherUser1.address);
      });
    });
    describe('#setDefaultBlastPointsOperator', async () => {
      it('fails if caller not FEE_VAULT_ADMINISTATOR_ROLE', async () => {
        await expect(
          feesVaultFactory.connect(signers.otherUser1).setDefaultBlastPointsOperator(signers.otherUser1.address),
        ).to.be.revertedWith(getAccessControlError(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.otherUser1.address));
      });
      it('fails if try set ZERO_ADDRESS', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(feesVaultFactory.setDefaultBlastPointsOperator(ZERO_ADDRESS)).to.be.revertedWithCustomError(
          feesVaultFactory,
          'AddressZero',
        );
      });
      it('success set new default blast points operator address and emit event', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);

        expect(await feesVaultFactory.defaultBlastPointsOperator()).to.be.eq(signers.blastGovernor.address);

        await expect(feesVaultFactory.connect(signers.deployer).setDefaultBlastPointsOperator(signers.otherUser1.address))
          .to.be.emit(feesVaultFactory, 'DefaultBlastPointsOperator')
          .withArgs(signers.otherUser1.address);

        expect(await feesVaultFactory.defaultBlastPointsOperator()).to.be.eq(signers.otherUser1.address);
      });
    });
  });

  describe('#distribution configs', async () => {
    it('should correct return default config after deploy', async () => {
      expect(await feesVaultFactory.defaultDistributionConfig()).to.be.deep.eq([
        DEFAULT_DISTRIBUTION_CONFIG.toGaugeRate,
        DEFAULT_DISTRIBUTION_CONFIG.recipients,
        DEFAULT_DISTRIBUTION_CONFIG.rates,
      ]);
      expect(await feesVaultFactory.defaultDistributionConfig()).to.be.deep.eq([10000, [], []]);
    });
    describe('#setDefaultDistributionConfig', async () => {
      it('fail if try set from not fees vault administrator role', async () => {
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [],
          }),
        ).to.be.revertedWith(getAccessControlError(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address));
      });
      it('fail if try set inncorect configs when array length mismatch', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({ toGaugeRate: 10000, recipients: [], rates: [1] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 10000,
            recipients: [],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
      });
      it('fail if try set inncorect rates', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({ toGaugeRate: 9999, recipients: [], rates: [] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({ toGaugeRate: 10001, recipients: [], rates: [] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(feesVaultFactory.setDefaultDistributionConfig({ toGaugeRate: 10000, recipients: [], rates: [] })).to.be.not.reverted;

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 9999,
            recipients: [signers.blastGovernor.address],
            rates: [1],
          }),
        ).to.be.not.reverted;

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [10001],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [9999],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [10000],
          }),
        ).to.be.not.reverted;

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [5000, 50001],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({ toGaugeRate: 1, recipients: [], rates: [] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [5000, 5000],
          }),
        ).to.be.not.reverted;
      });
      it('fail if try set zero recipient or with zero rates', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [0],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [0],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 9999,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [0, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 9998,
            recipients: [signers.blastGovernor.address, ZERO_ADDRESS],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
      });
      it('should correct set new default config', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 6000,
            recipients: [signers.blastGovernor.address],
            rates: [4000],
          }),
        ).to.be.emit(feesVaultFactory, 'DefaultDistributionConfig');

        expect(await feesVaultFactory.defaultDistributionConfig()).to.be.deep.eq([6000, [signers.blastGovernor.address], [4000]]);
        expect(await feesVaultFactory.getDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);

        await expect(
          feesVaultFactory.setDefaultDistributionConfig({
            toGaugeRate: 9997,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [1, 2],
          }),
        ).to.be.emit(feesVaultFactory, 'DefaultDistributionConfig');

        let res = await feesVaultFactory.defaultDistributionConfig();
        expect(res.toGaugeRate).to.be.equal(9997);
        expect(res.recipients).to.be.deep.equal([signers.blastGovernor.address, signers.deployer.address]);
        expect(res.rates).to.be.deep.equal([1, 2]);
      });
    });
    describe('#setCustomDistributionConfig', async () => {
      it('fail if try set inncorect configs when array length mismatch', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, { toGaugeRate: 10000, recipients: [], rates: [1] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
      });
      it('fail if try set inncorect rates', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, { toGaugeRate: 9999, recipients: [], rates: [] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, { toGaugeRate: 10001, recipients: [], rates: [] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, { toGaugeRate: 10000, recipients: [], rates: [] }),
        ).to.be.not.reverted;

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 9999,
            recipients: [signers.blastGovernor.address],
            rates: [1],
          }),
        ).to.be.not.reverted;

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [10001],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [9999],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [10000],
          }),
        ).to.be.not.reverted;

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [5000, 50001],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, { toGaugeRate: 1, recipients: [], rates: [] }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [5000, 5000],
          }),
        ).to.be.not.reverted;
      });
      it('fail if try set zero recipient or with zero rates', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [0],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [0],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 9999,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [0, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 9998,
            recipients: [signers.blastGovernor.address, ZERO_ADDRESS],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
      });
      it('should clear custom config for address if set clear config', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
          toGaugeRate: 6000,
          recipients: [signers.blastGovernor.address],
          rates: [4000],
        });
        expect(await feesVaultFactory.isCustomConfig(signers.blastGovernor.address)).to.be.true;
        expect(await feesVaultFactory.customDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);

        await feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
          toGaugeRate: 0,
          recipients: [],
          rates: [],
        });
        expect(await feesVaultFactory.isCustomConfig(signers.blastGovernor.address)).to.be.false;
        expect(await feesVaultFactory.customDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([0, [], []]);
      });
      it('should correct set custom config', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 6000,
            recipients: [signers.blastGovernor.address],
            rates: [4000],
          }),
        ).to.be.emit(feesVaultFactory, 'CustomDistributionConfig');

        expect(await feesVaultFactory.isCustomConfig(signers.blastGovernor.address)).to.be.true;
        expect(await feesVaultFactory.customDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);
        expect(await feesVaultFactory.getDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);

        await expect(
          feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
            toGaugeRate: 9997,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [1, 2],
          }),
        ).to.be.emit(feesVaultFactory, 'CustomDistributionConfig');

        let res = await feesVaultFactory.getDistributionConfig(signers.blastGovernor.address);
        expect(res.toGaugeRate).to.be.equal(9997);
        expect(res.recipients).to.be.deep.equal([signers.blastGovernor.address, signers.deployer.address]);
        expect(res.rates).to.be.deep.equal([1, 2]);
      });
    });
    describe('#setDistributionConfigForCreator', async () => {
      it('fail if try set inncorect configs when array length mismatch', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [],
            rates: [1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'ArraysLengthMismatch');
      });
      it('fail if try set inncorect rates', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 9999,
            recipients: [],
            rates: [],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10001,
            recipients: [],
            rates: [],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [],
            rates: [],
          }),
        ).to.be.not.reverted;
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 9999,
            recipients: [signers.blastGovernor.address],
            rates: [1],
          }),
        ).to.be.not.reverted;
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [10001],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [9999],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [10000],
          }),
        ).to.be.not.reverted;
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [5000, 50001],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 1,
            recipients: [],
            rates: [],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [5000, 5000],
          }),
        ).to.be.not.reverted;
      });
      it('fail if try set zero recipient or with zero rates', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 0,
            recipients: [signers.blastGovernor.address],
            rates: [0],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 10000,
            recipients: [signers.blastGovernor.address],
            rates: [0],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 9999,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [0, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'IncorrectRates');
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 9998,
            recipients: [signers.blastGovernor.address, ZERO_ADDRESS],
            rates: [1, 1],
          }),
        ).to.be.revertedWithCustomError(feesVaultFactory, 'AddressZero');
      });
      it('should clear custom config for address if set clear config', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
          toGaugeRate: 6000,
          recipients: [signers.blastGovernor.address],
          rates: [4000],
        });
        expect(await feesVaultFactory.creatorDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);
        await feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
          toGaugeRate: 0,
          recipients: [],
          rates: [],
        });
        expect(await feesVaultFactory.creatorDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([0, [], []]);
      });
      it('should correct set custom config', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 6000,
            recipients: [signers.blastGovernor.address],
            rates: [4000],
          }),
        ).to.be.emit(feesVaultFactory, 'CreatorDistributionConfig');
        expect(await feesVaultFactory.creatorDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);
        await expect(
          feesVaultFactory.setDistributionConfigForCreator(signers.blastGovernor.address, {
            toGaugeRate: 9997,
            recipients: [signers.blastGovernor.address, signers.deployer.address],
            rates: [1, 2],
          }),
        ).to.be.emit(feesVaultFactory, 'CreatorDistributionConfig');
        let res = await feesVaultFactory.creatorDistributionConfig(signers.blastGovernor.address);
        expect(res.toGaugeRate).to.be.equal(9997);
        expect(res.recipients).to.be.deep.equal([signers.blastGovernor.address, signers.deployer.address]);
        expect(res.rates).to.be.deep.equal([1, 2]);
      });
    });

    describe('#getDistributionConfig', async () => {
      it('should return default config for address without custom config', async () => {
        expect(await feesVaultFactory.isCustomConfig(signers.blastGovernor.address)).to.be.false;
        expect(await feesVaultFactory.getDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          DEFAULT_DISTRIBUTION_CONFIG.toGaugeRate,
          DEFAULT_DISTRIBUTION_CONFIG.recipients,
          DEFAULT_DISTRIBUTION_CONFIG.rates,
        ]);
        expect(await feesVaultFactory.customDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([0, [], []]);
      });

      it('should return creator config if setup for address without custom config', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await feesVaultFactory.setDistributionConfigForCreator(creator.address, {
          toGaugeRate: 6000,
          recipients: [signers.blastGovernor.address],
          rates: [4000],
        });
        await feesVaultFactory.changeCreatorForFeesVaults(creator.address, [signers.blastGovernor.address]);
        expect(await feesVaultFactory.isCustomConfig(signers.blastGovernor.address)).to.be.false;
        expect(await feesVaultFactory.getDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);
        expect(await feesVaultFactory.customDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([0, [], []]);
      });

      it('should return custom config for address with custom config and creator config', async () => {
        await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
        await feesVaultFactory.setDistributionConfigForCreator(creator.address, {
          toGaugeRate: 8000,
          recipients: [signers.blastGovernor.address],
          rates: [2000],
        });
        await feesVaultFactory.changeCreatorForFeesVaults(creator.address, [signers.blastGovernor.address]);
        await feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
          toGaugeRate: 6000,
          recipients: [signers.blastGovernor.address],
          rates: [4000],
        });
        expect(await feesVaultFactory.isCustomConfig(signers.blastGovernor.address)).to.be.true;

        expect(await feesVaultFactory.getDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);
        expect(await feesVaultFactory.customDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          6000,
          [signers.blastGovernor.address],
          [4000],
        ]);
        await feesVaultFactory.setCustomDistributionConfig(signers.blastGovernor.address, {
          toGaugeRate: 0,
          recipients: [],
          rates: [],
        });
        expect(await feesVaultFactory.isCustomConfig(signers.blastGovernor.address)).to.be.false;
        expect(await feesVaultFactory.getDistributionConfig(signers.blastGovernor.address)).to.be.deep.eq([
          8000,
          [signers.blastGovernor.address],
          [2000],
        ]);
      });
    });
  });
  describe('#createVaultForPool', async () => {
    it('fails if caller not whitelisted creators', async () => {
      await expect(feesVaultFactory.connect(signers.otherUser1).createVaultForPool(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('fails if feesVault already created for target pool', async () => {
      await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
      await expect(feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1)).to.be.revertedWithCustomError(
        feesVaultFactory,
        'AlreadyCreated',
      );
    });
    describe('sucess create vault for pool', async () => {
      it('setup creator for fees vault', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
        expect(await feesVaultFactory.getFeesVaultCreator(newFeesVaultAddress)).to.be.eq(creator.address);
        await feesVaultFactory.grantRole(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), signers.deployer.address);
        let newFeesVaultAddress2 = await feesVaultFactory.connect(signers.deployer).createVaultForPool.staticCall(mockPoolAddress2);
        await feesVaultFactory.connect(signers.deployer).createVaultForPool(mockPoolAddress2);
        expect(await feesVaultFactory.getFeesVaultCreator(newFeesVaultAddress)).to.be.eq(creator.address);
        expect(await feesVaultFactory.getFeesVaultCreator(newFeesVaultAddress2)).to.be.eq(signers.deployer.address);
      });
      it('create end emit event', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await expect(feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1))
          .to.be.emit(feesVaultFactory, 'FeesVaultCreated')
          .withArgs(mockPoolAddress1, newFeesVaultAddress);
      });
      it('correct initialize creation feesVault', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
        let feesVault = await ethers.getContractAt('FeesVaultUpgradeable', newFeesVaultAddress);

        expect(await feesVault.factory()).to.be.eq(feesVaultFactory.target);
        expect(await feesVault.pool()).to.be.eq(mockPoolAddress1);
      });
      it('correct set poolToVault', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);

        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress1)).to.be.eq(newFeesVaultAddress);
        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress2)).to.be.eq(ZERO_ADDRESS);

        let newFeesVaultAddress2 = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress2);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress2);
        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress1)).to.be.eq(newFeesVaultAddress);
        expect(await feesVaultFactory.getVaultForPool(mockPoolAddress2)).to.be.eq(newFeesVaultAddress2);
      });
      it('deployed feesVault cant be initialzie second time', async () => {
        let newFeesVaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
        await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
        let feesVault = await ethers.getContractAt('FeesVaultUpgradeable', newFeesVaultAddress);

        await expect(feesVault.initialize(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS)).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
    });
  });
  describe('#afterPoolInitialize', async () => {
    beforeEach(async () => {
      await feesVaultFactory.grantRole(await feesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), signers.deployer.address);
    });

    it('fails if caller not whitelisted creators', async () => {
      await expect(feesVaultFactory.connect(signers.otherUser1).afterPoolInitialize(signers.otherUser1.address)).to.be.revertedWith(
        getAccessControlError(await feesVaultFactory.WHITELISTED_CREATOR_ROLE(), signers.otherUser1.address),
      );
    });
    it('fail if call rebasing config but token not rebasing tokne', async () => {
      let mockPool = await ethers.deployContract('PoolMock');
      mockPool.setTokens(signers.blastGovernor.address, signers.blastGovernor.address);
      await feesVaultFactory.setConfigurationForRebaseToken(signers.blastGovernor.address, true, 1);
      await feesVaultFactory.connect(creator).createVaultForPool(mockPool.target);
      await expect(feesVaultFactory.connect(creator).afterPoolInitialize(mockPool.target)).to.be.reverted;
    });
    it('correct set rebase mode for pool tokens only for token 0', async () => {
      let mockPool = await ethers.deployContract('PoolMock');
      let token0 = await ethers.deployContract('ERC20RebasingMock');
      let token1 = await ethers.deployContract('ERC20RebasingMock');
      let vaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPool.target);

      await feesVaultFactory.connect(creator).createVaultForPool(mockPool.target);

      await mockPool.setTokens(token0.target, token1.target);
      expect(await token0.getConfiguration(vaultAddress)).to.be.eq(0);
      expect(await token1.getConfiguration(vaultAddress)).to.be.eq(0);

      await feesVaultFactory.setConfigurationForRebaseToken(token0.target, true, 1);
      await feesVaultFactory.connect(creator).afterPoolInitialize(mockPool.target);

      expect(await token0.getConfiguration(vaultAddress)).to.be.eq(1);
      expect(await token1.getConfiguration(vaultAddress)).to.be.eq(0);
    });
    it('correct set rebase mode for pool tokens only for token 1', async () => {
      let mockPool = await ethers.deployContract('PoolMock');
      let token0 = await ethers.deployContract('ERC20RebasingMock');
      let token1 = await ethers.deployContract('ERC20RebasingMock');
      let vaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPool.target);
      await feesVaultFactory.connect(creator).createVaultForPool(mockPool.target);

      await mockPool.setTokens(token0.target, token1.target);
      expect(await token0.getConfiguration(vaultAddress)).to.be.eq(0);
      expect(await token1.getConfiguration(vaultAddress)).to.be.eq(0);

      await feesVaultFactory.setConfigurationForRebaseToken(token1.target, true, 2);
      await feesVaultFactory.connect(creator).afterPoolInitialize(mockPool.target);

      expect(await token0.getConfiguration(vaultAddress)).to.be.eq(0);
      expect(await token1.getConfiguration(vaultAddress)).to.be.eq(2);
    });

    it('correct set rebase mode by default for pool tokens', async () => {
      let mockPool = await ethers.deployContract('PoolMock');
      let token0 = await ethers.deployContract('ERC20RebasingMock');
      let token1 = await ethers.deployContract('ERC20RebasingMock');
      let vaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPool.target);

      await feesVaultFactory.connect(creator).createVaultForPool(mockPool.target);

      await mockPool.setTokens(token0.target, token1.target);
      expect(await token0.getConfiguration(vaultAddress)).to.be.eq(0);
      expect(await token1.getConfiguration(vaultAddress)).to.be.eq(0);

      await feesVaultFactory.setConfigurationForRebaseToken(token0.target, true, 1);
      await feesVaultFactory.setConfigurationForRebaseToken(token1.target, true, 2);

      await feesVaultFactory.connect(creator).afterPoolInitialize(mockPool.target);

      expect(await token0.getConfiguration(vaultAddress)).to.be.eq(1);
      expect(await token1.getConfiguration(vaultAddress)).to.be.eq(2);
    });
  });
  describe('#changeCreatorForFeesVaults', async () => {
    it('fails if caller not DEFAULT_ADMIN_ROLE', async () => {
      await expect(
        feesVaultFactory.connect(signers.otherUser1).changeCreatorForFeesVaults(signers.otherUser1.address, []),
      ).to.be.revertedWith(getAccessControlError(await feesVaultFactory.DEFAULT_ADMIN_ROLE(), signers.otherUser1.address));
    });
    it('#1 success change creator for fees vaults', async () => {
      let vaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
      await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
      let vaultAddress2 = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress2);
      await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress2);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress)).to.be.eq(creator.address);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress2)).to.be.eq(creator.address);
      await expect(feesVaultFactory.changeCreatorForFeesVaults(signers.deployer.address, [vaultAddress, vaultAddress2]))
        .to.be.emit(feesVaultFactory, 'ChangeCreatorForFeesVaults')
        .withArgs(signers.deployer.address, [vaultAddress, vaultAddress2]);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress)).to.be.eq(signers.deployer.address);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress2)).to.be.eq(signers.deployer.address);
    });
    it('#2 success change creator for fees vaults', async () => {
      let vaultAddress = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress1);
      await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress1);
      let vaultAddress2 = await feesVaultFactory.connect(creator).createVaultForPool.staticCall(mockPoolAddress2);
      await feesVaultFactory.connect(creator).createVaultForPool(mockPoolAddress2);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress)).to.be.eq(creator.address);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress2)).to.be.eq(creator.address);
      await expect(feesVaultFactory.changeCreatorForFeesVaults(signers.deployer.address, [vaultAddress2]))
        .to.be.emit(feesVaultFactory, 'ChangeCreatorForFeesVaults')
        .withArgs(signers.deployer.address, [vaultAddress2]);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress)).to.be.eq(creator.address);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress2)).to.be.eq(signers.deployer.address);
      await expect(feesVaultFactory.changeCreatorForFeesVaults(signers.deployer.address, [vaultAddress]))
        .to.be.emit(feesVaultFactory, 'ChangeCreatorForFeesVaults')
        .withArgs(signers.deployer.address, [vaultAddress]);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress)).to.be.eq(signers.deployer.address);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress2)).to.be.eq(signers.deployer.address);
      await expect(feesVaultFactory.changeCreatorForFeesVaults(creator.address, [vaultAddress2, vaultAddress]))
        .to.be.emit(feesVaultFactory, 'ChangeCreatorForFeesVaults')
        .withArgs(creator.address, [vaultAddress2, vaultAddress]);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress)).to.be.eq(creator.address);
      expect(await feesVaultFactory.getFeesVaultCreator(vaultAddress2)).to.be.eq(creator.address);
    });
  });
});

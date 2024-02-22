import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ERRORS, ONE, ONE_ETHER, ONE_GWEI, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { ethers } from 'hardhat';
import { takeSnapshot, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable,
  BribeUpgradeable__factory,
  ERC20Mock,
  TransparentUpgradeableProxy__factory,
} from '../../typechain-types';
import { deployToken } from '../utils/fixture';
import { token } from '../../typechain-types/@openzeppelin/contracts';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployBribeFactory,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  deployVoter,
} from '../utils/coreFixture';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';

describe('BribeFactoryUpgradeable Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;

  let bribeFactory: BribeFactoryUpgradeable;
  let bribeFactoryUpgradeableFactory: BribeFactoryUpgradeable__factory;

  let token18: ERC20Mock;
  let token9: ERC20Mock;
  let token6: ERC20Mock;
  let token5: ERC20Mock;

  async function deployBribeFactory(deployer: HardhatEthersSigner, proxyAdmin: string): Promise<BribeFactoryUpgradeable> {
    const factory = await ethers.getContractFactory('BribeFactoryUpgradeable');
    const implementation = await factory.connect(deployer).deploy();
    const proxy = await deployTransaperntUpgradeableProxy(deployer, proxyAdmin, await implementation.getAddress());
    const attached = factory.attach(proxy.target) as BribeFactoryUpgradeable;
    return attached;
  }

  beforeEach(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;

    token18 = await deployERC20MockToken(signers.deployer, 'Token18', 'T18', 18);
    token9 = await deployERC20MockToken(signers.deployer, 'Token9', 'T9', 9);
    token6 = await deployERC20MockToken(signers.deployer, 'Token6', 'T6', 6);
    token5 = await deployERC20MockToken(signers.deployer, 'Token5', 'T5', 5);

    bribeFactory = deployed.bribeFactory;
    bribeFactoryUpgradeableFactory = (await ethers.getContractFactory(
      'BribeFactoryUpgradeable',
    )) as any as BribeFactoryUpgradeable__factory;
  });

  describe('Deployment', async function () {
    it('Should fail if try call initialize on implementation', async function () {
      let implementation = await bribeFactoryUpgradeableFactory.deploy();
      await expect(
        implementation.initialize(signers.blastGovernor.address, deployed.voter.target, deployed.bribeImplementation.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should fail if try second time to initialize', async function () {
      await expect(
        bribeFactory.initialize(signers.blastGovernor.address, deployed.voter.target, deployed.bribeImplementation.target),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should correct set initial settings', async function () {
      expect(await bribeFactory.owner()).to.be.equal(signers.deployer.address);
      expect(await bribeFactory.voter()).to.be.equal(deployed.voter.target);
      expect(await bribeFactory.last_bribe()).to.be.equal(ZERO_ADDRESS);
      expect(await bribeFactory.defaultBlastGovernor()).to.be.equal(signers.blastGovernor.address);
      expect(await bribeFactory.bribeImplementation()).to.be.equal(deployed.bribeImplementation.target);
      expect(await bribeFactory.bribeOwner()).to.be.equal(signers.deployer.address);
    });
    it('Should fail if one of main address is zero', async function () {
      let proxy = await deployBribeFactory(signers.deployer, signers.proxyAdmin.address);

      await expect(
        proxy.initialize(ZERO_ADDRESS, deployed.voter.target, deployed.bribeImplementation.target),
      ).to.be.revertedWithCustomError(proxy, 'AddressZero');

      await expect(
        proxy.initialize(signers.blastGovernor.address, ZERO_ADDRESS, deployed.bribeImplementation.target),
      ).to.be.revertedWithCustomError(proxy, 'AddressZero');
      await expect(proxy.initialize(signers.blastGovernor.address, deployed.voter.target, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        proxy,
        'AddressZero',
      );
    });
  });
  describe('Create bribe', async function () {
    describe('Should corectly create new bribe', async function () {
      let deployedTx: any;
      let deployedBribeAddress: string;

      beforeEach(async function () {
        deployedBribeAddress = await bribeFactory.createBribe.staticCall(
          await token6.getAddress(),
          await token5.getAddress(),
          'Bribe Type 1',
        );
        deployedTx = await bribeFactory.createBribe(await token6.getAddress(), await token5.getAddress(), 'Bribe Type 1');
      });
      it('Should corect return newBribe address', async function () {
        expect(await bribeFactory.last_bribe()).to.be.equal(deployedBribeAddress);
      });
      it('Fail if try initialize second time', async function () {
        let bribe = (await ethers.getContractFactory('BribeUpgradeable')).attach(deployedBribeAddress) as BribeUpgradeable;
        await expect(bribe.initialize(ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS, '123')).to.be.revertedWith(
          ERRORS.Initializable.Initialized,
        );
      });
      it('Should corect initialize deployead bribe', async function () {
        let bribe = (await ethers.getContractFactory('BribeUpgradeable')).attach(deployedBribeAddress) as BribeUpgradeable;
        expect(await bribe.voter()).to.be.equal(await bribeFactory.voter());
        expect(await bribe.owner()).to.be.equal(await bribeFactory.bribeOwner());
        expect(await bribe.bribeFactory()).to.be.equal(await bribeFactory.getAddress());
        expect(await bribe.TYPE()).to.be.equal('Bribe Type 1');

        expect(await bribe.rewardsList()).to.be.deep.equal([await token6.getAddress(), await token5.getAddress()]);
        expect(await bribe.rewardsList()).to.have.length(2);
      });
      it('Deployed bribe should get implementation from factory implementation slot', async function () {
        expect(
          '0x' +
            (
              await ethers.provider.getStorage(deployedBribeAddress, '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc')
            ).substring(26),
        ).to.be.equal((await bribeFactory.bribeImplementation()).toLowerCase());
      });
      it('Deployed bribe should be added to bribe list', async function () {
        expect(await bribeFactory.last_bribe()).to.be.equal(deployedBribeAddress);
      });
    });
    describe('Should corectly create bribe without token1 and token2', async function () {
      let deployedBribeAddress: string;
      beforeEach(async function () {
        deployedBribeAddress = await bribeFactory.createBribe.staticCall(ZERO_ADDRESS, ZERO_ADDRESS, 'Bribe Type 1');
        await bribeFactory.createBribe(ZERO_ADDRESS, ZERO_ADDRESS, 'Bribe Type 1');
      });

      it('Should corect initialize deployead bribe', async function () {
        let bribe = (await ethers.getContractFactory('BribeUpgradeable')).attach(deployedBribeAddress) as BribeUpgradeable;
        expect(await bribe.voter()).to.be.equal(await bribeFactory.voter());
        expect(await bribe.owner()).to.be.equal(await bribeFactory.bribeOwner());
        expect(await bribe.bribeFactory()).to.be.equal(await bribeFactory.getAddress());
        expect(await bribe.TYPE()).to.be.equal('Bribe Type 1');
        expect(await bribe.rewardsList()).to.be.deep.equal([]);
        expect(await bribe.rewardsList()).to.have.length(0);
      });
    });
  });
  describe('Functions', async function () {
    describe('#setVoter', async function () {
      it('Should fail if try to set zero address', async function () {
        await expect(bribeFactory.setVoter(ZERO_ADDRESS)).to.be.revertedWithCustomError(bribeFactory, 'AddressZero');
      });
      it('Should corectly set new voter address', async function () {
        let voter = await deployVoter(
          signers.deployer,
          signers.proxyAdmin.address,
          signers.blastGovernor.address,
          await deployed.votingEscrow.getAddress(),
          await deployed.v2PairFactory.getAddress(),
          await deployed.gaugeFactory.getAddress(),
          await deployed.bribeFactory.getAddress(),
        );
        expect(await bribeFactory.voter()).to.be.not.equal(voter.target);
        let tx = await bribeFactory.setVoter(await voter.getAddress());
        expect(await bribeFactory.voter()).to.be.equal(await voter.getAddress());

        await expect(tx)
          .to.be.emit(bribeFactory, 'SetVoter')
          .withArgs(await deployed.voter.target, await voter.getAddress());
      });
    });
  });
  describe('Check access control', async function () {
    describe('functions for only access from contract Owner', async function () {
      it('#changeImplementation - Should fail if call from not owner', async () => {
        await expect(bribeFactory.connect(signers.otherUser1).changeImplementation(signers.otherUser1.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#changeImplementation - Should success called from owner', async () => {
        await expect(bribeFactory.changeImplementation(signers.otherUser1.address)).to.be.not.reverted;
      });
      it('#setDefaultBlastGovernor - Should fail if call from not owner', async () => {
        await expect(bribeFactory.connect(signers.otherUser1).setDefaultBlastGovernor(signers.otherUser1.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#setDefaultBlastGovernor - Should success called from owner', async () => {
        await expect(bribeFactory.setDefaultBlastGovernor(signers.otherUser1.address)).to.be.not.reverted;
      });
      it('#addRewards - Should fail if call from not owner', async () => {
        await expect(bribeFactory.connect(signers.otherUser1)['addRewards(address,address[])'](token18.target, [])).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
        await expect(
          bribeFactory.connect(signers.otherUser1)['addRewards(address[][],address[])']([[token18.target]], []),
        ).to.be.revertedWith('only voter or owner');
      });
      it('#addRewards - Should success called from owner', async () => {
        await expect(bribeFactory['addRewards(address,address[])'](token18.target, [])).to.be.not.reverted;
        await expect(bribeFactory['addRewards(address[][],address[])']([[token18.target]], [])).to.be.not.reverted;
      });
      it('#setVoter - Should fail if call from not owner', async () => {
        await expect(bribeFactory.connect(signers.otherUser1).setVoter(signers.otherUser1.address)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('#setVoter - Should success called from owner', async () => {
        await expect(bribeFactory.setVoter(signers.otherUser1.address)).to.be.not.reverted;
      });
    });
    describe('functions for only access from contract Owner or Vote address', async () => {
      it('#createBribe - Should fail if call from not owner or vote', async () => {
        await expect(
          bribeFactory.connect(signers.otherUser1).createBribe(await token18.getAddress(), await token9.getAddress(), 'Type'),
        ).to.be.revertedWith('only voter or voter');
      });
      it('#createBribe - Should success called from owner or vote', async () => {
        await expect(bribeFactory.createBribe(ZERO_ADDRESS, ZERO_ADDRESS, 'Typed')).to.be.not.reverted;
      });
    });
  });
});

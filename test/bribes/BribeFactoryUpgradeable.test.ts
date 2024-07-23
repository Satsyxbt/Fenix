import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERRORS, ZERO_ADDRESS } from '../utils/constants';

import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { BribeFactoryUpgradeable, BribeFactoryUpgradeable__factory, BribeUpgradeable, ERC20Mock } from '../../typechain-types';
import completeFixture, {
  CoreFixtureDeployed,
  SignersList,
  deployERC20MockToken,
  deployTransaperntUpgradeableProxy,
  deployVoter,
} from '../utils/coreFixture';

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
    const implementation = await factory.connect(deployer).deploy(deployer.address);
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
      let implementation = await bribeFactoryUpgradeableFactory.deploy(signers.deployer.address);
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
    describe('#addRewards', async function () {
      it('Should fail if provide array with different length', async function () {
        await expect(bribeFactory['addRewards(address[][],address[])']([], [ZERO_ADDRESS])).to.be.revertedWith('arraies length mismatch');
        await expect(bribeFactory['addRewards(address[][],address[])']([[ZERO_ADDRESS]], [])).to.be.revertedWith('arraies length mismatch');
        await expect(bribeFactory['addRewards(address[][],address[])']([[ZERO_ADDRESS]], [ZERO_ADDRESS, ZERO_ADDRESS])).to.be.revertedWith(
          'arraies length mismatch',
        );
      });
    });
    describe('#pushDefaultRewardToken', async () => {
      it('fail if try call add zero address as reward token', async () => {
        await expect(bribeFactory.pushDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWithCustomError(bribeFactory, 'AddressZero');
      });

      it('fail if try call from not owner', async () => {
        await expect(bribeFactory.connect(signers.otherUser1).pushDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('fail if try add already added reward token', async () => {
        await bribeFactory.pushDefaultRewardToken(token18.target);
        await expect(bribeFactory.pushDefaultRewardToken(token18.target)).to.be.revertedWith('already added');
      });
      it('success add new default reward token', async () => {
        expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([]);
        expect(await bribeFactory.isDefaultRewardToken(token18.target)).to.be.false;
        await expect(bribeFactory.pushDefaultRewardToken(token18.target))
          .to.be.emit(bribeFactory, 'AddDefaultRewardToken')
          .withArgs(token18.target);
        expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([token18.target]);
        expect(await bribeFactory.isDefaultRewardToken(token18.target)).to.be.true;
      });
    });
    describe('#removeDefaultRewardToken', async () => {
      it('fail if try call remove zero address as reward token', async () => {
        await expect(bribeFactory.removeDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWithCustomError(bribeFactory, 'AddressZero');
      });

      it('fail if try call from not owner', async () => {
        await expect(bribeFactory.connect(signers.otherUser1).removeDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWith(
          ERRORS.Ownable.NotOwner,
        );
      });
      it('fail if remove not added reward token', async () => {
        await expect(bribeFactory.removeDefaultRewardToken(token18.target)).to.be.revertedWith('not exists');
      });
      it('success remove default reward token', async () => {
        await bribeFactory.pushDefaultRewardToken(token18.target);
        expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([token18.target]);
        expect(await bribeFactory.isDefaultRewardToken(token18.target)).to.be.true;
        await expect(bribeFactory.removeDefaultRewardToken(token18.target))
          .to.be.emit(bribeFactory, 'RemoveDefaultRewardToken')
          .withArgs(token18.target);
        expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([]);
        expect(await bribeFactory.isDefaultRewardToken(token18.target)).to.be.false;
      });
    });

    it('#getDefaultRewardTokens() should return correct current default reward tokens list', async () => {
      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([]);
      await bribeFactory.pushDefaultRewardToken(token18.target);
      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([token18.target]);
      await bribeFactory.removeDefaultRewardToken(token18.target);

      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([]);
      await bribeFactory.pushDefaultRewardToken(token18.target);

      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([token18.target]);
      await bribeFactory.pushDefaultRewardToken(token6.target);

      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([token18.target, token6.target]);
      await bribeFactory.removeDefaultRewardToken(token18.target);
      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([token6.target]);
      await bribeFactory.pushDefaultRewardToken(token18.target);
      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([token6.target, token18.target]);
      await bribeFactory.removeDefaultRewardToken(token18.target);
      await bribeFactory.removeDefaultRewardToken(token6.target);
      expect(await bribeFactory.getDefaultRewardTokens()).to.be.deep.eq([]);
    });

    describe('#getBribeRewardTokens', async () => {
      it('should return zero list if tokens not present', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        expect(await bribeFactory.getBribeRewardTokens(deployedBribeAddress)).to.be.deep.eq([]);
      });
      it('should return only tokens from bribe if not present default tokens', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(token18.target, token6.target, 'Bribe');
        expect(await bribeFactory.getBribeRewardTokens(deployedBribeAddress)).to.be.deep.eq([token18.target, token6.target]);
      });
      it('should return only default tokens', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.pushDefaultRewardToken(token18.target);
        expect(await bribeFactory.getBribeRewardTokens(deployedBribeAddress)).to.be.deep.eq([token18.target]);
      });
      it('should return correct list default + bribes tokens with duplicates', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(token18.target, token5.target, 'Bribe');
        await bribeFactory.createBribe(token18.target, token5.target, 'Bribe');
        await bribeFactory.pushDefaultRewardToken(token18.target);
        await bribeFactory.pushDefaultRewardToken(token9.target);
        expect(await bribeFactory.getBribeRewardTokens(deployedBribeAddress)).to.be.deep.eq([
          token18.target,
          token9.target,
          token18.target,
          token5.target,
        ]);
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

  describe('Bribe functions', async () => {
    it('add reward token should emit event', async () => {
      let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
      let tx = await bribeFactory.createBribe(token18.target, ethers.ZeroAddress, 'Bribe');
      let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
      await expect(tx).to.be.emit(Bribe, 'AddRewardToken').withArgs(token18.target);
    });
    describe('notifyReward', async () => {
      it('should fail if try notify reward without allowerd reward token', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
        await expect(Bribe.notifyRewardAmount(token18.target, 0)).to.be.revertedWith('reward token not verified');
      });
      it('should not fail with verified error if try add default reward token', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
        await bribeFactory.pushDefaultRewardToken(token18.target);
        await expect(Bribe.notifyRewardAmount(token18.target, 0)).to.be.not.revertedWith('reward token not verified');
      });
      it('should not fail with verified error if try add reward token from bribe', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(token18.target, ethers.ZeroAddress, 'Bribe');
        let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
        await expect(Bribe.notifyRewardAmount(token18.target, 0)).to.be.not.revertedWith('reward token not verified');
      });
    });
    describe('#getRewardTokens', async () => {
      it('should return zero list if tokens not present', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
        expect(await Bribe.getRewardTokens()).to.be.deep.eq([]);
        expect(await Bribe.getSpecificRewardTokens()).to.be.deep.eq([]);
      });
      it('should return only tokens from bribe if not present default tokens', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(token18.target, token6.target, 'Bribe');
        let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
        expect(await Bribe.getRewardTokens()).to.be.deep.eq([token18.target, token6.target]);
        expect(await Bribe.getSpecificRewardTokens()).to.be.deep.eq([token18.target, token6.target]);
      });
      it('should return only default tokens', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.createBribe(ethers.ZeroAddress, ethers.ZeroAddress, 'Bribe');
        await bribeFactory.pushDefaultRewardToken(token18.target);
        let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
        expect(await Bribe.getRewardTokens()).to.be.deep.eq([token18.target]);
        expect(await Bribe.getSpecificRewardTokens()).to.be.deep.eq([]);
      });
      it('should return correct list default + bribes tokens with duplicates', async () => {
        let deployedBribeAddress = await bribeFactory.createBribe.staticCall(token18.target, token5.target, 'Bribe');
        await bribeFactory.createBribe(token18.target, token5.target, 'Bribe');
        await bribeFactory.pushDefaultRewardToken(token18.target);
        await bribeFactory.pushDefaultRewardToken(token9.target);
        let Bribe = await ethers.getContractAt('BribeUpgradeable', deployedBribeAddress);
        expect(await Bribe.getRewardTokens()).to.be.deep.eq([token18.target, token9.target, token18.target, token5.target]);
        expect(await Bribe.getSpecificRewardTokens()).to.be.deep.eq([token18.target, token5.target]);
      });
    });
  });
});

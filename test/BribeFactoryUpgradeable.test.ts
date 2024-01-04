import { BribeFactoryUpgradeable, BribeFactoryUpgradeable__factory } from '../typechain-types/index';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import completeFixture from './utils/fixture';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ZERO_ADDRESS } from './utils/constants';
import { ethers } from 'hardhat';

describe('BribeFactoryUpgradeable Contract', function () {
  let wallets: {
    deployer: HardhatEthersSigner | undefined;
    otherUser: HardhatEthersSigner | undefined;
    others: HardhatEthersSigner[];
  };
  let bribeFactoryImplementation: BribeFactoryUpgradeable;
  let bribeFactoryProxy: BribeFactoryUpgradeable;
  let defaultRewardsToken: string[];
  let voter: HardhatEthersSigner;

  beforeEach(async function () {
    wallets = {
      deployer: undefined,
      otherUser: undefined,
      others: [],
    };

    // Load the fixture and assign values
    let result = await loadFixture(completeFixture);
    wallets.deployer = result.wallets.deployer;
    wallets.otherUser = result.wallets.otherUser;
    [voter, ...wallets.others] = result.wallets.others;

    bribeFactoryImplementation = result.bribeFactoryImplementation;
    bribeFactoryProxy = result.bribeFactoryProxy;

    defaultRewardsToken = [await result.tokens.token18.getAddress(), await result.tokens.token9.getAddress()];

    await bribeFactoryProxy.initialize(voter.address, await bribeFactoryImplementation.getAddress(), defaultRewardsToken);
  });

  describe('Deployment', function () {
    it('Initialization should be disable on implementaion', async function () {
      await expect(
        bribeFactoryImplementation.initialize(wallets.deployer!.address, await bribeFactoryImplementation.getAddress(), []),
      ).revertedWith('Initializable: contract is already initialized');
    });
    it('Should correct set initial settings after initialization', async function () {
      expect(await bribeFactoryProxy.voter()).to.be.equal(voter);

      expect(await bribeFactoryProxy.implementation()).to.be.equal(await bribeFactoryImplementation.getAddress());

      defaultRewardsToken.forEach(async (t) => {
        expect(await bribeFactoryProxy.isDefaultRewardToken(t)).to.be.true;
      });
    });
    it('Should fail initialization if array of defaultRewardToken have any zero addreses', async function () {
      await expect(
        bribeFactoryProxy.initialize(voter.address, await bribeFactoryImplementation.getAddress(), [ZERO_ADDRESS, defaultRewardsToken[0]]),
      ).revertedWithCustomError(bribeFactoryProxy, 'ZeroAddress');
    });
    it('Should fail initialization if array of defaultRewardToken have token address duplicate', async function () {
      await expect(
        bribeFactoryProxy.initialize(voter.address, await bribeFactoryImplementation.getAddress(), [
          defaultRewardsToken[0],
          defaultRewardsToken[0],
        ]),
      ).revertedWithCustomError(bribeFactoryProxy, 'TokenAlreadyAdded');
    });
  });
});

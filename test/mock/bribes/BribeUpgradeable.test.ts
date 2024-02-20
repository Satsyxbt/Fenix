import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BribeUpgradeable, BribeUpgradeable__factory, ERC20Mock, GaugeUpgradeable } from '../../../typechain-types/index';
import { ERRORS, ONE, ONE_ETHER, ONE_GWEI, ZERO, ZERO_ADDRESS } from '../../utils/constants';
import { takeSnapshot, mine, time, loadFixture, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';
import completeFixture, { CoreFixtureDeployed, SignersList, deployERC20MockToken } from '../../utils/coreFixture';

describe('BribeUpgradeable Contract', function () {
  let signers: SignersList;
  let deployed: CoreFixtureDeployed;
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let tokenTK9: ERC20Mock;
  let testGauge: GaugeUpgradeable;
  let testBribe: BribeUpgradeable;

  async function createGauge(): Promise<GaugeUpgradeable> {
    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK18.target, true);
    let result = await deployed.voter
      .connect(signers.deployer)
      .createGauge.staticCall(await deployed.v2PairFactory.getPair(deployed.fenix.target, tokenTK18.target, true), 0);
    await deployed.voter
      .connect(signers.deployer)
      .createGauge(await deployed.v2PairFactory.getPair(deployed.fenix.target, tokenTK18.target, true), 0);

    return await ethers.getContractAt('GaugeUpgradeable', result[0]);
  }
  before(async function () {
    deployed = await loadFixture(completeFixture);
    signers = deployed.signers;
    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);
    tokenTK9 = await deployERC20MockToken(deployed.signers.deployer, 'TK9', 'TK9', 9);

    testGauge = await createGauge();
    testBribe = (await ethers.getContractAt('BribeUpgradeable', await testGauge.internal_bribe())) as BribeUpgradeable;
  });

  describe('Deployment', async () => {
    describe('Should corect setup initial settings', async () => {
      it('Should corect setup initial settings', async () => {
        expect(await testBribe.ve()).to.be.equal(deployed.votingEscrow.target);
        expect(await testBribe.voter()).to.be.equal(deployed.voter.target);
        expect(await testBribe.bribeFactory()).to.be.equal(deployed.bribeFactory.target);
        expect(await testBribe.owner()).to.be.equal(signers.deployer.address);
        expect(await testBribe.firstBribeTimestamp()).to.be.equal(ZERO);
        expect(await testBribe.TYPE()).to.be.equal('Fenix LP Fees: sAMM-FNX/TK18');
      });
      it('Should corect setup reward initial reward token', async () => {
        expect(await testBribe.rewardsList()).to.be.deep.equal([deployed.fenix.target, tokenTK18.target]);
        expect(await testBribe.rewardsListLength()).to.be.deep.equal(2);
      });
    });
    it('Should fail if try initialize second time', async () => {
      await expect(
        testBribe.initialize(signers.blastGovernor.address, deployed.voter.target, deployed.bribeFactory.target, 'TYPE FENIX FEE'),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should disable oportunity to call initializer on implementation', async () => {
      await expect(
        deployed.bribeImplementation.initialize(
          signers.blastGovernor.address,
          deployed.voter.target,
          deployed.bribeFactory.target,
          'TYPE FENIX FEE',
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
  });
  describe('Deposit & Withdraw', async () => {
    describe('Deposit', async () => {
      it('Should fail if try call from not voter contract', async () => {
        await expect(testBribe.deposit(ONE_ETHER, 1)).to.be.reverted;
      });
      it('GENERAL TEST simulation of corect deposits', async () => {
        let epoch = await testBribe.getEpochStart();
        let nextEpoch = await testBribe.getNextEpochStart();

        await deployed.fenix.transfer(signers.otherUser1.address, ONE_ETHER * BigInt(10));
        await deployed.fenix.connect(signers.otherUser1).approve(deployed.votingEscrow.getAddress(), ONE_ETHER * BigInt(10));

        await deployed.votingEscrow.connect(signers.otherUser1).create_lock(ONE_ETHER, 2 * 182 * 86400);
        let tokenId = await deployed.votingEscrow.tokenId();
        let votingPower = await deployed.votingEscrow.balanceOfNFT(tokenId);

        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOf(tokenId)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwner(signers.otherUser1.address)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), nextEpoch)).to.be.equal(ZERO);

        // FIRST USER VOTE
        await deployed.voter.connect(signers.otherUser1).vote(tokenId, [await testGauge.TOKEN()], [1]);
        await mine(1);

        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOf(tokenId)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwner(signers.otherUser1.address)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, nextEpoch)).to.be.closeTo(
          votingPower,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe['earned(uint256,address)'](tokenId, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1, await tokenTK18.getAddress())).to.be.equal(ZERO);

        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), nextEpoch)).to.be.equal(ZERO);

        await deployed.fenix.transfer(signers.otherUser2.address, ONE_ETHER * BigInt(20));
        await deployed.fenix.connect(signers.otherUser2).approve(deployed.votingEscrow.getAddress(), ONE_ETHER * BigInt(20));

        // SECOND USER VOTE
        await deployed.votingEscrow.connect(signers.otherUser2).create_lock(ONE_ETHER, 2 * 182 * 86400);
        let tokenId2 = await deployed.votingEscrow.tokenId();
        let votingPower2 = await deployed.votingEscrow.balanceOfNFT(tokenId);

        await deployed.voter.connect(signers.otherUser2).vote(tokenId2, [await testGauge.TOKEN()], [1]);
        await mine(1);

        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId2, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId2, nextEpoch)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));

        expect(await testBribe.balanceOf(tokenId)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOf(tokenId2)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwner(signers.otherUser1.address)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwner(signers.otherUser2.address)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, nextEpoch)).to.be.closeTo(
          votingPower,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser2.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser2.address, nextEpoch)).to.be.closeTo(
          votingPower2,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe['earned(uint256,address)'](tokenId, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1.address, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1.address, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser2.address, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser2.address, await tokenTK18.getAddress())).to.be.equal(ZERO);

        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), nextEpoch)).to.be.equal(ZERO);

        // change epoch

        await time.increase(7 + 86400);
        await deployed.voter.distributeAll();

        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId2, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId2, nextEpoch)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));

        expect(await testBribe.balanceOf(tokenId)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOf(tokenId2)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwner(signers.otherUser1.address)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwner(signers.otherUser2.address)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser1.address, nextEpoch)).to.be.closeTo(
          votingPower,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser2.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfOwnerAt(signers.otherUser2.address, nextEpoch)).to.be.closeTo(
          votingPower2,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe['earned(uint256,address)'](tokenId, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1.address, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser1.address, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await tokenTK18.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser2.address, await deployed.fenix.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](signers.otherUser2.address, await tokenTK18.getAddress())).to.be.equal(ZERO);

        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await deployed.fenix.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await tokenTK18.getAddress(), nextEpoch)).to.be.equal(ZERO);
      });
    });
    describe('Withdraw', async () => {
      it('Should fail if try call from not voter contract', async () => {
        await expect(testBribe.withdraw(ONE_ETHER, 1)).to.be.reverted;
      });
    });
  });
});

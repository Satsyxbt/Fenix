import { ethers } from 'hardhat';
import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {
  BribeFactoryUpgradeable,
  BribeFactoryUpgradeable__factory,
  BribeUpgradeable,
  BribeUpgradeable__factory,
  CLGaugeFactoryUpgradeable,
  CLGaugeFactoryUpgradeable__factory,
  CLGaugeUpgradeable,
  CLGaugeUpgradeable__factory,
  ERC20Mock,
  ERC20Mock__factory,
  EmissionManagerUpgradeable,
  EmissionManagerUpgradeable__factory,
  Fenix,
  Fenix__factory,
  PairFactoryMock,
  PermissionsRegistry,
  PermissionsRegistry__factory,
  ProxyAdmin,
  ProxyAdmin__factory,
  RewardsDistributor,
  RewardsDistributor__factory,
  TransparentUpgradeableProxy__factory,
  VeArtProxyUpgradeable,
  VeArtProxyUpgradeable__factory,
  VoterUpgradeable,
  VoterUpgradeable__factory,
  VotingEscrowUpgradeable,
  VotingEscrowUpgradeable__factory,
} from '../../typechain-types/index';
import { ERRORS, ONE, ONE_ETHER, ONE_GWEI, ZERO, ZERO_ADDRESS } from '../utils/constants';
import { takeSnapshot, mine, time, SnapshotRestorer } from '@nomicfoundation/hardhat-network-helpers';

describe('BribeUpgradeable Contract', function () {
  let ProxyAdmin: ProxyAdmin__factory;
  let TransparentUpgradeableProxy: TransparentUpgradeableProxy__factory;
  let VotingEscrowUpgradeable: VotingEscrowUpgradeable__factory;
  let VoterUpgradeable: VoterUpgradeable__factory;
  let BribeFactoryUpgradeable: BribeFactoryUpgradeable__factory;
  let BribeUpgradeable: BribeUpgradeable__factory;
  let CLGaugeUpgradeable: CLGaugeUpgradeable__factory;
  let VeArtProxyUpgradeable: VeArtProxyUpgradeable__factory;
  let CLGaugeFactoryUpgradeable: CLGaugeFactoryUpgradeable__factory;
  let EmissionManagerUpgradeable: EmissionManagerUpgradeable__factory;
  let PermissionsRegistry: PermissionsRegistry__factory;
  let RewardsDistributor: RewardsDistributor__factory;
  let PairFactoryMock: PairFactoryMock__factory;
  let UniswapV2PoolMock: UniswapV2PoolMock__factory;

  let FenixFactory: Fenix__factory;
  let ERC20MockFactory: ERC20Mock__factory;

  let fenixInstance: Fenix;
  let emissionManagerImplementation: EmissionManagerUpgradeable;
  let emissionManagerInstance: EmissionManagerUpgradeable;
  let permissionRegistryInstance: PermissionsRegistry;
  let voterImplementation: VoterUpgradeable;
  let voterInstance: VoterUpgradeable;
  let votingEscrowImplementation: VotingEscrowUpgradeable;
  let votingEscrowInstance: VotingEscrowUpgradeable;
  let bribeImplementation: BribeUpgradeable;
  let clGaugeImplementation: CLGaugeUpgradeable;
  let bribeFactoryImplementation: BribeFactoryUpgradeable;
  let bribeFactoryInstance: BribeFactoryUpgradeable;
  let clGaugeFactoryImplementation: CLGaugeFactoryUpgradeable;
  let clGaugeFactoryInstance: CLGaugeFactoryUpgradeable;
  let veArtProxyImplementation: VeArtProxyUpgradeable;
  let veArtProxyInstance: VeArtProxyUpgradeable;
  let pairFactoryMockInstance: PairFactoryMock;
  let rewardsDistributorInstance: RewardsDistributor;
  let proxyAdminInstance: ProxyAdmin;

  let usdcInstance: ERC20Mock;

  let deployer: HardhatEthersSigner;
  let governance: HardhatEthersSigner;
  let voterAdmin: HardhatEthersSigner;
  let otheruser: HardhatEthersSigner;
  let otheruser2: HardhatEthersSigner;

  let testGauge: CLGaugeUpgradeable;
  let testBribe: BribeUpgradeable;

  let snapshot: SnapshotRestorer;

  async function createGauge(): Promise<CLGaugeUpgradeable> {
    let pool = await UniswapV2PoolMock.deploy();
    await pool.setToken0(await fenixInstance.getAddress());
    await pool.setToken1(await usdcInstance.getAddress());
    await pool.setSymbol('FNX-USDC Mock');

    await pairFactoryMockInstance.setIsPair(await pool.getAddress(), true);

    let result = await voterInstance.connect(governance).createGauge.staticCall(pool, 0);
    await voterInstance.connect(governance).createGauge(pool, 0);

    return CLGaugeUpgradeable.attach(result[0]) as CLGaugeUpgradeable;
  }
  before(async function () {
    [deployer, governance, voterAdmin, otheruser, otheruser2] = await ethers.getSigners();
    ProxyAdmin = await ethers.getContractFactory('ProxyAdmin');
    TransparentUpgradeableProxy = await ethers.getContractFactory('TransparentUpgradeableProxy');
    VotingEscrowUpgradeable = await ethers.getContractFactory('VotingEscrowUpgradeable');
    VoterUpgradeable = await ethers.getContractFactory('VoterUpgradeable');
    BribeFactoryUpgradeable = await ethers.getContractFactory('BribeFactoryUpgradeable');
    BribeUpgradeable = await ethers.getContractFactory('BribeUpgradeable');
    CLGaugeUpgradeable = await ethers.getContractFactory('CLGaugeUpgradeable');
    VeArtProxyUpgradeable = await ethers.getContractFactory('VeArtProxyUpgradeable');
    CLGaugeFactoryUpgradeable = await ethers.getContractFactory('CLGaugeFactoryUpgradeable');
    EmissionManagerUpgradeable = await ethers.getContractFactory('EmissionManagerUpgradeable');
    PermissionsRegistry = await ethers.getContractFactory('PermissionsRegistry');
    RewardsDistributor = await ethers.getContractFactory('RewardsDistributor');
    PairFactoryMock = await ethers.getContractFactory('PairFactoryMock');
    FenixFactory = await ethers.getContractFactory('Fenix');
    ERC20MockFactory = await ethers.getContractFactory('ERC20Mock');
    UniswapV2PoolMock = await ethers.getContractFactory('UniswapV2PoolMock');

    emissionManagerImplementation = await EmissionManagerUpgradeable.deploy();
    voterImplementation = await VoterUpgradeable.deploy();
    votingEscrowImplementation = await VotingEscrowUpgradeable.deploy();
    bribeImplementation = await BribeUpgradeable.deploy();
    clGaugeImplementation = await CLGaugeUpgradeable.deploy();
    bribeFactoryImplementation = await BribeFactoryUpgradeable.deploy();
    clGaugeFactoryImplementation = await CLGaugeFactoryUpgradeable.deploy();
    veArtProxyImplementation = await VeArtProxyUpgradeable.deploy();
    permissionRegistryInstance = await PermissionsRegistry.deploy();
    pairFactoryMockInstance = await PairFactoryMock.deploy();
    proxyAdminInstance = await ProxyAdmin.deploy();
    usdcInstance = (await ERC20MockFactory.deploy('USDC', 'USDC', 18)) as ERC20Mock;

    await permissionRegistryInstance.setRoleFor(voterAdmin.address, 'VOTER_ADMIN');
    await permissionRegistryInstance.setRoleFor(governance.address, 'GOVERNANCE');

    emissionManagerInstance = EmissionManagerUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(
          await emissionManagerImplementation.getAddress(),
          await proxyAdminInstance.getAddress(),
          '0x',
        )
      ).getAddress(),
    ) as EmissionManagerUpgradeable;

    fenixInstance = await FenixFactory.deploy(deployer.address);
    await fenixInstance.mint(deployer.address, ONE_ETHER * BigInt(1000000));
    await fenixInstance.transferOwnership(await emissionManagerInstance.getAddress());

    voterInstance = VoterUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await voterImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as VoterUpgradeable;
    votingEscrowInstance = VotingEscrowUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await votingEscrowImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as VotingEscrowUpgradeable;

    bribeFactoryInstance = BribeFactoryUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await bribeFactoryImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as BribeFactoryUpgradeable;
    clGaugeFactoryInstance = CLGaugeFactoryUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(
          await clGaugeFactoryImplementation.getAddress(),
          await proxyAdminInstance.getAddress(),
          '0x',
        )
      ).getAddress(),
    ) as CLGaugeFactoryUpgradeable;
    veArtProxyInstance = VeArtProxyUpgradeable.attach(
      await (
        await TransparentUpgradeableProxy.deploy(await veArtProxyImplementation.getAddress(), await proxyAdminInstance.getAddress(), '0x')
      ).getAddress(),
    ) as VeArtProxyUpgradeable;

    await votingEscrowInstance.initialize(await fenixInstance.getAddress(), await veArtProxyInstance.getAddress());
    await votingEscrowInstance.setVoter(await voterInstance.getAddress());

    rewardsDistributorInstance = await RewardsDistributor.deploy(await votingEscrowInstance.getAddress());

    await voterInstance.initialize(
      await votingEscrowInstance.getAddress(),
      await bribeFactoryInstance.getAddress(),
      await permissionRegistryInstance.getAddress(),
      await emissionManagerInstance.getAddress(),
      [await fenixInstance.getAddress()],
      {
        gaugeFactory: await clGaugeFactoryInstance.getAddress(),
        pairFactory: await pairFactoryMockInstance.getAddress(),
      },
    );

    await emissionManagerInstance.initialize(
      await voterInstance.getAddress(),
      await votingEscrowInstance.getAddress(),
      await rewardsDistributorInstance.getAddress(),
    );

    await bribeFactoryInstance.initialize(
      await voterInstance.getAddress(),
      await permissionRegistryInstance.getAddress(),
      await bribeImplementation.getAddress(),
      [await fenixInstance.getAddress()],
    );
    await clGaugeFactoryInstance.initialize(await permissionRegistryInstance.getAddress(), await clGaugeImplementation.getAddress());

    testGauge = await createGauge();
    testBribe = BribeUpgradeable.attach(await testGauge.internalBribe()) as BribeUpgradeable;

    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    await snapshot.restore();
  });

  describe('Deployment', async () => {
    describe('Should corect setup initial settings', async () => {
      it('Should corect setup initial settings', async () => {
        expect(await testBribe.votingEscrow()).to.be.equal(await votingEscrowInstance.getAddress());
        expect(await testBribe.voter()).to.be.equal(await voterInstance.getAddress());
        expect(await testBribe.bribeFactory()).to.be.equal(await bribeFactoryInstance.getAddress());
        expect(await testBribe.owner()).to.be.equal(await deployer.getAddress());
        expect(await testBribe.firstBribeTimestamp()).to.be.equal(ZERO);
        expect(await testBribe.TYPE()).to.be.equal('Fenix LP Fees: FNX-USDC Mock');
      });
      it('Should corect setup reward initial reward token', async () => {
        expect(await testBribe.getRewardTokens()).to.be.deep.equal([await fenixInstance.getAddress(), await usdcInstance.getAddress()]);
        expect(await testBribe.rewardsListLength()).to.be.deep.equal(2);
      });
    });
    it('Should fail if try initialize second time', async () => {
      await expect(
        testBribe.initialize(
          voterAdmin.address,
          await voterInstance.getAddress(),
          await bribeFactoryInstance.getAddress(),
          'TYPE FENIX FEE',
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
    it('Should disable oportunity to call initializer on implementation', async () => {
      await expect(
        bribeImplementation.initialize(
          voterAdmin.address,
          await voterInstance.getAddress(),
          await bribeFactoryInstance.getAddress(),
          'TYPE FENIX FEE',
        ),
      ).to.be.revertedWith(ERRORS.Initializable.Initialized);
    });
  });
  describe('Deposit & Withdraw', async () => {
    describe('Deposit', async () => {
      it('Should fail if try call from not voter contract', async () => {
        await expect(testBribe.deposit(ONE_ETHER, 1)).to.be.revertedWithCustomError(testBribe, 'AccessDenied');
      });
      it('GENERAL TEST simulation of corect deposits', async () => {
        let epoch = await testBribe.getEpochStart();
        let nextEpoch = await testBribe.getNextEpochStart();

        await fenixInstance.transfer(otheruser.address, ONE_ETHER * BigInt(10));
        await fenixInstance.connect(otheruser).approve(votingEscrowInstance.getAddress(), ONE_ETHER * BigInt(10));

        await votingEscrowInstance.connect(otheruser).create_lock(ONE_ETHER, 2 * 182 * 86400);
        let tokenId = await votingEscrowInstance.tokenId();
        let votingPower = await votingEscrowInstance.balanceOfNFT(tokenId);

        expect(await testBribe.totalSupplyPerEpoch(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyPerEpoch(nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOf(tokenId)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwner(otheruser.address)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);

        // FIRST USER VOTE
        await voterInstance.connect(otheruser).vote(tokenId, [await testGauge.depositToken()], [1]);
        await mine(1);

        expect(await testBribe.totalSupplyPerEpoch(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyPerEpoch(nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOf(tokenId)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwner(otheruser.address)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, nextEpoch)).to.be.closeTo(
          votingPower,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe['earned(uint256,address)'](tokenId, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await usdcInstance.getAddress())).to.be.equal(ZERO);

        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);

        await fenixInstance.transfer(otheruser2.address, ONE_ETHER * BigInt(20));
        await fenixInstance.connect(otheruser2).approve(votingEscrowInstance.getAddress(), ONE_ETHER * BigInt(20));

        // SECOND USER VOTE
        await votingEscrowInstance.connect(otheruser2).create_lock(ONE_ETHER, 2 * 182 * 86400);
        let tokenId2 = await votingEscrowInstance.tokenId();
        let votingPower2 = await votingEscrowInstance.balanceOfNFT(tokenId);

        await voterInstance.connect(otheruser2).vote(tokenId2, [await testGauge.depositToken()], [1]);
        await mine(1);

        expect(await testBribe.totalSupplyPerEpoch(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyPerEpoch(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId2, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId2, nextEpoch)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));

        expect(await testBribe.balanceOf(tokenId)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOf(tokenId2)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwner(otheruser.address)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwner(otheruser2.address)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, nextEpoch)).to.be.closeTo(
          votingPower,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser2.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser2.address, nextEpoch)).to.be.closeTo(
          votingPower2,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe['earned(uint256,address)'](tokenId, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser2, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser2, await usdcInstance.getAddress())).to.be.equal(ZERO);

        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);

        // change epoch

        await time.increase(7 + 86400);
        await voterInstance.distributeAll();

        expect(await testBribe.totalSupplyPerEpoch(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupply()).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(epoch)).to.be.equal(ZERO);
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyPerEpoch(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.totalSupplyAt(nextEpoch)).to.be.closeTo(votingPower + votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId, nextEpoch)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfAt(tokenId2, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfAt(tokenId2, nextEpoch)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));

        expect(await testBribe.balanceOf(tokenId)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOf(tokenId2)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwner(otheruser.address)).to.be.closeTo(votingPower, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwner(otheruser2.address)).to.be.closeTo(votingPower2, ethers.parseEther('0.000001'));
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser.address, nextEpoch)).to.be.closeTo(
          votingPower,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser2.address, epoch)).to.be.equal(ZERO);
        expect(await testBribe.balanceOfTokenOwnerAt(otheruser2.address, nextEpoch)).to.be.closeTo(
          votingPower2,
          ethers.parseEther('0.000001'),
        );
        expect(await testBribe['earned(uint256,address)'](tokenId, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await usdcInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(uint256,address)'](tokenId2, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser2, await fenixInstance.getAddress())).to.be.equal(ZERO);
        expect(await testBribe['earned(address,address)'](otheruser2, await usdcInstance.getAddress())).to.be.equal(ZERO);

        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await fenixInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), epoch)).to.be.equal(ZERO);
        expect(await testBribe.rewardPerToken(await usdcInstance.getAddress(), nextEpoch)).to.be.equal(ZERO);
      });
    });
    describe('Withdraw', async () => {
      it('Should fail if try call from not voter contract', async () => {
        await expect(testBribe.withdraw(ONE_ETHER, 1)).to.be.revertedWithCustomError(testBribe, 'AccessDenied');
      });
      describe('Should corect withdraw voting power after reset', async () => {});
    });
  });
});

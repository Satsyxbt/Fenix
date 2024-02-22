import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import completeFixture, { CoreFixtureDeployed, FactoryFixture, deployAlgebraCore, deployERC20MockToken } from '../utils/coreFixture';
import { ERC20Mock } from '../../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

describe('Main', function () {
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
  let tokenTK9: ERC20Mock;
  let algebraCore: FactoryFixture;

  before('deployed', async () => {
    deployed = await loadFixture(completeFixture);

    algebraCore = await deployAlgebraCore();
    signers = deployed.signers;

    tokenTK18 = await deployERC20MockToken(deployed.signers.deployer, 'TK18', 'TK18', 18);
    tokenTK6 = await deployERC20MockToken(deployed.signers.deployer, 'TK6', 'TK6', 6);
    tokenTK9 = await deployERC20MockToken(deployed.signers.deployer, 'TK9', 'TK9', 9);
  });

  it('Correct change ');
  it('Correct create new pairs in v2 factory', async () => {
    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK18.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK18.target, false);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK6.target, false);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK6.target, true);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK9.target, false);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(deployed.fenix.target, tokenTK9.target, true);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK6.target, tokenTK18.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK6.target, tokenTK18.target, false);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK9.target, tokenTK18.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK9.target, tokenTK18.target, false);

    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK6.target, tokenTK9.target, true);
    await deployed.v2PairFactory.connect(signers.deployer).createPair(tokenTK6.target, tokenTK9.target, false);
  });
});

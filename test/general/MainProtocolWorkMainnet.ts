import { AlgebraFactoryUpgradeable, AlgebraPool } from '@cryptoalgebra/integral-core/typechain';
import { SwapRouter } from '@cryptoalgebra/integral-periphery/typechain';

import AlgebraFactory_artifact from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraFactoryUpgradeable.sol/AlgebraFactoryUpgradeable.json';
import AlgebraPool_artifact from '@cryptoalgebra/integral-core/artifacts/contracts/AlgebraPool.sol/AlgebraPool.json';

import SwapRouter_artifact from '@cryptoalgebra/integral-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import {
  ProxyAdmin,
  IBlastMock,
  BlastPointsMock,
  BribeFactoryUpgradeable,
  FeesVaultFactoryUpgradeable,
  Fenix,
  GaugeFactoryUpgradeable,
  MerklGaugeMiddleman,
  MinterUpgradeable,
  PairFactoryUpgradeable,
  RFenix,
  RouterV2,
  VeFnxDistributorUpgradeable,
  VoterUpgradeable,
  VotingEscrowUpgradeable,
  ERC20RebasingMock,
} from '../../typechain-types';
import { Contract } from 'hardhat/internal/hardhat-network/stack-traces/model';
import { ERRORS, ZERO_ADDRESS, getAccessControlError } from '../utils/constants';
import { token } from '@cryptoalgebra/integral-core/typechain/@openzeppelin/contracts';
import { encodePriceSqrt } from '@cryptoalgebra/integral-core/test/shared/utilities';

describe('Main', function () {
  if (process.env.BLAST_MAINNET_FORK === 'true') {
    const addresses = {
      fenix: '0x52f847356b38720B55ee18Cb3e094ca11C85A192',
      weth: '0x4300000000000000000000000000000000000004',
      usdb: '0x4300000000000000000000000000000000000003',
      ProxyAdmin: '0xdD75F0d1ccF1b2E115d87f0177b67c0F0F8429B5',
      VotingEscrow: '0x99988De25e33A2CAF1B8d0A13fa67558059dd937',
      Voter: '0xd7ad4143f32523a6878eD01d7E07e71CeAB22430',
      RouterV2: '0x0998bEc51D95EAa75Ffdf465D5deD16aEd2ba2fe',
      AlgebraFactory: '0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df',
      SwapRouter: '0x2df37Cb897fdffc6B4b03d8252d85BE7C6dA9d00',
      BribeFactory: '0x0136d0b6E3a3fA7fabCb809fc1697a89D451f97f',
      PairFactory: '0xa19C51D91891D3DF7C13Ed22a2f89d328A82950f',
      FeesVaultFactory: '0x25D84140b5a611Fc8b13B0a73b7ac86d30C81edB',
      RFenix: '0xEDB4f9CB084B0dc4B06EB0c588697a2CCa2E6532',
      MerklGaugeMiddleman: '0x0145C48FC4c0BB3034f332B3171124d607D6Bd2C',
      MerklDistributionCreator: '0x8bb4c975ff3c250e0ceea271728547f3802b36fd ',
      Minter: '0xa4FF6fe53212e8da028e0a34819006A26615D9f8',
      Blast: '0x4300000000000000000000000000000000000002',
      BlastPoints: '0x2536FE9ab3F511540F2f9e2eC2A805005C3Dd800',
      VeFNXDsitributor: '0x4F5BdBc19025bBa0244C764F52CC064AbC76eC96',
      GaugeFactory1: '0x0639ecB0B82D7fb625b9598956EE93e1FC4398cE',
      GaugeFactory2: '0x30d245a690B2E2105bd22Bd475BBa09921D59EAB',
      GaugeFactory3: '0xA57B11E7fF9A13Bb2A367dd507D4BB469a3C426d',
      Deployer: '0x4867664BaAFE5926B3cA338e96c88fB5a5FeAb30',
      blastPointsOperator: '0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4',
      blastGovernor: '0xb279Cb42Ab3d598Eb3A864399C11a52a5f506bA4',
      fenixTresuary: '0xAC12571907b0aEE0eFd2BC13505B88284d5854db',
      merkleDistributionCreator: '0x8bb4c975ff3c250e0ceea271728547f3802b36fd',
      VeArtProxy: '0xdc24C85A65580fF0d6c9178534e98ac4C8eCE8f8',
      MinterImplementation: '0x014e818AA9C222F9D8e1c2EF6A7da2f6D6bd10b3',
      VeArtProxyImplementation: '0x3eD36254b340B39c5150fBc97e1d96593Aa38770',
      VoterImplementation: '0x015FD12D47241DC6766315fB033b8DE7D043e705',
      VotingEscrowImplementation: '0x77B485433DB4cf314929A36DC3c3601c579091B6',
      VeFnxDistributorImplementation: '0x3c772ee7Ab45BD106f6af53DE20548df58C3829d',
      BribeFactoryImplementation: '0xA2E5cd7D56d4e97614c6e0fBB708a8ecaA7437e3',
      BribeImplementation: '0xBB3A43D792cDCB3d810c0e500c21bD958686B90b',
      GaugeFactoryImplementation: '0xAfBA5614db7d3708c61a63B23E53c37217e52f82',
      GaugeImplementation: '0x5f95aF3EE7cA36Eea7D34dEe30F3CaCbBCe7D657',
      PairFactoryImplementation: '0x050faB54aaaEBf0F8DA36ffb69036C59B19a5b7e',
      PairImplementation: '0x2c3f891c0ca3635B6C5eA303a9cd7f29c7Fcd00E',
      FeesVaultImplementation: '0xeD685caDAFf29520c27e3965D67AF14F00639A98',
      FeesVaultFactoryImplementation: '0xAbAD1E34dE64e0C06017A856F94EdEf0913c5D0a',
    };

    let Signers: {
      deployer: HardhatEthersSigner;
      blastGovernor: HardhatEthersSigner;
      user1: HardhatEthersSigner;
      user2: HardhatEthersSigner;
    };

    let Tokens: {
      fenix: Fenix;
      weth: ERC20RebasingMock;
      usdb: ERC20RebasingMock;
    };

    let Contracts: {
      VotingEscrow: VotingEscrowUpgradeable;
      Voter: VoterUpgradeable;
      GaugeFactory1: GaugeFactoryUpgradeable;
      GaugeFactory2: GaugeFactoryUpgradeable;
      GaugeFactory3: GaugeFactoryUpgradeable;
      PairFactory: PairFactoryUpgradeable;
      FeesVaultFactory: FeesVaultFactoryUpgradeable;
      BribeFactory: BribeFactoryUpgradeable;
      RFenix: RFenix;
      Minter: MinterUpgradeable;
      VeFNXDsitributor: VeFnxDistributorUpgradeable;
      RouterV2: RouterV2;
      MerklGaugeMiddleman: MerklGaugeMiddleman;
      AlgebraFactory: AlgebraFactoryUpgradeable;
      SwapRouter: SwapRouter;
      ProxyAdmin: ProxyAdmin;
      Blast: IBlastMock;
      BlastPoints: BlastPointsMock;
    };

    before('attach', async () => {
      const signers = await ethers.getSigners();
      expect(signers[0], 'Launching only through a fork').to.be.not.eq(addresses.Deployer);

      Signers = {
        deployer: await ethers.getImpersonatedSigner(addresses.Deployer),
        blastGovernor: await ethers.getImpersonatedSigner(addresses.blastGovernor),
        user1: await ethers.getImpersonatedSigner('0x100000000000000000000000000000000000abcd'), // just test address
        user2: await ethers.getImpersonatedSigner('0x200000000000000000000000000000000000dcba'), // just test address
      };

      await signers[0].sendTransaction({ to: Signers.user1.address, value: ethers.parseEther('1000') });
      await signers[0].sendTransaction({ to: Signers.user2.address, value: ethers.parseEther('1000') });

      Tokens = {
        fenix: await ethers.getContractAt('Fenix', addresses.fenix),
        weth: (await ethers.getContractAt('ERC20RebasingMock', addresses.weth)) as any as ERC20RebasingMock,
        usdb: (await ethers.getContractAt('ERC20RebasingMock', addresses.usdb)) as any as ERC20RebasingMock,
      };

      Contracts = {
        ProxyAdmin: (await ethers.getContractAt('ProxyAdmin', addresses.ProxyAdmin)) as any as ProxyAdmin,
        VotingEscrow: await ethers.getContractAt('VotingEscrowUpgradeable', addresses.VotingEscrow),
        Voter: await ethers.getContractAt('VoterUpgradeable', addresses.Voter),
        RouterV2: await ethers.getContractAt('RouterV2', addresses.RouterV2),
        AlgebraFactory: (await ethers.getContractAtFromArtifact(
          AlgebraFactory_artifact,
          addresses.AlgebraFactory,
        )) as any as AlgebraFactoryUpgradeable,
        SwapRouter: (await ethers.getContractAtFromArtifact(SwapRouter_artifact, addresses.SwapRouter)) as any as SwapRouter,
        BribeFactory: await ethers.getContractAt('BribeFactoryUpgradeable', addresses.BribeFactory),
        PairFactory: await ethers.getContractAt('PairFactoryUpgradeable', addresses.PairFactory),
        FeesVaultFactory: await ethers.getContractAt('FeesVaultFactoryUpgradeable', addresses.FeesVaultFactory),
        RFenix: await ethers.getContractAt('RFenix', addresses.RFenix),
        MerklGaugeMiddleman: await ethers.getContractAt('MerklGaugeMiddleman', addresses.MerklGaugeMiddleman),
        Minter: await ethers.getContractAt('MinterUpgradeable', addresses.Minter),
        Blast: (await ethers.getContractAt('IBlastMock', addresses.Blast)) as any as IBlastMock,
        BlastPoints: (await ethers.getContractAt('BlastPointsMock', addresses.BlastPoints)) as any as BlastPointsMock,
        VeFNXDsitributor: await ethers.getContractAt('VeFnxDistributorUpgradeable', addresses.VeFNXDsitributor),
        GaugeFactory1: await ethers.getContractAt('GaugeFactoryUpgradeable', addresses.GaugeFactory1),
        GaugeFactory2: await ethers.getContractAt('GaugeFactoryUpgradeable', addresses.GaugeFactory2),
        GaugeFactory3: await ethers.getContractAt('GaugeFactoryUpgradeable', addresses.GaugeFactory3),
      };
    });
    describe('check state', async () => {
      describe('proxy admins', async () => {
        const contractsToCheck = [
          'VotingEscrow',
          'Voter',
          'GaugeFactory1',
          'GaugeFactory2',
          'GaugeFactory3',
          'PairFactory',
          'FeesVaultFactory',
          'BribeFactory',
          'Minter',
          'VeFNXDsitributor',
        ];

        for (const contractName of contractsToCheck) {
          it(`Proxy admin from ${contractName} should eq ProxyAdmin address`, async () => {
            const targetAddress = addresses[contractName];
            expect(await Contracts.ProxyAdmin.getProxyAdmin(targetAddress), `${contractName} proxy admin should be eq ProxyAdmin`).to.be.eq(
              Contracts.ProxyAdmin.target,
            );
          });
        }
      });
      describe('proxy implementations', async () => {
        const targets = [
          ['VotingEscrow', addresses.VotingEscrowImplementation],
          ['GaugeFactory3', addresses.GaugeFactoryImplementation],
          ['GaugeFactory2', addresses.GaugeFactoryImplementation],
          ['GaugeFactory1', addresses.GaugeFactoryImplementation],
          ['Minter', addresses.MinterImplementation],
          ['BribeFactory', addresses.BribeFactoryImplementation],
          ['PairFactory', addresses.PairFactoryImplementation],
          ['FeesVaultFactory', addresses.FeesVaultFactoryImplementation],
          ['VeFNXDsitributor', addresses.VeFnxDistributorImplementation],
        ];

        for (const [contractName, implementationAddress] of targets) {
          it(`${contractName} implementation should match expected address`, async () => {
            const contractAddress = addresses[contractName];
            const actualImplementation = await Contracts.ProxyAdmin.getProxyImplementation(contractAddress);
            expect(actualImplementation, `${contractName} implementation should match`).to.be.eq(implementationAddress);
          });
        }
      });

      it('check ownership', async () => {
        expect(await Contracts.RFenix.owner()).to.be.eq(addresses.Deployer);
        expect(await Contracts.AlgebraFactory.owner()).to.be.eq(addresses.Deployer);

        expect(await Contracts.PairFactory.hasRole(await Contracts.AlgebraFactory.DEFAULT_ADMIN_ROLE(), addresses.Deployer)).to.be.true;
        expect(await Contracts.AlgebraFactory.hasRole(await Contracts.AlgebraFactory.DEFAULT_ADMIN_ROLE(), addresses.Deployer)).to.be.true;
        expect(await Contracts.FeesVaultFactory.hasRole(await Contracts.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), addresses.Deployer)).to.be
          .true;

        expect(await Contracts.GaugeFactory1.owner()).to.be.eq(addresses.Deployer);
        expect(await Contracts.GaugeFactory2.owner()).to.be.eq(addresses.Deployer);
        expect(await Contracts.GaugeFactory3.owner()).to.be.eq(addresses.Deployer);
        expect(await Contracts.BribeFactory.owner()).to.be.eq(addresses.Deployer);

        expect(await Contracts.Voter.governance()).to.be.eq(addresses.Deployer);
        expect(await Contracts.Voter.admin()).to.be.eq(addresses.Deployer);

        expect(await Contracts.VotingEscrow.team()).to.be.eq(addresses.Deployer);
        expect(await Contracts.MerklGaugeMiddleman.owner()).to.be.eq(addresses.Deployer);
        expect(await Contracts.VeFNXDsitributor.owner()).to.be.eq(addresses.Deployer);
        expect(await Contracts.Minter.owner()).to.be.eq(addresses.Deployer);
      });

      describe('check contract dependency', async () => {
        it('VotingEscrow dependencies', async () => {
          expect(await Contracts.VotingEscrow.voter()).to.be.eq(Contracts.Voter.target);
          expect(await Contracts.VotingEscrow.artProxy()).to.be.eq(addresses.VeArtProxy);
          expect(await Contracts.VotingEscrow.veBoost()).to.be.eq(ZERO_ADDRESS);
        });

        it('Voter dependencies', async () => {
          expect(await Contracts.Voter.minter()).to.be.eq(Contracts.Minter.target);
          expect(await Contracts.Voter.bribefactory()).to.be.eq(Contracts.BribeFactory.target);
          expect(await Contracts.Voter._ve()).to.be.eq(Contracts.VotingEscrow.target);
          expect(await Contracts.Voter.gaugeFactories()).to.be.deep.eq([
            Contracts.GaugeFactory1.target,
            Contracts.GaugeFactory2.target,
            Contracts.GaugeFactory3.target,
          ]);
          expect(await Contracts.Voter.factories()).to.be.deep.eq([
            Contracts.PairFactory.target,
            Contracts.AlgebraFactory.target,
            Contracts.AlgebraFactory.target,
          ]);
        });

        it('GaugeFactory dependencies', async () => {
          expect(await Contracts.GaugeFactory1.voter()).to.be.eq(Contracts.Voter.target);
          expect(await Contracts.GaugeFactory2.voter()).to.be.eq(Contracts.Voter.target);
          expect(await Contracts.GaugeFactory3.voter()).to.be.eq(Contracts.Voter.target);

          expect(await Contracts.GaugeFactory1.merklGaugeMiddleman()).to.be.eq(ZERO_ADDRESS);
          expect(await Contracts.GaugeFactory2.merklGaugeMiddleman()).to.be.eq(Contracts.MerklGaugeMiddleman.target);
          expect(await Contracts.GaugeFactory3.merklGaugeMiddleman()).to.be.eq(Contracts.MerklGaugeMiddleman.target);
        });

        it('BribeFactory dependencies', async () => {
          expect(await Contracts.BribeFactory.voter()).to.be.eq(Contracts.Voter.target);
        });

        it('FeesVaultFactory dependencies', async () => {
          expect(await Contracts.FeesVaultFactory.voter()).to.be.eq(Contracts.Voter.target);
        });

        it('VeFNXDsitributor dependencies', async () => {
          expect(await Contracts.VeFNXDsitributor.votingEscrow()).to.be.eq(Contracts.VotingEscrow.target);
          expect(await Contracts.VeFNXDsitributor.fenix()).to.be.eq(Tokens.fenix.target);
        });

        it('RFenix dependencies', async () => {
          expect(await Contracts.RFenix.votingEscrow()).to.be.eq(Contracts.VotingEscrow.target);
        });

        it('Fenix  dependencies', async () => {
          expect(await Tokens.fenix.owner()).to.be.eq(Contracts.Minter.target);
        });

        it('Minter dependencies', async () => {
          expect(await Contracts.Minter.voter()).to.be.eq(Contracts.Voter.target);
          expect(await Contracts.Minter.fenix()).to.be.eq(Tokens.fenix.target);
          expect(await Contracts.Minter.ve()).to.be.eq(Contracts.VotingEscrow.target);
        });

        it('RouterV2 dependencies', async () => {
          expect(await Contracts.RouterV2.factory()).to.be.eq(Contracts.PairFactory.target);
          expect(await Contracts.RouterV2.wETH()).to.be.eq(Tokens.weth.target);
        });

        it('PairFactory dependencies', async () => {
          expect(await Contracts.PairFactory.communityVaultFactory()).to.be.eq(Contracts.FeesVaultFactory.target);
        });

        it('MerklGaugeMiddleman dependencies', async () => {
          expect(await Contracts.MerklGaugeMiddleman.token()).to.be.eq(Tokens.fenix.target);
          expect((await Contracts.MerklGaugeMiddleman.merklDistributionCreator()).toLocaleLowerCase()).to.be.eq(
            addresses.merkleDistributionCreator.toLocaleLowerCase(),
          );
        });
      });

      describe('check setuped blast points and blast points operator address', async () => {
        it('FeesVaultFactory', async () => {
          expect(await Contracts.FeesVaultFactory.defaultBlastPoints()).to.be.eq(Contracts.BlastPoints.target);
          expect(await Contracts.FeesVaultFactory.defaultBlastPointsOperator()).to.be.eq(addresses.blastPointsOperator);
        });
        it('PairFactory', async () => {
          expect(await Contracts.PairFactory.defaultBlastPoints()).to.be.eq(Contracts.BlastPoints.target);
          expect(await Contracts.PairFactory.defaultBlastPointsOperator()).to.be.eq(addresses.blastPointsOperator);
        });
      });

      describe('check setuped blast governor', async () => {
        const contractsToCheck = [
          'VotingEscrow',
          'Voter',
          'GaugeFactory1',
          'GaugeFactory2',
          'GaugeFactory3',
          'PairFactory',
          'FeesVaultFactory',
          'BribeFactory',
          'Minter',
          'VeFNXDsitributor',
          'RFenix',
          'MerklGaugeMiddleman',
        ];

        for (const contractName of contractsToCheck) {
          it(`Governor address for ${contractName} should be correct`, async () => {
            const targetAddress = addresses[contractName];
            expect(await Contracts.Blast.governorMap(targetAddress)).to.be.eq(addresses.blastGovernor);
          });
        }

        it(`Governor address for Fenix should be correct`, async () => {
          expect(await Contracts.Blast.governorMap(addresses.fenix)).to.be.eq(addresses.blastGovernor);
        });
      });
      describe('check setuped blast gas mode', async () => {
        const contractsToCheck = [
          'VotingEscrow',
          'Voter',
          'GaugeFactory1',
          'GaugeFactory2',
          'GaugeFactory3',
          'PairFactory',
          'FeesVaultFactory',
          'BribeFactory',
          'Minter',
          'VeFNXDsitributor',
          'RFenix',
          'MerklGaugeMiddleman',
        ];

        for (const contractName of contractsToCheck) {
          it(`Gas mode for ${contractName} should be Claimable`, async () => {
            const targetAddress = addresses[contractName];
            const gasParams = await Contracts.Blast.readGasParams(targetAddress);
            expect(gasParams[3]).to.be.eq(1);
          });
        }

        it(`Governor address for Fenix should be correct`, async () => {
          const gasParams = await Contracts.Blast.readGasParams(addresses.fenix);
          expect(gasParams[3]).to.be.eq(1);
        });
      });

      describe('check access control to all restricted contracts methods', async () => {
        describe('MinterUpgradeable authorization checks', function () {
          it('should revert start() when called by non-owner', async () => {
            await expect(Contracts.Minter.connect(Signers.user1).start()).to.be.revertedWith('Ownable: caller is not the owner');
          });

          it('should revert setVoter() when called by non-owner', async () => {
            await expect(Contracts.Minter.connect(Signers.user1).setVoter(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('should revert setTeamRate() when called by non-owner', async () => {
            await expect(Contracts.Minter.connect(Signers.user1).setTeamRate(100)).to.be.revertedWith('Ownable: caller is not the owner');
          });

          it('should revert setDecayRate() when called by non-owner', async () => {
            await expect(Contracts.Minter.connect(Signers.user1).setDecayRate(100)).to.be.revertedWith('Ownable: caller is not the owner');
          });

          it('should revert setInflationRate() when called by non-owner', async () => {
            await expect(Contracts.Minter.connect(Signers.user1).setInflationRate(100)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });

        describe('Fenix', async () => {
          it('should revert mint() when called by non-owner', async () => {
            await expect(Tokens.fenix.connect(Signers.user1).mint(Signers.user1.address, 1)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
          it('should revert mint() when called by non-owner', async () => {
            await expect(Tokens.fenix.connect(Signers.user1).transferOwnership(Signers.user1.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });
        describe('BribeFactoryUpgradeable authorization checks', function () {
          it('createBribe should be called only by voter or owner', async () => {
            await expect(Contracts.BribeFactory.connect(Signers.user1).createBribe(ZERO_ADDRESS, ZERO_ADDRESS, '')).to.be.revertedWith(
              'only voter or voter',
            );
          });

          it('changeImplementation should revert if called by non-owner', async () => {
            await expect(Contracts.BribeFactory.connect(Signers.user1).changeImplementation(ZERO_ADDRESS)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('setVoter should revert if called by non-owner', async () => {
            await expect(Contracts.BribeFactory.connect(Signers.user1).setVoter(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('setDefaultBlastGovernor should revert if called by non-owner', async () => {
            await expect(Contracts.BribeFactory.connect(Signers.user1).setDefaultBlastGovernor(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('addRewards (single token) should revert if called by non-owner', async () => {
            await expect(
              Contracts.BribeFactory.connect(Signers.user1)['addRewards(address,address[])'](ZERO_ADDRESS, []),
            ).to.be.revertedWith('Ownable: caller is not the owner');
          });

          it('addRewards (multiple tokens) should be called only by voter or owner', async () => {
            await expect(Contracts.BribeFactory.connect(Signers.user1)['addRewards(address[][],address[])']([], [])).to.be.revertedWith(
              'only voter or owner',
            );
          });

          it('pushDefaultRewardToken should revert if called by non-owner', async () => {
            await expect(Contracts.BribeFactory.connect(Signers.user1).pushDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('removeDefaultRewardToken should revert if called by non-owner', async () => {
            await expect(Contracts.BribeFactory.connect(Signers.user1).removeDefaultRewardToken(ZERO_ADDRESS)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });
        describe('GaugeFactoryUpgradeable authorization checks', function () {
          it('createGauge should be called only by voter or owner', async () => {
            await expect(
              Contracts.GaugeFactory1.connect(Signers.user1).createGauge(
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                false,
                ZERO_ADDRESS,
              ),
            ).to.be.revertedWith('only voter or owner');
          });

          it('setDefaultBlastGovernor should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory1.connect(Signers.user1).setDefaultBlastGovernor(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('changeImplementation should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory1.connect(Signers.user1).changeImplementation(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('setMerklGaugeMiddleman should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory1.connect(Signers.user1).setMerklGaugeMiddleman(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });
        describe('GaugeFactoryUpgradeable2 authorization checks', function () {
          it('createGauge should be called only by voter or owner', async () => {
            await expect(
              Contracts.GaugeFactory2.connect(Signers.user1).createGauge(
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                false,
                ZERO_ADDRESS,
              ),
            ).to.be.revertedWith('only voter or owner');
          });

          it('setDefaultBlastGovernor should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory2.connect(Signers.user1).setDefaultBlastGovernor(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('changeImplementation should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory2.connect(Signers.user1).changeImplementation(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('setMerklGaugeMiddleman should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory2.connect(Signers.user1).setMerklGaugeMiddleman(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });
        describe('GaugeFactoryUpgradeable3 authorization checks', function () {
          it('createGauge should be called only by voter or owner', async () => {
            await expect(
              Contracts.GaugeFactory3.connect(Signers.user1).createGauge(
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                ZERO_ADDRESS,
                false,
                ZERO_ADDRESS,
              ),
            ).to.be.revertedWith('only voter or owner');
          });

          it('setDefaultBlastGovernor should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory3.connect(Signers.user1).setDefaultBlastGovernor(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('changeImplementation should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory3.connect(Signers.user1).changeImplementation(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('setMerklGaugeMiddleman should revert if called by non-owner', async () => {
            await expect(Contracts.GaugeFactory3.connect(Signers.user1).setMerklGaugeMiddleman(Signers.user2.address)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });

        describe('FeesVaultFactoryUpgradeable authorization checks', function () {
          it('changeImplementation should revert if called by non-admin', async () => {
            await expect(Contracts.FeesVaultFactory.connect(Signers.user1).changeImplementation(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), Signers.user1.address),
            );
          });

          it('setDefaultBlastGovernor should revert if called by non-admin', async () => {
            await expect(
              Contracts.FeesVaultFactory.connect(Signers.user1).setDefaultBlastGovernor(Signers.user2.address),
            ).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });
          it('setDefaultBlastPointsOperator should revert if called by non-admin', async () => {
            await expect(
              Contracts.FeesVaultFactory.connect(Signers.user1).setDefaultBlastPointsOperator(Signers.user2.address),
            ).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });
          it('setDefaultBlastPoints should revert if called by non-admin', async () => {
            await expect(Contracts.FeesVaultFactory.connect(Signers.user1).setDefaultBlastPoints(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });
          it('setConfigurationForRebaseToken should revert if called by non-admin', async () => {
            await expect(
              Contracts.FeesVaultFactory.connect(Signers.user1).setConfigurationForRebaseToken(Signers.user2.address, true, 1),
            ).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });
          it('setVoter should revert if called by non-admin', async () => {
            await expect(Contracts.FeesVaultFactory.connect(Signers.user1).setVoter(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.DEFAULT_ADMIN_ROLE(), Signers.user1.address),
            );
          });

          it('setDefaultDistributionConfig should revert if called by non-FEES_VAULT_ADMINISTRATOR_ROLE', async () => {
            await expect(
              Contracts.FeesVaultFactory.connect(Signers.user1).setDefaultDistributionConfig({ toGaugeRate: 0, recipients: [], rates: [] }),
            ).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });

          it('setCustomDistributionConfig should revert if called by non-FEES_VAULT_ADMINISTRATOR_ROLE', async () => {
            await expect(
              Contracts.FeesVaultFactory.connect(Signers.user1).setCustomDistributionConfig(Signers.user2.address, {
                toGaugeRate: 0,
                recipients: [],
                rates: [],
              }),
            ).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.FEES_VAULT_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });

          it('createVaultForPool should revert if called by non-WHITELISTED_CREATOR_ROLE', async () => {
            await expect(Contracts.FeesVaultFactory.connect(Signers.user1).createVaultForPool(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.WHITELISTED_CREATOR_ROLE(), Signers.user1.address),
            );
          });

          it('afterPoolInitialize should revert if called by non-WHITELISTED_CREATOR_ROLE', async () => {
            await expect(Contracts.FeesVaultFactory.connect(Signers.user1).afterPoolInitialize(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.FeesVaultFactory.WHITELISTED_CREATOR_ROLE(), Signers.user1.address),
            );
          });
        });

        describe('MerklGaugeMiddleman authorization checks', function () {
          it('setGauge should revert if called by non-owner', async () => {
            await expect(
              Contracts.MerklGaugeMiddleman.connect(Signers.user1).setGauge(Signers.user1.address, {
                uniV3Pool: ZERO_ADDRESS,
                rewardToken: ZERO_ADDRESS,
                positionWrappers: [],
                wrapperTypes: [0, 1, 2],
                amount: ethers.parseEther('1'),
                propToken0: 4000,
                propToken1: 2000,
                propFees: 4000,
                isOutOfRangeIncentivized: 0,
                epochStart: 1,
                numEpoch: 1,
                boostedReward: 0,
                boostingAddress: ZERO_ADDRESS,
                rewardId: ethers.id('TEST') as string,
                additionalData: ethers.id('test2ng') as string,
              }),
            ).to.be.revertedWith('Ownable: caller is not the owner');
          });
        });

        describe('RFenix authorization checks', function () {
          it('recoverToken should revert if called by non-owner', async () => {
            const amount = ethers.parseUnits('1', 18);
            await expect(Contracts.RFenix.connect(Signers.user1).recoverToken(amount)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });

          it('mint should revert if called by non-owner', async () => {
            const amount = ethers.parseUnits('1000', 18);
            await expect(Contracts.RFenix.connect(Signers.user1).mint(Signers.user2.address, amount)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });
        describe('VeFnxDistributorUpgradeable authorization checks', function () {
          it('distributeVeFnx should revert if called by non-owner', async () => {
            const recipients = [Signers.user1.address, Signers.user2.address];
            const amounts = [ethers.parseEther('10'), ethers.parseEther('20')];

            await expect(Contracts.VeFNXDsitributor.connect(Signers.user1).distributeVeFnx(recipients, amounts)).to.be.revertedWith(
              'Ownable: caller is not the owner',
            );
          });
        });
        describe('PairFactoryUpgradeable authorization checks', function () {
          it('setPause should revert if called by non-PAIRS_ADMINISTRATOR_ROLE', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setPause(true)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });

          it('setCommunityVaultFactory should revert if called by non-PAIRS_ADMINISTRATOR_ROLE', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setCommunityVaultFactory(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });

          it('setIsPublicPoolCreationMode should revert if called by non-PAIRS_ADMINISTRATOR_ROLE', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setIsPublicPoolCreationMode(true)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });

          it('setProtocolFee should revert if called by non-FEES_MANAGER_ROLE', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setProtocolFee(500)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.FEES_MANAGER_ROLE(), Signers.user1.address),
            );
          });

          it('setCustomProtocolFee should revert if called by non-FEES_MANAGER_ROLE', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setCustomProtocolFee(Signers.user2.address, 500)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.FEES_MANAGER_ROLE(), Signers.user1.address),
            );
          });

          it('setCustomFee should revert if called by non-FEES_MANAGER_ROLE', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setCustomFee(Signers.user2.address, 500)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.FEES_MANAGER_ROLE(), Signers.user1.address),
            );
          });

          it('setFee should revert if called by non-FEES_MANAGER_ROLE', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setFee(true, 500)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.FEES_MANAGER_ROLE(), Signers.user1.address),
            );
          });

          it('createPair should revert if called by non-PAIRS_CREATOR_ROLE when pool creation is not public', async () => {
            // Assuming isPublicPoolCreationMode is false
            await expect(
              Contracts.PairFactory.connect(Signers.user1).createPair(Signers.user2.address, Signers.user2.address, true),
            ).to.be.revertedWith(getAccessControlError(await Contracts.PairFactory.PAIRS_CREATOR_ROLE(), Signers.user1.address));
          });

          it('setConfigurationForRebaseToken should revert if called by non-admin', async () => {
            await expect(
              Contracts.PairFactory.connect(Signers.user1).setConfigurationForRebaseToken(Signers.user2.address, true, 1),
            ).to.be.revertedWith(getAccessControlError(await Contracts.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), Signers.user1.address));
          });

          it('setDefaultBlastGovernor should revert if called by non-admin', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setDefaultBlastGovernor(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });

          it('setDefaultBlastPointsOperator should revert if called by non-admin', async () => {
            await expect(
              Contracts.PairFactory.connect(Signers.user1).setDefaultBlastPointsOperator(Signers.user2.address),
            ).to.be.revertedWith(getAccessControlError(await Contracts.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), Signers.user1.address));
          });

          it('setDefaultBlastPoints should revert if called by non-admin', async () => {
            await expect(Contracts.PairFactory.connect(Signers.user1).setDefaultBlastPoints(Signers.user2.address)).to.be.revertedWith(
              getAccessControlError(await Contracts.PairFactory.PAIRS_ADMINISTRATOR_ROLE(), Signers.user1.address),
            );
          });
        });
      });
    });

    describe('deploy weth/usdb pool and check correct using', async () => {
      let expectedAddress: string;
      let pool: AlgebraPool;

      before(async () => {
        expectedAddress = await Contracts.AlgebraFactory.connect(Signers.deployer as any).createPool.staticCall(
          Tokens.usdb.target,
          Tokens.weth.target,
        );
      });

      it('should success create', async () => {
        expect(await Contracts.AlgebraFactory.poolByPair(Tokens.usdb.target, Tokens.weth.target)).to.be.eq(ZERO_ADDRESS);
        expect(await Contracts.FeesVaultFactory.getVaultForPool(expectedAddress)).to.be.eq(ZERO_ADDRESS);

        await Contracts.AlgebraFactory.connect(Signers.deployer as any).createPool(Tokens.usdb.target, Tokens.weth.target);
      });

      it('should success initialize pool', async () => {
        pool = (await ethers.getContractAtFromArtifact(AlgebraPool_artifact, expectedAddress)) as any;

        if ((await pool.token0()).toLocaleLowerCase() == (await Tokens.weth.getAddress()).toLocaleLowerCase()) {
          await pool.initialize(encodePriceSqrt(ethers.parseEther('1'), ethers.parseEther('3371')));
        } else {
          await pool.initialize(encodePriceSqrt(ethers.parseEther('3371'), ethers.parseEther('1')));
        }
      });

      it('should success create feesVault', async () => {
        expect(await Contracts.FeesVaultFactory.getVaultForPool(expectedAddress)).to.be.not.eq(ZERO_ADDRESS);
      });

      it('should success setup blast governor for AlgebraPool', async () => {
        expect(await Contracts.Blast.governorMap(expectedAddress)).to.be.eq(addresses.blastGovernor);
      });

      it('should success setup blast governor for FeesVault', async () => {
        expect(await Contracts.Blast.governorMap(await Contracts.FeesVaultFactory.getVaultForPool(expectedAddress))).to.be.eq(
          addresses.blastGovernor,
        );
      });

      it('should success setup rebase mode WETH and USDB tokens for AlgebraPool', async () => {
        expect(await Tokens.weth.getConfiguration(expectedAddress)).to.be.eq(2);
        expect(await Tokens.usdb.getConfiguration(expectedAddress)).to.be.eq(2);
      });

      it('should success setup rebase mode WETH and USDB tokens for FeesVault', async () => {
        let feesVault = await Contracts.FeesVaultFactory.getVaultForPool(expectedAddress);
        expect(await Tokens.weth.getConfiguration(feesVault)).to.be.eq(2);
        expect(await Tokens.usdb.getConfiguration(feesVault)).to.be.eq(2);
      });

      it('check fee configuration in pool (DYNAMIC FEE)', async () => {
        expect(await pool.fee()).to.be.eq(100); // 0.01%
      });

      it('add liquidity in pool', async () => {});
    });
  } else {
    it('Skip if not mainnet blast fork', async () => {});
  }
});

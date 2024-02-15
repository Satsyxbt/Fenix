import { EmissionManagerUpgradeable, Fenix, ProxyAdmin } from '../typechain-types/index';
import { Signer } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import completeFixture from './utils/fixture';

describe('EmissionManagerUpgradeable Contract', function () {
  let wallets: {
    deployer: Signer;
    otherUser: Signer;
    others: Signer[];
  };
  let proxyAdmin: ProxyAdmin;
  let fenix: Fenix;
  let emissionManagerProxy: EmissionManagerUpgradeable;
  let emissionManagerImplementation: EmissionManagerUpgradeable;

  beforeEach(async function () {
    ({ wallets, proxyAdmin, fenix, emissionManagerProxy, emissionManagerImplementation } = await loadFixture(completeFixture));
  });

  describe('Deployment', function () {
    it('Should set the right initial parameters', async function () {});
    it('Should block initialize on implementation', async function () {});
  });

  describe('Initialize', function () {
    it('Should be called only from deployer', async function () {});
    it('Should correct setup parameters', async function () {});
    it('Should correct update parameters from reference contracts', async function () {});
  });

  describe('Update parameters', function () {
    describe('team', async function () {
      it('`setTeam` - Should be called to set `pending team` only from `team`', async function () {});
      it('`setTeam` - Should correct set `pendingTeam`', async function () {});
      it('`acceptTeam` - Should be called to accept only from pending `team`', async function () {});
      it('Should correct update team address', async function () {});
      it('Should have affect on future emission distribtuions`', async function () {});
    });
    describe('voter', async function () {
      it('`setVoter` - Should be called to set `voter` only from `team`', async function () {});
      it('Should correct set new voter`', async function () {});
      it('Should have affect on future emission distribtuions`', async function () {});
    });
    describe('setTeamRate', async function () {
      it('Should be called only from `team`', async function () {});
      it('Should correct set new team fee`', async function () {});
      it('Should have affect on future emission distribtuions`', async function () {});
    });
    describe('setEmission', async function () {
      it('Should be called only from `team`', async function () {});
      it('Should correct set new team fee`', async function () {});
      it('Should have affect on future emission distribtuions`', async function () {});
    });
    describe('setRebase', async function () {
      it('Should be called only from `team`', async function () {});
      it('Should correct set new team fee`', async function () {});
      it('Should have affect on future emission distribtuions`', async function () {});
    });
  });

  describe('Main functionality `updatePeriod`', async function () {
    it('Can be called by anyone', async function () {});
    it('Should mint new emission only once per week', async function () {});
    it('Should user available balance from contract first before minting', async function () {});
    it('Should emit event when new emission has minted`', async function () {});

    describe('Should correct distribution of tokens among all recipients', async function () {
      it('to team tresuary', async function () {});
      it('to rewards distirbutor', async function () {});
      it('to voter for gauges', async function () {});
    });
  });

  describe('View functions & Calculations', async function () {
    it('Should corectly calculate - `period`', async function () {});
    it('Should corectly calculate - `weeklyEmmision`', async function () {});
    it('Should corectly calculate - `calculateEmission`', async function () {});
    it('Should corectly calculate - `circulatingSupply`', async function () {});
    it('Should corectly calculate - `calculateReabase`', async function () {});
    it('Should corectly calculate - `circulatingEmission`', async function () {});
    it('Should corectly calculate - `circulatingEmission`', async function () {});
  });

  describe('Simulation & check general flow & external dependency', async function () {});
});

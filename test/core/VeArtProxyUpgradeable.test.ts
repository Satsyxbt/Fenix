import { ethers } from 'hardhat';
import { VeArtProxy } from '../../typechain-types/contracts/core/VeArtProxyUpgradeable.sol';
import { ART_RPOXY_PARTS } from '../../utils/ArtProxy';
import { expect } from 'chai';

describe('VeArtProxyUpgradeable Contract', function () {
  let veArtProxy: VeArtProxy;

  before(async function () {
    let artStatic = await ethers.deployContract('VeArtProxyStatic', [
      ART_RPOXY_PARTS.lockedIcon,
      ART_RPOXY_PARTS.unlockedIcon,
      ART_RPOXY_PARTS.transferablePart,
      ART_RPOXY_PARTS.notTransferablePart,
    ]);

    await artStatic.setStartPart(ART_RPOXY_PARTS.startPart);
    await artStatic.setEndPart(ART_RPOXY_PARTS.endPart);

    veArtProxy = await ethers.deployContract('VeArtProxy', [artStatic.target, ethers.ZeroAddress, ethers.ZeroAddress]);
  });

  describe('#toDateString', async () => {
    it('Should corect return DateString for first year', async () => {
      expect(await veArtProxy.toDateString(30131594)).to.be.equal('15 Dec, 1970');
      expect(await veArtProxy.toDateString(10432394)).to.be.equal('1 May, 1970');
      expect(await veArtProxy.toDateString(0)).to.be.equal('1 Jan, 1970');
    });
    it('Should corect return DateString for our time', async () => {
      expect(await veArtProxy.toDateString(1708024785)).to.be.equal('15 Feb, 2024');
      expect(await veArtProxy.toDateString(1715797185)).to.be.equal('15 May, 2024');
      expect(await veArtProxy.toDateString(1735682399)).to.be.equal('31 Dec, 2024');
    });
  });
});

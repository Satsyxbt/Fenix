import { artifacts, ethers } from 'hardhat';
import { VeArtProxy } from '../../typechain-types/contracts/core/VeArtProxyUpgradeable.sol';
import { ART_RPOXY_PARTS } from '../../utils/ArtProxy';
import { expect } from 'chai';
import { VeArtProxyStatic } from '../../typechain-types';

describe('VeArtProxyUpgradeable Contract', function () {
  let artStatic: VeArtProxyStatic;

  before(async function () {
    artStatic = await ethers.deployContract('VeArtProxyStatic', [
      ART_RPOXY_PARTS.lockedIcon,
      ART_RPOXY_PARTS.unlockedIcon,
      ART_RPOXY_PARTS.transferablePart,
      ART_RPOXY_PARTS.notTransferablePart,
    ]);
  });

  it('suceess init params', async () => {
    expect(await artStatic.lockedIcon()).to.be.equal(ART_RPOXY_PARTS.lockedIcon);
    expect(await artStatic.unlockedIcon()).to.be.equal(ART_RPOXY_PARTS.unlockedIcon);
    expect(await artStatic.transferablePart()).to.be.equal(ART_RPOXY_PARTS.transferablePart);
    expect(await artStatic.notTransferablePart()).to.be.equal(ART_RPOXY_PARTS.notTransferablePart);
  });

  it('success returns correct icon by getLockIcon', async () => {
    expect(await artStatic.getLockIcon(true)).to.be.equal(ART_RPOXY_PARTS.lockedIcon);
    expect(await artStatic.getLockIcon(false)).to.be.equal(ART_RPOXY_PARTS.unlockedIcon);
  });

  it('success returns correct transferable part by getIsTransferablePart', async () => {
    expect(await artStatic.getIsTransferablePart(true)).to.be.equal(ART_RPOXY_PARTS.transferablePart);
    expect(await artStatic.getIsTransferablePart(false)).to.be.equal(ART_RPOXY_PARTS.notTransferablePart);
  });

  it('success call setStartPart and setup', async () => {
    await artStatic.setStartPart(ART_RPOXY_PARTS.startPart);
    expect(await artStatic.startPart()).to.be.equal(ART_RPOXY_PARTS.startPart);
  });

  it('success call setEndPart and setup', async () => {
    await artStatic.setEndPart(ART_RPOXY_PARTS.endPart);
    expect(await artStatic.endPart()).to.be.equal(ART_RPOXY_PARTS.endPart);
  });

  it('fail if call setStartPart secod time', async () => {
    expect(await artStatic.setupStart()).to.be.true;
    await expect(artStatic.setStartPart(ART_RPOXY_PARTS.startPart)).to.be.revertedWith('Already setup');
  });

  it('fail if call setEndPart secod time', async () => {
    expect(await artStatic.setupEnd()).to.be.true;
    await expect(artStatic.setEndPart(ART_RPOXY_PARTS.endPart)).to.be.revertedWith('Already setup');
  });
});

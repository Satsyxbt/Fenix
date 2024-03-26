import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { VeArtProxyUpgradeable } from '../../typechain-types';
import { buildFullBase64Art, buildJson, buildSvgImage, getSvg512, svgImageToBase64 } from '../utils/art';
import completeFixture from '../utils/coreFixture';

describe('VeArtProxyUpgradeable Contract', function () {
  let veArtProxy: VeArtProxyUpgradeable;
  let veArtProxyImplementation: VeArtProxyUpgradeable;

  before(async function () {
    const result = await loadFixture(completeFixture);
    veArtProxy = result.veArtProxy;
    veArtProxyImplementation = result.veArtProxyImplementation;
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
  describe('#generateSVG', async () => {
    it('Should corect generate SVG', async () => {
      expect(await veArtProxy.generateSVG(3984, ethers.parseEther('1398876.32'), 1731639905)).to.be.equal(getSvg512());
      expect(await veArtProxy.generateSVG(3984, ethers.parseEther('1398876.32'), 1731639905)).to.be.equal(
        buildSvgImage('3984', '1,398,876.32', '15 Nov, 2024'),
      );
      expect(await veArtProxy.generateSVG(0, ethers.parseEther('0'), 1531639905)).to.be.equal(buildSvgImage('0', '0.0', '15 Jul, 2018'));
    });
    it('Test boundary case', async () => {
      expect(await veArtProxy.generateSVG(0, ethers.parseEther('0'), 0)).to.be.equal(buildSvgImage('0', '0.0', '1 Jan, 1970'));
      expect(
        await veArtProxy.generateSVG(
          ethers.parseEther('12345678.000000000000000001'),
          ethers.parseEther('12345678.000000000000000001'),
          2114373599,
        ),
      ).to.be.equal(buildSvgImage('12345678000000000000000001', '12,345,678.000000000000000001', '31 Dec, 2036'));
      expect(await veArtProxy.generateSVG(ethers.parseEther('1.1'), ethers.parseEther('1.1'), 2114373599)).to.be.equal(
        buildSvgImage('1100000000000000000', '1.1', '31 Dec, 2036'),
      );
    });
  });

  describe('tokenURI', async function () {
    it('Should return the correct svg for specific case', async () => {
      let result = await veArtProxy.tokenURI(3984, ethers.parseEther('1398876.32'), 1731639905, 0);
      expect(JSON.parse(atob(result.replace('data:application/json;base64,', ''))).image).to.be.equal(svgImageToBase64(getSvg512()));
    });
    describe('#case: ', async function () {
      let jsonBase64: string;
      let artBase64: string;

      before(async function () {
        artBase64 = await veArtProxy.tokenURI(1234, ethers.parseEther('1058.431007000001'), 1708025555, 0);
        jsonBase64 = buildFullBase64Art('1234', '1,058.431007000001', '15 Feb, 2024');
      });

      it('Should be the same', async function () {
        expect(jsonBase64).to.be.equal(artBase64);
      });
      it('Should return corect json after decode', async () => {
        expect(atob(artBase64.replace('data:application/json;base64,', ''))).to.be.equal(
          atob(jsonBase64.replace('data:application/json;base64,', '')),
        );
        expect(atob(artBase64.replace('data:application/json;base64,', ''))).to.be.equal(
          buildJson('1234', svgImageToBase64(buildSvgImage('1234', '1,058.431007000001', '15 Feb, 2024'))),
        );
        expect(atob(jsonBase64.replace('data:application/json;base64,', ''))).to.be.equal(
          buildJson('1234', svgImageToBase64(buildSvgImage('1234', '1,058.431007000001', '15 Feb, 2024'))),
        );
      });
      it('Should return corect svg string after decode', async () => {
        let svgBase64 = JSON.parse(atob(artBase64.replace('data:application/json;base64,', ''))).image;
        let jsSvgBase64 = JSON.parse(atob(jsonBase64.replace('data:application/json;base64,', ''))).image;
        expect(svgBase64).to.be.equal(jsSvgBase64);
      });
    });
  });
});

import { VeArtProxyUpgradeable, ProxyAdmin, VeArtProxyUpgradeable__factory } from '../../typechain-types/index';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { ONE_ETHER } from './utils/constants';
import completeFixture from './utils/fixture';

describe('VeArtProxyUpgradeable Contract', function () {
  function jsTokenUri(tokenId: any, balanceOf: any, lockedEnd: any, value: any) {
    let imgBase64 = btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.base { fill: white; font-family: serif; font-size: 14px; }</style><rect width="100%" height="100%" fill="black" /><text x="10" y="20" class="base">` +
        `token ${tokenId}</text><text x="10" y="40" class="base">` +
        `balanceOf ${balanceOf}</text><text x="10" y="60" class="base">` +
        `locked_end ${lockedEnd}</text><text x="10" y="80" class="base">` +
        `value ${value}</text></svg>`,
    );
    return (
      'data:application/json;base64,' +
      btoa(
        `{"name": "lock #${tokenId}", "description": "Fenix locks, can be used to boost gauge yields, vote on token emission, and receive bribes", "image": "data:image/svg+xml;base64,${imgBase64}"}`,
      )
    );
  }

  let proxyAdmin: ProxyAdmin;
  let veArtProxy: VeArtProxyUpgradeable;
  let veArtProxyImplementation: VeArtProxyUpgradeable;

  beforeEach(async function () {
    let result = await loadFixture(completeFixture);
    proxyAdmin = result.proxyAdmin;
    veArtProxy = result.veArtProxy;
    veArtProxyImplementation = result.veArtProxyImplementation;
  });

  describe('Deployment', function () {
    it('Should corectly deploying', async function () {
      let factory = (await ethers.getContractFactory('VeArtProxyUpgradeable')) as VeArtProxyUpgradeable__factory;
      let deployed = await factory.deploy();
      await deployed.waitForDeployment();
    });
  });

  describe('tokenURI', async function () {
    it('Should return the correct base64 for specific case', async () => {
      let imgBase64 = btoa(
        `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.base { fill: white; font-family: serif; font-size: 14px; }</style><rect width="100%" height="100%" fill="black" /><text x="10" y="20" class="base">` +
          `token ${ethers.MaxUint256}</text><text x="10" y="40" class="base">` +
          `balanceOf ${ONE_ETHER}</text><text x="10" y="60" class="base">` +
          `locked_end ${12345678}</text><text x="10" y="80" class="base">` +
          `value ${ethers.MaxInt256}</text></svg>`,
      );
      let exp =
        'data:application/json;base64,' +
        btoa(
          `{"name": "lock #${ethers.MaxUint256}", "description": "Fenix locks, can be used to boost gauge yields, vote on token emission, and receive bribes", "image": "data:image/svg+xml;base64,${imgBase64}"}`,
        );
      expect(await veArtProxy.tokenURI(ethers.MaxUint256, ONE_ETHER, 12345678, ethers.MaxInt256)).to.be.equal(exp);
    });

    let testCases = [
      [0, 0, 0, 0],
      [1, 2, 4, 5],
      [ONE_ETHER, ethers.MaxInt256, ONE_ETHER, 1],
      [ethers.MaxUint256, ethers.MaxUint256, ethers.MaxUint256, ethers.MaxUint256],
    ];

    testCases.forEach(async function (testCase) {
      describe('#case: ' + testCase, async function () {
        let jsonBase64: string;
        let jsonRes: any;

        before(async function () {
          let result = await veArtProxy.tokenURI(testCase[0], testCase[1], testCase[2], testCase[3]);
          jsonBase64 = result.replace('data:application/json;base64,', '');
          jsonRes = JSON.parse(atob(jsonBase64));
        });

        it('Should have correct set tokenId', async function () {
          expect(jsonRes.name).to.be.equal(`lock #${testCase[0]}`);
        });

        it('Should return corectly string after decode', async function () {
          expect(await veArtProxy.tokenURI(testCase[0], testCase[1], testCase[2], testCase[3])).to.be.equal(
            jsTokenUri(testCase[0], testCase[1], testCase[2], testCase[3]),
          );
        });

        it('Should return correct json after decode', async function () {
          let res = false;
          try {
            JSON.parse(atob(jsonBase64));
            res = true;
          } catch (e) {
            res = false;
          }
          expect(res).to.be.true;
        });
      });
    });
  });
});

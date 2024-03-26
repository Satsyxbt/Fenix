import { expect } from 'chai';
import { ethers } from 'hardhat';
import { NumberFormatterMock } from '../../typechain-types';

function formatIntegerPart(number: bigint) {
  return number.toLocaleString('en-US');
}

describe('NumberFormmater Contract', function () {
  let numberFormmater: NumberFormatterMock;

  before(async () => {
    numberFormmater = await (await ethers.getContractFactory('NumberFormatterMock')).deploy();
  });

  describe('#withThousandSeparators', async () => {
    const TESTS: Array<bigint> = [
      BigInt(0),
      BigInt(1),
      BigInt(99),
      BigInt(100),
      BigInt(101),
      BigInt(999),
      BigInt(1000),
      BigInt(1001),
      BigInt(9999),
      BigInt(10000),
      BigInt(10001),
      ethers.parseEther('1'),
      ethers.parseEther('1.1111111'),
      ethers.MaxInt256,
      ethers.MaxUint256,
    ];

    for (const iterator of TESTS) {
      it(`Should return correct string with thousand separator for: ${iterator}`, async () => {
        expect(await numberFormmater.withThousandSeparators(iterator)).to.be.eq(formatIntegerPart(iterator));
      });
    }
    it('Specific case', async () => {
      expect(await numberFormmater.withThousandSeparators(BigInt('345678998765432100123'))).to.be.eq('345,678,998,765,432,100,123');
      expect(await numberFormmater.withThousandSeparators(BigInt('2345678998765432100123'))).to.be.eq('2,345,678,998,765,432,100,123');
      expect(await numberFormmater.withThousandSeparators(BigInt('12345678998765432100123'))).to.be.eq('12,345,678,998,765,432,100,123');
      expect(await numberFormmater.withThousandSeparators(BigInt('112345678998765432100123'))).to.be.eq('112,345,678,998,765,432,100,123');
    });
  });
  describe('#toStringWithLeadingZeros', async () => {
    it('Decimals 0 should return just one 0', async () => {
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('0'), 0)).to.be.eq('0');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('1'), 0)).to.be.eq('0');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('100'), 0)).to.be.eq('0');
    });
    it('Decimals 1', async () => {
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('1'), 1)).to.be.eq('1');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('0'), 1)).to.be.eq('0');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('10'), 1)).to.be.eq('1');
    });
    it('Decimals 3', async () => {
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('0'), 3)).to.be.eq('0');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('1'), 3)).to.be.eq('001');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('12'), 3)).to.be.eq('012');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('123'), 3)).to.be.eq('123');
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('4123'), 3)).to.be.eq('4123');
    });
    it('Decimals 18', async () => {
      expect(await numberFormmater.toStringWithLeadingZeros(BigInt('1'), 18)).to.be.eq('000000000000000001');
    });
  });

  describe('#formatNumber', async () => {
    describe('Decimals 18, async() =>', async () => {
      const TESTS: Array<any> = [
        [BigInt(0), '0.0'],
        [BigInt(1), '0.000000000000000001'],
        [BigInt(99), '0.000000000000000099'],
        [BigInt(100), '0.0000000000000001'],
        [BigInt(1e6), '0.000000000001'],
        [ethers.parseEther('0.001'), '0.001'],
        [ethers.parseEther('1'), '1.0'],
        [ethers.parseEther('1.1111111'), '1.1111111'],
        [ethers.parseEther('123456789.12345670012'), '123,456,789.12345670012'],
      ];
      for (const iterator of TESTS) {
        it(`Should return correct string: ${iterator}`, async () => {
          expect(await numberFormmater.formatNumber(iterator[0], 18)).to.be.eq(iterator[1]);
        });
      }
    });
    describe('Decimals 6, async() =>', async () => {
      const TESTS: Array<any> = [
        [BigInt(0), '0.0'],
        [BigInt(1), '0.000001'],
        [BigInt(99), '0.000099'],
        [BigInt(100), '0.0001'],
        [BigInt(1e6), '1.0'],
        ['1223456787600400', '1,223,456,787.6004'],
      ];
      for (const iterator of TESTS) {
        it(`Should return correct string: ${iterator}`, async () => {
          expect(await numberFormmater.formatNumber(iterator[0], 6)).to.be.eq(iterator[1]);
        });
      }
    });
    describe('Decimals 0, async() =>', async () => {
      const TESTS: Array<any> = [
        [BigInt(0), '0'],
        [BigInt(1), '1'],
        [BigInt(99), '99'],
        [BigInt(100), '100'],
        [BigInt(1000), '1,000'],
        [BigInt(123456), '123,456'],
        ['12234567876004', '12,234,567,876,004'],
      ];
      for (const iterator of TESTS) {
        it(`Should return correct string: ${iterator}`, async () => {
          expect(await numberFormmater.formatNumber(iterator[0], 0)).to.be.eq(iterator[1]);
        });
      }
    });
  });
});

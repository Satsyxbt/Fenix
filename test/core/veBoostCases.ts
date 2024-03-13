import { ethers } from 'hardhat';

function e(str: string): bigint {
  return ethers.parseEther(str);
}

type TestCase = {
  fnxBoostPercentage: number | bigint;
  depositedFNXAmount: number | bigint;
  fenixBalance?: number | bigint;
  token6Balance?: number | bigint;
  token18Balance?: number | bigint;
  expectUserToken6Balance?: number | bigint;
  expectUserToken18Balance?: number | bigint;
  expectUserFenixBalance?: number | bigint;
  expectVeBoostToken6Balance?: number | bigint;
  expectVeBoostToken18Balance?: number | bigint;
  expectVeBoostFenixBalance?: number | bigint;
  expectUserFenixVotingEscrowBalance?: number | bigint;
  priceReserves?: bigint[];
};

export function eToString(obj: TestCase): string {
  let result = `fnxBoostPercentage: ${obj.fnxBoostPercentage}, depositedFNXAmount: ${obj.depositedFNXAmount}`;
  if (obj.fenixBalance !== undefined) result += `, fenixBalance: ${obj.fenixBalance}`;
  if (obj.token6Balance !== undefined) result += `, token6Balance: ${obj.token6Balance}`;
  if (obj.token18Balance !== undefined) result += `, token18Balance: ${obj.token18Balance}`;
  if (obj.expectUserToken6Balance !== undefined) result += `, expectUserToken6Balance: ${obj.expectUserToken6Balance}`;
  if (obj.expectUserToken18Balance !== undefined) result += `, expectUserToken18Balance: ${obj.expectUserToken18Balance}`;
  if (obj.expectUserFenixBalance !== undefined) result += `, expectUserFenixBalance: ${obj.expectUserFenixBalance}`;
  if (obj.expectVeBoostToken6Balance !== undefined) result += `, expectVeBoostToken6Balance: ${obj.expectVeBoostToken6Balance}`;
  if (obj.expectVeBoostToken18Balance !== undefined) result += `, expectVeBoostToken18Balance: ${obj.expectVeBoostToken18Balance}`;
  if (obj.expectVeBoostFenixBalance !== undefined) result += `, expectVeBoostFenixBalance: ${obj.expectVeBoostFenixBalance}`;
  if (obj.expectUserFenixVotingEscrowBalance !== undefined)
    result += `, expectUserFenixVotingEscrowBalance: ${obj.expectUserFenixVotingEscrowBalance}`;

  return result;
}

export const Cases: TestCase[] = [
  {
    fnxBoostPercentage: 0,
    depositedFNXAmount: 0,
  },
  {
    fnxBoostPercentage: 1,
    depositedFNXAmount: 0,
  },
  {
    fnxBoostPercentage: 0,
    depositedFNXAmount: 1,
  },
  {
    fnxBoostPercentage: 1,
    depositedFNXAmount: 1,
  },
  {
    fnxBoostPercentage: 1,
    depositedFNXAmount: e('9.99'),
  },
  {
    fnxBoostPercentage: 1,
    depositedFNXAmount: e('10.1'),
    fenixBalance: 1,
    expectUserFenixVotingEscrowBalance: 1,
  },
  {
    fnxBoostPercentage: 1000,
    depositedFNXAmount: e('10.1'),
    fenixBalance: 1,
    expectUserFenixVotingEscrowBalance: 1,
  },
  {
    fnxBoostPercentage: 1000,
    depositedFNXAmount: e('10.1'),
    fenixBalance: e('0.49'),
    expectUserFenixVotingEscrowBalance: e('0.49'),
    priceReserves: [BigInt(1e6), e('0.5')],
  },
  {
    fnxBoostPercentage: 1000,
    depositedFNXAmount: e('10.1'),
    priceReserves: [BigInt(1e6), e('2')],
  },
  {
    fnxBoostPercentage: 1000,
    depositedFNXAmount: e('22'),
    fenixBalance: e('0.49'),
    expectUserFenixVotingEscrowBalance: e('0.49'),
    priceReserves: [BigInt(1e6), e('2')],
  },
  {
    fnxBoostPercentage: 1000,
    depositedFNXAmount: e('5.1'),
    fenixBalance: e('0.49'),
    expectUserFenixVotingEscrowBalance: e('0.49'),
    priceReserves: [BigInt(2e6), e('1')],
  },
  {
    fnxBoostPercentage: 1000,
    depositedFNXAmount: e('50'),
    fenixBalance: e('5'),
    expectUserFenixVotingEscrowBalance: e('5'),
  },
  {
    fnxBoostPercentage: 1000,
    depositedFNXAmount: e('50'),
    fenixBalance: e('5.1'),
    expectUserFenixVotingEscrowBalance: e('5'),
    expectVeBoostFenixBalance: e('0.1'),
  },
  {
    fnxBoostPercentage: 2010,
    depositedFNXAmount: e('98'),
    fenixBalance: e('430'),
    expectUserFenixVotingEscrowBalance: e('19.698'),
    expectVeBoostFenixBalance: e('410.302'),
  },
  {
    fnxBoostPercentage: 0,
    depositedFNXAmount: e('2500'),
    fenixBalance: e('10000'),
    expectUserFenixVotingEscrowBalance: e('0'),
    expectVeBoostFenixBalance: e('10000'),
  },
  {
    fnxBoostPercentage: 3500,
    depositedFNXAmount: e('2500'),
    fenixBalance: e('10000'),
    expectUserFenixVotingEscrowBalance: e('875'),
    expectVeBoostFenixBalance: e('9125'),
  },
  {
    fnxBoostPercentage: 0,
    depositedFNXAmount: e('2500'),
    fenixBalance: e('10000'),
    token6Balance: 10000e6,
    expectUserFenixVotingEscrowBalance: e('0'),
    expectVeBoostFenixBalance: e('10000'),
    expectVeBoostToken6Balance: 10000e6,
  },
  {
    fnxBoostPercentage: 0,
    depositedFNXAmount: e('2500'),
    fenixBalance: e('10000'),
    token6Balance: 10000e6,
    expectUserFenixVotingEscrowBalance: e('0'),
    expectVeBoostFenixBalance: e('10000'),
    expectVeBoostToken6Balance: 10000e6,
  },
  {
    fnxBoostPercentage: 125,
    depositedFNXAmount: e('1000'),
    fenixBalance: e('10000'),
    token6Balance: 10000e6,
    expectUserFenixVotingEscrowBalance: e('12.5'),
    expectVeBoostFenixBalance: e('10000') - e('12.5'),
    expectVeBoostToken6Balance: 10000e6 - 12.5e6,
    expectUserToken6Balance: 12.5e6,
  },
  {
    fnxBoostPercentage: 125,
    depositedFNXAmount: e('1000'),
    fenixBalance: 0,
    token6Balance: 10000e6,
    expectUserFenixVotingEscrowBalance: 0,
    expectVeBoostFenixBalance: 0,
    expectVeBoostToken6Balance: 10000e6,
    expectUserToken6Balance: 0,
  },
  {
    fnxBoostPercentage: 125,
    depositedFNXAmount: e('1000'),
    fenixBalance: e('10000'),
    token6Balance: 30000e6,
    expectUserFenixVotingEscrowBalance: e('12.5'),
    expectVeBoostFenixBalance: e('10000') - e('12.5'),
    expectVeBoostToken6Balance: 30000e6 - 12.5e6 * 3,
    expectUserToken6Balance: 12.5e6 * 3,
  },
  {
    fnxBoostPercentage: 125,
    depositedFNXAmount: e('1000'),
    fenixBalance: e('10000'),
    token6Balance: 5000e6,
    expectUserFenixVotingEscrowBalance: e('12.5'),
    expectVeBoostFenixBalance: e('10000') - e('12.5'),
    expectVeBoostToken6Balance: 5000e6 - 12.5e6 / 2,
    expectUserToken6Balance: 12.5e6 / 2,
  },
  {
    fnxBoostPercentage: 10000,
    depositedFNXAmount: e('1000'),
    fenixBalance: e('999'),
    token6Balance: 2500e6,
    expectUserFenixVotingEscrowBalance: e('999'),
    expectVeBoostFenixBalance: 0,
    expectVeBoostToken6Balance: 0,
    expectUserToken6Balance: 2500e6,
  },
  {
    fnxBoostPercentage: 9999,
    depositedFNXAmount: e('10000'),
    fenixBalance: e('10000'),
    token6Balance: 405e6,
    token18Balance: e('119'),
    expectUserFenixVotingEscrowBalance: e('9999'),
    expectVeBoostFenixBalance: e('1'),
    expectVeBoostToken6Balance: 40500,
    expectVeBoostToken18Balance: e('0.0119'),
    expectUserToken6Balance: 404959500,
    expectUserToken18Balance: e('118.9881'),
  },
  {
    priceReserves: [BigInt(0.25e6), e('1')],
    fnxBoostPercentage: 9999,
    depositedFNXAmount: e('10000'),
    fenixBalance: e('10000'),
    token6Balance: 405e6,
    token18Balance: e('119'),
    expectUserFenixVotingEscrowBalance: e('9999'),
    expectVeBoostFenixBalance: e('1'),
    expectVeBoostToken6Balance: 40500,
    expectVeBoostToken18Balance: e('0.0119'),
    expectUserToken6Balance: 404959500,
    expectUserToken18Balance: e('118.9881'),
  },
  {
    priceReserves: [BigInt(1e6), e('0.25')],
    fnxBoostPercentage: 9999,
    depositedFNXAmount: e('10000'),
    fenixBalance: e('10000'),
    token6Balance: 405e6,
    token18Balance: e('119'),
    expectUserFenixVotingEscrowBalance: e('9999'),
    expectVeBoostFenixBalance: e('1'),
    expectVeBoostToken6Balance: 40500,
    expectVeBoostToken18Balance: e('0.0119'),
    expectUserToken6Balance: 404959500,
    expectUserToken18Balance: e('118.9881'),
  },
];

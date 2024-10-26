import 'dotenv/config';
interface ChainConfig {
  algebraTheGraph: string;
}

interface ChainsConfig {
  [key: string]: ChainConfig;
}

const chains: ChainsConfig = {
  ['blast']: {
    algebraTheGraph: process.env.BLAST_ALGEBRA_THE_GRAPH || '',
  },
  ['blastSepolia']: {
    algebraTheGraph: process.env.BLAST_SEPOLIA_ALGEBRA_THE_GRAPH || '',
  },
};

export default {
  'extract-abis-to-docs': {
    output: 'docs/abi',
    minAbiFragmentsToInclude: 2,
    skipPatterns: [
      'mocks',
      'interfaces',
      '@openzeppelin',
      '@cryptoalgebra',
      'libraries',
      'IBaseV1Pair',
      'IBlast',
      'IWETH',
      'Math',
      'erc20',
      'BribeProxy',
      'GaugeProxy',
      'FenixVaultProxy',
      'StrategyProxy',
    ],
  },
  'get-state': {
    output: 'docs/state',
    chains: chains,
    governoMapAdditionalAddress: [
      '0x5aCCAc55f692Ae2F065CEdDF5924C8f6B53cDaa8',
      '0x7a44CD060afC1B6F4c80A2B9b37f4473E74E25Df',
      '0xab8edDD8193eE4A5459f4245eAc980279774a278',
      '0x7733f6239195BEc4851B84A9f1A7fA1B085ec52B',
      '0xA1DA767b77FdfF57A7D8191861d73ac02Bbd5696',
      '0x87F6AF89Ab8F6E11f06cf76b17F2208255247013',
      '0x118A7D61bd36215a01Ab8A29Eb1e5b830c32FA23',
      '0x098cB852107a0b4508664C09917c00dcb0745aa9',
      '0x79F92b0b4ca9aDA848E21Cd1460b12286141cc25',
      '0x94Ca5B835186A37A99776780BF976fAB81D84ED8',
      '0x2df37Cb897fdffc6B4b03d8252d85BE7C6dA9d00',
      '0x67EE08c196a57BDE59f8c37F53637f59b279E1fB',
      '0x01e4DbCf3cB4A16c36F79ff2ac401B0211653395',
      '0xaF38383e3e2E81C829240C6c52893981E9aa38b6',
      '0x8881b3Fb762d1D50e6172f621F107E24299AA1Cd',
      '0x85aD1e30B5d7F698DCe27468a1eD95922dC66f1f',
      '0xE8B7B02C5FC008f92d6f2E194A1efaF8C4D726A8',
      '0x12370808147b2111516250A3b9A2ab66C70845E1',
    ],
  },
};

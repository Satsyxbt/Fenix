import { HardhatUserConfig } from 'hardhat/config';
import { SolcUserConfig } from 'hardhat/types';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-contract-sizer';
import 'dotenv/config';
import 'hardhat-ignore-warnings';
import 'hardhat-tracer';
import 'hardhat-abi-exporter';
import './tasks';

const DEFAULT_COMPILER_SETTINGS: SolcUserConfig = {
  version: '0.8.19',
  settings: {
    evmVersion: 'paris',
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 2000,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
};
const VOTER_LOWEST_SIZE: SolcUserConfig = {
  version: '0.8.19',
  settings: {
    evmVersion: 'paris',
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 200,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
};
const LOW_CONTRACT_SIZE_COMPILER_SETTINGS: SolcUserConfig = {
  version: '0.8.19',
  settings: {
    evmVersion: 'paris',
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 540,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
};
const LOWEST_CONTRACT_SIZE_COMPILER_SETTINGS: SolcUserConfig = {
  version: '0.8.19',
  settings: {
    evmVersion: 'paris',
    viaIR: true,
    optimizer: {
      enabled: true,
      runs: 1,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
};
const config: HardhatUserConfig = {
  sourcify: {
    enabled: false,
  },
  etherscan: {
    apiKey: {
      blast: `${process.env.API_KEY}`,
      blastSepolia: `${process.env.API_KEY}`,
    },
    customChains: [
      {
        network: 'blastSepolia',
        chainId: 168587773,
        urls: {
          apiURL: 'https://api-sepolia.blastscan.io/api',
          browserURL: 'https://sepolia.blastscan.io/',
        },
      },
      {
        network: 'blast',
        chainId: 81457,
        urls: {
          apiURL: 'https://api.blastscan.io/api',
          browserURL: 'https://blastscan.io/',
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    blastSepolia: {
      url: `${process.env.RPC_BLAST_SEPOLIA || 'https://sepolia.blast.io'}`,
      accounts: {
        mnemonic: `${process.env.BLAST_SEPOLIA_MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
    },
    blast: {
      url: `${process.env.RPC_BLAST || 'https://rpc.blast.io'}`,
      accounts: {
        mnemonic: `${process.env.BLAST_MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
    },
  },
  solidity: {
    compilers: [DEFAULT_COMPILER_SETTINGS],
    overrides: {
      'contracts/core/VotingEscrowUpgradeableV2.sol': VOTER_LOWEST_SIZE,
      'contracts/core/VoterUpgradeableV2.sol': VOTER_LOWEST_SIZE,
      'contracts/core/VeArtProxy.sol': LOWEST_CONTRACT_SIZE_COMPILER_SETTINGS,
      'contracts/core/VeArtProxyStatic.sol': LOWEST_CONTRACT_SIZE_COMPILER_SETTINGS,
    },
  },
  warnings: {
    'contracts/mocks/**/*': {
      default: 'off',
    },
  },
  abiExporter: [
    {
      path: './abi/json',
      format: 'json',
    },
    {
      path: './abi/minimal',
      format: 'minimal',
    },
    {
      path: './abi/fullName',
      format: 'fullName',
    },
  ],
};

export default config;

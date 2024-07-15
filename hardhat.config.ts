import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-contract-sizer';
import '@nomicfoundation/hardhat-verify';
import 'dotenv/config';
import { SolcUserConfig } from 'hardhat/types';
import 'hardhat-tracer';

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

const SPECIFIC_COMPILER_SETTINGS: SolcUserConfig = {
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
      blastMainnet: `${process.env.API_KEY}`,
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
        network: 'blastMainnet',
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
        mnemonic: `${process.env.MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
      gasPrice: 1e3,
    },
    blastMainnet: {
      url: `https://blast-mainnet.infura.io/v3/${process.env.INFURA_ID_PROJECT}`,
      gasPrice: 1e3,
      accounts: {
        mnemonic: `${process.env.MNEMONIC}`,
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
      'contracts/core/VotingEscrowUpgradeable.sol': SPECIFIC_COMPILER_SETTINGS,
    },
  },
};

export default config;

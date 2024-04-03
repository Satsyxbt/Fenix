import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-contract-sizer';
import '@nomicfoundation/hardhat-verify';
import 'dotenv/config';
import { SolcUserConfig } from 'hardhat/types';

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
      blastScanMainnet: `${process.env.API_KEY}`,
      blastMainnet: 'blastMainnet',
      blastScanSepolia: `${process.env.API_KEY}`,
      blastSepolia: 'blastSepolia', // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: 'blastScanSepolia',
        chainId: 168587773,
        urls: {
          apiURL: 'https://api-sepolia.blastscan.io/api',
          browserURL: 'https://sepolia.blastscan.io/',
        },
      },
      {
        network: 'blastSepolia',
        chainId: 168587773,
        urls: {
          apiURL: 'https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan',
          browserURL: 'https://testnet.blastscan.io',
        },
      },
      {
        network: 'blastScanMainnet',
        chainId: 81457,
        urls: {
          apiURL: 'https://api.blastscan.io/api',
          browserURL: 'https://blastscan.io/',
        },
      },
      {
        network: 'blastMainnet',
        chainId: 81457,
        urls: {
          apiURL: 'https://api.routescan.io/v2/network/mainnet/evm/81457/etherscan',
          browserURL: 'https://blastexplorer.io',
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    localhost: {
      gasPrice: 1e3,
    },
    blastScanSepolia: {
      url: `https://blast-sepolia.infura.io/v3/${process.env.INFURA_ID_PROJECT}`,
      accounts: {
        mnemonic: `${process.env.MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
      gasPrice: 1e3,
    },
    blastSepolia: {
      url: `https://blast-sepolia.infura.io/v3/${process.env.INFURA_ID_PROJECT}`,
      accounts: {
        mnemonic: `${process.env.MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
      gasPrice: 1e3,
    },
    blastScanMainnet: {
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

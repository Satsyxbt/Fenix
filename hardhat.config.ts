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
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
    },
    blastScanSepolia: {
      url: `https://rpc.ankr.com/blast_testnet_sepolia/${process.env.ANKR_API_KEY}`,
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
      url: `https://rpc.ankr.com/blast_testnet_sepolia/${process.env.ANKR_API_KEY}`,
      accounts: {
        mnemonic: `${process.env.MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
      gasPrice: 1e3,
    },
    blast_sepolia: {
      forking: {
        enabled: true,
        url: `https://sepolia.blast.io`,
      },
      accounts: {
        mnemonic: 'test test test test test test test test test test test test',
      },
      url: 'https://sepolia.blast.io',
      gasPrice: 1e9,
    },
    local: {
      url: 'http://localhost:8545',
      gasPrice: 1e9,
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

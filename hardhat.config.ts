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
      blastSepolia: 'blastSepolia', // apiKey is not required, just set a placeholder
      blastMainnet: 'blastMainnet',
    },
    customChains: [
      {
        network: 'blastMainnet',
        chainId: 81457,
        urls: {
          apiURL: 'https://api.routescan.io/v2/network/mainnet/evm/81457/etherscan',
          browserURL: 'https://blastexplorer.io',
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
    blastSepolia: {
      url: 'https://testnet.blast.din.dev/rpc',
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
      url: 'https://rpc.blast.io',
      gasPrice: 1e3,
      accounts: {
        mnemonic: `${process.env.MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
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

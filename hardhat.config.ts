import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-contract-sizer';
import '@nomicfoundation/hardhat-verify';
import 'dotenv/config';

const config: HardhatUserConfig = {
  sourcify: {
    enabled: false,
  },
  etherscan: {
    apiKey: {
      blast_sepolia_deploy: 'blast_sepolia_deploy', // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: 'blast_sepolia_deploy',
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
      url: 'https://sepolia.blast.io',
      accounts: {
        mnemonic: `${process.env.MNEMONIC}`,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 20,
        passphrase: '',
      },
      gasPrice: 1e9,
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
    compilers: [
      {
        version: '0.8.19',
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 500,
          },
        },
      },
    ],
  },
};

export default config;

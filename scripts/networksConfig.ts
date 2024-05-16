interface NetworkConfig {
  FILE: string;
  MODE_SFS: string;
  WETH: string;
  SFS_ASSIGN_NFT_ID: number | undefined;
}
const NetworksConfig: Record<number, NetworkConfig> = {
  31337: {
    FILE: 'mode_testnet_deploy.json',
    MODE_SFS: '0xBBd707815a7F7eb6897C7686274AFabd7B579Ff6',
    SFS_ASSIGN_NFT_ID: 678,
    WETH: '0xc7b06F55FBCD31cd691504f3DFc4efa9082616B7',
  },
  34443: {
    FILE: 'mode_mainnet_deploy.json',
    MODE_SFS: '0x8680CEaBcb9b56913c519c069Add6Bc3494B7020',
    SFS_ASSIGN_NFT_ID: undefined,
    WETH: '0x4200000000000000000000000000000000000006',
  },
  919: {
    FILE: 'mode_testnet_deploy.json',
    MODE_SFS: '0xBBd707815a7F7eb6897C7686274AFabd7B579Ff6',
    SFS_ASSIGN_NFT_ID: 678,
    WETH: '0xc7b06F55FBCD31cd691504f3DFc4efa9082616B7',
  },
};

export function getConfig(chainId: bigint): NetworkConfig {
  const config = NetworksConfig[+chainId.toString()];
  if (!config) {
    throw Error('not supported chain, miss config: ' + chainId);
  }
  return config;
}

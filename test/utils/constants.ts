import { ethers } from 'hardhat';

export const ONE_ETHER = ethers.parseEther('1');
export const ONE_GWEI = ethers.parseUnits('1', 'gwei');
export const ZERO_ADDRESS = ethers.ZeroAddress;
export const ZERO = BigInt(0);
export const ONE = BigInt(1);
export const BLAST_PREDEPLOYED_ADDRESS = '0x4300000000000000000000000000000000000002';
export const WETH_PREDEPLOYED_ADDRESS = '0x4200000000000000000000000000000000000023';
export const USDB_PREDEPLOYED_ADDRESS = '0x4200000000000000000000000000000000000022';

export const DEAD_ADDRESS = '0x000000000000000000000000000000000000dead';
export const BEACON_IMPLEMENTATION_SLOT = '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';
export function getAccessControlError(role: string, address: string) {
  return `AccessControl: account ${address.toLowerCase()} is missing role ${role.toLowerCase()}`;
}
export const GasMode = {
  VOID: 0,
  CLAIMABLE: 1,
};
export const VotingEscrowDepositType = {
  DEPOSIT_FOR_TYPE: 0,
  CREATE_LOCK_TYPE: 1,
  INCREASE_UNLOCK_TIME: 2,
  MERGE_TYPE: 3,
};
export const ERRORS = {
  Pausable: {
    Paused: 'Pausable: paused',
    NotPaused: 'Pausable: not paused',
  },
  ERC20: {
    InsufficientBalance: 'ERC20: transfer amount exceeds balance',
    InsufficientAllowance: 'ERC20: insufficient allowance',
  },
  Initializable: {
    Initialized: 'Initializable: contract is already initialized',
    NotInitializing: 'Initializable: contract is not initializing',
  },
  Ownable: {
    NotOwner: 'Ownable: caller is not the owner',
  },
};
export default {
  ERRORS,
  ZERO,
  ONE_ETHER,
  ZERO_ADDRESS,
  ONE,
};

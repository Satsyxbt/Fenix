import { id } from 'ethers';
import { ethers } from 'hardhat';

export const Roles = {
  DEFAULT_ADMIN_ROLE: ethers.ZeroHash,
  BlastGovernorUpgradeable: {
    GAS_HOLDER_ADDER_ROLE: id('GAS_HOLDER_ADDER_ROLE'),
    GAS_WITHDRAWER_ROLE: id('GAS_WITHDRAWER_ROLE'),
  },
  BlastRebasingTokensGovernorUpgradeable: {
    TOKEN_HOLDER_ADDER_ROLE: id('TOKEN_HOLDER_ADDER_ROLE'),
    TOKEN_WITHDRAWER_ROLE: id('TOKEN_WITHDRAWER_ROLE'),
  },
  VotingEscrowUpgradeableV2: {
    DEFAULT_ADMIN_ROLE: ethers.ZeroHash,
  },
};

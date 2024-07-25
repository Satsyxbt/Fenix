import { id } from 'ethers';

export const Roles = {
  Upgradeable: {
    ROLE_ADMIN: id('ROLE_ADMIN'),
  },

  CarbonController: {
    ROLE_FEES_MANAGER: id('ROLE_FEES_MANAGER'),
  },

  Voucher: {
    ROLE_MINTER: id('ROLE_MINTER'),
  },
};

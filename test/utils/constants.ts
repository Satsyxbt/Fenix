import { ethers } from "hardhat";

export const ONE_ETHER = ethers.parseEther("1");
export const ZERO_ADDRESS = ethers.ZeroAddress;
export const ZERO = BigInt(0);
export const ONE = BigInt(1);


export const ERRORS = {
  ERC20: {
    InsufficientBalance: "ERC20: transfer amount exceeds balance",
    InsufficientAllowance: "insufficient allowance"
  },
  Ownable: {
    NotOwner: "Ownable: caller is not the owner"
  }
};
export default {
    ERRORS, ZERO, ONE_ETHER, ZERO_ADDRESS, ONE
};
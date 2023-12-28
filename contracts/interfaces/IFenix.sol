// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Interface of the Fenix main ERC20 token
 * @author Aegas team
 */
interface IFenix is IERC20 {
    /**
     * @dev Allows the contract owner to mint new tokens to a specified address.
     * @param to_ The address to receive the minted tokens.
     * @param amount_ The number of tokens to mint.
     */
    function mint(address to_, uint256 amount_) external;
}
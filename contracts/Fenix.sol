// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20, ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IFenix} from "./interfaces/IFenix.sol";

/**
 * @title Fenix ERC20 Token, Which is the main protocol token
 * @author The Fenix Protocol team
 * @dev This contract extends the ERC20Burnable, and Ownable contracts from OpenZeppelin,
 * providing a comprehensive implementation of a standard ERC20 token with burnable and minting features.
 * The Fenix token allows for minting of new tokens, which can only be initiated by the {EmmisionManager}
 * contract in standard use.
 */
contract Fenix is IFenix, ERC20Burnable, Ownable {
    /**
     * @dev Initializes the contract, giving the transferred address the right to mint
     *
     * @param emissionManager_ Address that will be granted minting rights
     */
    constructor(address emissionManager_) ERC20("Fenix", "FNX") Ownable() {
        _transferOwnership(emissionManager_);
    }

    /**
     * @dev Allows the contract owner to mint new tokens to a specified address.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     * - Can only be called by the contract owner.
     * - `to_` cannot be the zero address.
     *
     * @param to_ The address to receive the minted tokens.
     * @param amount_ The number of tokens to mint.
     */
    function mint(address to_, uint256 amount_) external virtual override onlyOwner {
        _mint(to_, amount_);
    }
}

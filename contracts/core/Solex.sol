// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20, ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Mintable} from "./interfaces/IERC20Mintable.sol";

/**
 * @title SOLEX ERC20 Token, which is the protocol token for Mode network
 * @dev This contract extends the ERC20Burnable and Ownable contracts from OpenZeppelin,
 * providing a comprehensive implementation of a standard ERC20 token with burnable and minting features.
 * The SOLEX token allows for minting of new tokens, which can only be initiated by the {EmissionManager}
 * contract in standard use.
 */
contract Solex is IERC20Mintable, ERC20Burnable, Ownable {
    /**
     * @dev Initializes the contract, giving the transferred address the right to mint
     * and also mints the initial supply.
     *
     * @param modeSfs_ Address of the Mode SFS contract.
     * @param minter_ Address that will be granted ownership and minting rights.
     */
    constructor(address modeSfs_, address minter_) ERC20("SolExchange", "SOLEX") {
        (bool success, ) = modeSfs_.call(abi.encodeWithSignature("register(address)", msg.sender));
        assert(success);
        _mint(msg.sender, 7_500_000e18);
        _transferOwnership(minter_);
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

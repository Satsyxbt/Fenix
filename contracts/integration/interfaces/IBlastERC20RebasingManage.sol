// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {YieldMode, IERC20Rebasing} from "./IERC20Rebasing.sol";

/**
 * @title IBlastERC20RebasingManage Interface
 * @dev Interface for managing ERC20 rebasing tokens within the Blast ecosystem. It provides
 * the necessary functions to configure and claim tokens, ensuring that only authorized
 * entities can perform these operations. This interface mandates the implementation of
 * access control checks to secure the rebasing token management.
 */
interface IBlastERC20RebasingManage {
    /**
     * @dev Configures the rebasing parameters of a specified ERC20 rebasing token.
     * This function can only be called by addresses with the required access permissions.
     * Implementations of this contract should ensure that the `_checkAccessForManageBlastERC20Rebasing`
     * function is called to enforce access control.
     *
     * @param erc20Rebasing_ The address of the ERC20 rebasing token to configure.
     * @param mode_ The yield mode to apply to the token, determining how rebasing mechanics are handled.
     * @return A uint256 value that represents the outcome of the configuration operation,
     * which could be an updated token supply or another relevant metric, depending on the ERC20 rebasing token implementation.
     */
    function configure(address erc20Rebasing_, YieldMode mode_) external returns (uint256);

    /**
     * @dev Claims rebasing tokens on behalf of the caller and transfers them to a specified recipient.
     * This function can only be executed by addresses with the necessary access permissions.
     *
     * @param erc20Rebasing_ The address of the ERC20 rebasing token from which tokens are claimed.
     * @param recipient_ The recipient address to receive the claimed tokens.
     * @param amount_ The amount of tokens to claim.
     * @return The result of the claim operation, specific to the ERC20 rebasing token implementation.
     */
    function claim(address erc20Rebasing_, address recipient_, uint256 amount_) external returns (uint256);
}

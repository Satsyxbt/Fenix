// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBlast} from "./interfaces/IBlast.sol";
import {YieldMode, IERC20Rebasing} from "./interfaces/IERC20Rebasing.sol";

/**
 * @title BlastERC20RebasingManage
 * @dev Abstract contract designed to manage ERC20 rebasing tokens within the Blast ecosystem.
 * It provides functionalities to configure and claim tokens while ensuring that only authorized
 * entities can perform these operations.
 */
abstract contract BlastERC20RebasingManage {
    function configure(address erc20Rebasing_, YieldMode mode_) external virtual returns (uint256) {
        _checkAccessForManageBlastERC20Rebasing();

        return IERC20Rebasing(erc20Rebasing_).configure(mode_);
    }

    /**
     * @dev Claims rebasing tokens on behalf of the caller and transfers them to a specified recipient.
     * This function can only be executed by addresses with the necessary access permissions.
     *
     * @param erc20Rebasing_ The address of the ERC20 rebasing token from which tokens are claimed.
     * @param recipient_ The recipient address to receive the claimed tokens.
     * @param amount_ The amount of tokens to claim.
     * @return The result of the claim operation, specific to the ERC20 rebasing token implementation.
     */
    function claim(address erc20Rebasing_, address recipient_, uint256 amount_) external virtual returns (uint256) {
        _checkAccessForManageBlastERC20Rebasing();

        return IERC20Rebasing(erc20Rebasing_).claim(recipient_, amount_);
    }

    /**
     * @dev Internal function to check if the message sender has the required permissions to manage ERC20 rebasing tokens.
     * Reverts the transaction if the sender is not authorized.
     */
    function _checkAccessForManageBlastERC20Rebasing() internal virtual;
}

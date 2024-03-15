// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {YieldMode, IERC20Rebasing, IBlastERC20RebasingManage} from "./interfaces/IBlastERC20RebasingManage.sol";
import {IBlastPoints} from "./interfaces/IBlastPoints.sol";
import {BlastGovernorSetup} from "./BlastGovernorSetup.sol";

/**
 * @title BlastERC20RebasingManage
 * @dev Abstract contract designed to manage ERC20 rebasing tokens within the Blast ecosystem.
 * It provides functionalities to configure and claim tokens while ensuring that only authorized
 * entities can perform these operations.
 */
abstract contract BlastERC20RebasingManage is IBlastERC20RebasingManage, BlastGovernorSetup {
    function __BlastERC20RebasingManage__init(address blastGovernor_) internal {
        __BlastGovernorSetup_init(blastGovernor_);
        IBlastPoints(0x2fc95838c71e76ec69ff817983BFf17c710F34E0).configurePointsOperator(blastGovernor_);
    }

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

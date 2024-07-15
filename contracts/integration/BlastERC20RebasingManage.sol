// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {YieldMode, IERC20Rebasing, IBlastERC20RebasingManage} from "./interfaces/IBlastERC20RebasingManage.sol";
import {IBlastPoints} from "./interfaces/IBlastPoints.sol";
import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";

/**
 * @title BlastERC20RebasingManage
 * @dev Abstract contract designed to manage ERC20 rebasing tokens within the Blast ecosystem.
 * It provides functionalities to configure and claim tokens while ensuring that only authorized
 * entities can perform these operations.
 */
abstract contract BlastERC20RebasingManage is IBlastERC20RebasingManage, BlastGovernorClaimableSetup {
    /**
     * @dev Initializes the BlastERC20RebasingManage contract. Sets up the initial configuration
     * for managing ERC20 rebasing tokens within the Blast ecosystem. This includes setting the Blast Governor,
     * configuring the Blast Points, and assigning the Blast Points operator.
     *
     * @param blastGovernor_ The address of the Blast Governor to be used for governance processes.
     * @param blastPoints_ The address of the Blast Points contract, used for managing points within the ecosystem.
     * @param blastPointsOperator_ The address of the operator authorized to manage points in the Blast Points contract.
     *
     * Requirements:
     * - `blastGovernor_`, `blastPoints_` and `blastPointsOperator_` must not be the zero address.
     *
     * Emits an `AddressZero` error if any of the required addresses are zero.
     */
    function __BlastERC20RebasingManage__init(address blastGovernor_, address blastPoints_, address blastPointsOperator_) internal {
        if (blastPoints_ == address(0) || blastPointsOperator_ == address(0)) {
            revert AddressZero();
        }
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        IBlastPoints(blastPoints_).configurePointsOperator(blastPointsOperator_);
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

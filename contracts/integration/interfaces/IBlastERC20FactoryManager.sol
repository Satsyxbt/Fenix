// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {YieldMode, IERC20Rebasing} from "./IERC20Rebasing.sol";

interface IBlastERC20FactoryManager {
    /// @notice Emitted when the rebase configuration for a token is set or updated
    /// @param token The address of the token whose rebase configuration has been set or updated
    /// @param isRebase Indicates whether the token is set as a rebasing token
    /// @param mode The yield mode that has been set for the token, defining its rebasing behavior
    event ConfigurationForRebaseToken(address token, bool isRebase, YieldMode mode);

    /// @dev Emitted when set new default blast governor address is changed.
    /// @param defaultBlastGovernor The new default blast governor address
    event DefaultBlastGovernor(address indexed defaultBlastGovernor);

    /// @dev Emitted when set new default blast points address is changed.
    /// @param defaultBlastPoints The new default blast points address
    event DefaultBlastPoints(address indexed defaultBlastPoints);

    /// @dev Emitted when set new default blast points operator address is changed.
    /// @param defaultBlastPointsOperator The new default blast points operator address
    event DefaultBlastPointsOperator(address indexed defaultBlastPointsOperator);

    function defaultBlastGovernor() external view returns (address);

    function defaultBlastPoints() external view returns (address);

    function defaultBlastPointsOperator() external view returns (address);

    function configurationForBlastRebaseTokens(address token_) external view returns (YieldMode);

    function isRebaseToken(address token_) external view returns (bool);
}

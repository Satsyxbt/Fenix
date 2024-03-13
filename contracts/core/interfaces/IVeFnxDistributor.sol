// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Interface for VeBoost
 * @dev Interface for boosting functionality within the Fenix ecosystem.
 */
interface IVeFnxDistributor {
    /**
     * @notice Emitted after successfully distributing veFnx to a recipient.
     * @param recipient Address of the recipient receiving the veFnx tokens.
     * @param tokenId The ID of the veFnx token created for the recipient.
     * @param lockDuration The duration for which FNX tokens are locked, expressed in seconds.
     * @param amount The amount of FNX tokens locked on behalf of the recipient.
     */
    event AridropVeFnx(address indexed recipient, uint256 tokenId, uint256 lockDuration, uint256 amount);

    /// @notice Indicates a mismatch in the lengths of the recipients and amounts arrays provided to `distributeVeFnx`.
    error ArraysLengthMismatch();

    /// @notice Indicates that the contract's balance of FNX is insufficient to cover the total distribution.
    error InsufficientBalance();

    /**
     * @notice Distributes veFnx to the specified recipients by locking FNX tokens on their behalf.
     * @param recipients_ Array of recipient addresses to receive veFnx tokens.
     * @param amounts_ Array of amounts of FNX tokens to be locked for each recipient.
     * @dev Ensures the lengths of the recipients and amounts arrays match, checks for sufficient balance, and locks FNX tokens to distribute veFnx tokens.
     * Emits an `AridropVeFnx` event for each distribution.
     *
     * Resets allowance to zero after distributions.
     */
    function distributeVeFnx(address[] calldata recipients_, uint256[] calldata amounts_) external;
}

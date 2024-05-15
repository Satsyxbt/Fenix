// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Interface for VeBoost
 * @dev Interface for boosting functionality within the Fenix ecosystem.
 */
interface IVeTokenDistributor {
    /**
     * @notice Emitted after successfully distributing veSOLEX to a recipient.
     * @param recipient Address of the recipient receiving the veSOLEX tokens.
     * @param tokenId The ID of the veSOLEX token created for the recipient.
     * @param lockDuration The duration for which SOLEX tokens are locked, expressed in seconds.
     * @param amount The amount of SOLEX tokens locked on behalf of the recipient.
     */
    event AirdropVeToken(address indexed recipient, uint256 tokenId, uint256 lockDuration, uint256 amount);

    /// @notice Indicates a mismatch in the lengths of the recipients and amounts arrays provided to `distributeVeFnx`.
    error ArraysLengthMismatch();

    /// @notice Indicates that the contract's balance of SOLEX is insufficient to cover the total distribution.
    error InsufficientBalance();

    /**
     * @notice Distributes veSOLEX to the specified recipients by locking SOLEX tokens on their behalf.
     * @param recipients_ Array of recipient addresses to receive veSOLEX tokens.
     * @param amounts_ Array of amounts of SOLEX tokens to be locked for each recipient.
     * @dev Ensures the lengths of the recipients and amounts arrays match, checks for sufficient balance, and locks SOLEX tokens to distribute veSOLEX tokens.
     * Emits an `AirdropVeToken` event for each distribution.
     *
     * Resets allowance to zero after distributions.
     */
    function distributeVeToken(address[] calldata recipients_, uint256[] calldata amounts_) external;
}

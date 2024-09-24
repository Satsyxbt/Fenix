// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

/**
 * @title IMinimalLinearVesting
 * @dev Interface for the MinimalLinearVestingUpgradeable contract.
 */
interface IMinimalLinearVesting {
    /**
     * @dev Emitted when a user successfully claims tokens.
     * @param caller The address of the user claiming tokens.
     * @param amount The amount of tokens claimed.
     */
    event Claim(address indexed caller, uint256 indexed amount);

    /**
     * @dev Emitted when the wallet allocations are updated by the owner.
     * @param wallets The list of wallet addresses.
     * @param allocation The list of corresponding allocations.
     */
    event UpdateWalletsAllocation(address[] wallets, uint256[] allocation);

    /**
     * @dev Emitted when the vesting parameters are updated.
     * @param startTimestamp The new start timestamp of the vesting.
     * @param duration The new duration of the vesting period.
     */
    event UpdateVestingParams(uint256 startTimestamp, uint256 duration);

    /**
     * @notice Sets the token allocation for multiple wallets.
     * @dev Can only be called by the owner and before the vesting has started.
     * Reverts with `NotAvailableDuringClaimPhase` if vesting has started.
     * Reverts with `ArrayLengthMismatch` if the lengths of `wallets_` and `amounts_` do not match or if they are empty.
     * The total allocated amount is adjusted based on the changes in the wallet allocations.
     * If the current balance exceeds the new allocation, the excess tokens are transferred to the owner.
     * If the current balance is less than the new allocation, the owner must transfer the difference to the contract.
     * @param wallets_ The array of wallet addresses.
     * @param amounts_ The array of token amounts allocated to each wallet.
     */
    function setWalletsAllocation(address[] calldata wallets_, uint256[] calldata amounts_) external;

    /**
     * @notice Updates the vesting parameters such as the start timestamp and duration.
     * @param startTimestamp_ The new vesting start timestamp.
     * @param duration_ The new duration of the vesting in seconds.
     */
    function setVestingParams(uint256 startTimestamp_, uint256 duration_) external;

    /**
     * @notice Allows users to claim their vested tokens.
     */
    function claim() external;

    /**
     * @notice Returns the amount of tokens available for claim for a given wallet.
     * @param wallet_ The address of the wallet to check.
     * @return The amount of tokens available for claim.
     */
    function getAvailableForClaim(address wallet_) external view returns (uint256);

    /**
     * @notice Returns whether the claim phase has started.
     * @dev The claim phase starts when the current timestamp is greater than or equal to the `startTimestamp`.
     * @return True if the claim phase has started, false otherwise.
     */
    function isClaimPhase() external view returns (bool);

    /**
     * @notice Returns the token address for the vested token.
     * @return The address of the vested token.
     */
    function token() external view returns (address);

    /**
     * @notice Returns the timestamp when the vesting period starts.
     * @return The timestamp for the start of vesting.
     */
    function startTimestamp() external view returns (uint256);

    /**
     * @notice Returns the duration of the vesting period in seconds.
     * @return The duration of the vesting period.
     */
    function duration() external view returns (uint256);

    /**
     * @notice Returns the token allocation for a specific wallet.
     * @param wallet The address of the wallet.
     * @return The token allocation for the wallet.
     */
    function allocation(address wallet) external view returns (uint256);

    /**
     * @notice Returns the claimed amount of tokens for a specific wallet.
     * @param wallet The address of the wallet.
     * @return The claimed token amount for the wallet.
     */
    function claimed(address wallet) external view returns (uint256);
}

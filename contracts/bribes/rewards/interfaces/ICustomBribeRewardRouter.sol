// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title ICustomBribeRewardRouter
 * @notice This interface defines the functions and events for a custom bribe reward router.
 *         It handles the conversion of FNX or veFNX NFTs into intermediary brVeFNX tokens,
 *         and then notifies external bribe contracts of these newly available rewards.
 */
interface ICustomBribeRewardRouter {
    /**
     * @dev Emitted when the contract configuration is changed to enable or disable a specific function.
     * @param funcSign The 4-byte function selector indicating the targeted function.
     * @param isEnable A boolean indicating whether the function is now enabled (true) or disabled (false).
     */
    event FuncEnabled(bytes4 indexed funcSign, bool isEnable);

    /**
     * @dev Emitted when FNX tokens are converted into brVeFNX and distributed to a specified external bribe contract.
     * @param caller The address that initiated the reward notification.
     * @param pool The address of the pool for which the reward is being notified.
     * @param externalBribe The address of the external bribe contract receiving the reward.
     * @param amount The amount of FNX (converted into brVeFNX) notified as a reward.
     */
    event NotifyRewardFNXInVeFnx(address indexed caller, address indexed pool, address indexed externalBribe, uint256 amount);

    /**
     * @dev Emitted when a veFNX NFT is burned and its underlying FNX is converted into brVeFNX,
     *      then notified to a specified external bribe contract.
     * @param caller The address that initiated the reward notification.
     * @param pool The address of the pool for which the reward is being notified.
     * @param externalBribe The address of the external bribe contract receiving the reward.
     * @param tokenId The identifier of the veFNX NFT that was burned.
     * @param amount The amount of FNX (converted into brVeFNX) notified as a reward.
     */
    event NotifyRewardVeFNXInVeFnx(
        address indexed caller,
        address indexed pool,
        address externalBribe,
        uint256 indexed tokenId,
        uint256 amount
    );

    /**
     * @notice Notifies an external bribe contract that FNX has been converted into brVeFNX and is ready as a reward.
     * @dev FNX tokens are first transferred into
     *      this contract, converted into brVeFNX, and then notified to the external bribe contract linked to the given pool.
     * @param pool_ The address of the pool for which the reward is being notified.
     * @param amount_ The amount of FNX to be converted into brVeFNX and notified as a reward.
     *
     * Emits a {NotifyRewardFNXInVeFnx} event.
     * Reverts if:
     * - The functionality is disabled.
     * - The corresponding external bribe contract cannot be found or is invalid.
     */
    function notifyRewardFNXInVeFNX(address pool_, uint256 amount_) external;

    /**
     * @notice Notifies an external bribe contract using FNX converted from a burned veFNX NFT.
     * @dev The veFNX NFT is transferred
     *      into this contract, burned to reclaim the underlying FNX, converted into brVeFNX, and then
     *      notified to the external bribe contract linked to the given pool.
     * @param pool_ The address of the pool for which the reward is being notified.
     * @param tokenId_ The ID of the veFNX NFT to be burned and converted into brVeFNX as a reward.
     *
     * Emits a {NotifyRewardVeFNXInVeFnx} event.
     * Reverts if:
     * - The functionality is disabled.
     * - The corresponding external bribe contract cannot be found or is invalid.
     * - The token state does not allow for burning (e.g., permanently locked, attached, or recently voted).
     */
    function notifyRewardVeFNXInVeFnx(address pool_, uint256 tokenId_) external;
}

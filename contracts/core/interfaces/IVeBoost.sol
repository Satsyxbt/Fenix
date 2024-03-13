// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Interface for VeBoost
 * @dev Interface for boosting functionality within the Fenix ecosystem.
 */
interface IVeBoost {
    /**
     * @dev Emitted when a reward is sent to a token owner as part of the boost process.
     * @param token The address of the reward token.
     * @param recipient The recipient of the reward.
     * @param rewardTokenBoostAmount The amount of reward token sent.
     */
    event RewardSent(address indexed token, address indexed recipient, uint256 indexed rewardTokenBoostAmount);

    /**
     * @dev Emitted when the FNX boost percentage is updated.
     * @param fnxBoostPercentage New boost percentage.
     */
    event FNXBoostPercentage(uint256 indexed fnxBoostPercentage);

    /**
     * @dev Emitted when the minimum USD amount required for a boost is updated.
     * @param minUSDAmount New minimum USD amount.
     */
    event MinUSDAmount(uint256 indexed minUSDAmount);

    /**
     * @dev Emitted when the minimum locked time for a boost is updated.
     * @param minLockedTime_ New minimum locked time.
     */
    event MinLockedTime(uint256 indexed minLockedTime_);

    /**
     * @dev Emitted when tokens are recovered by the owner.
     * @param token Address of the recovered token.
     * @param recoverAmount Amount of tokens recovered.
     */
    event RecoverToken(address indexed token, uint256 indexed recoverAmount);

    /**
     * @dev Emitted when a new reward token is added.
     * @param token Address of the reward token added.
     */
    event AddRewardToken(address indexed token);

    /**
     * @dev Emitted when a reward token is removed.
     * @param token Address of the reward token removed.
     */
    event RemoveRewardToken(address indexed token);

    /**
     * @dev Emitted when a new price provider is setted.
     * @param priceProvider Address of the new price provider.
     */
    event PriceProvider(address indexed priceProvider);

    // Errors
    error InvalidMinLockedTime();
    error AccessDenied();
    error RewardTokenExist();
    error RewardTokenNotExist();
    error InvalidBoostAmount();

    /**
     * @dev Before paying FNX boost, checks if the boost amount is valid and then distributes reward tokens proportionally.
     * Can only be called by the voting escrow contract. Emits `InvalidBoostAmount` error if conditions are not met.
     * @param tokenOwner_ The owner of the tokens to receive the boost.
     * @param tokenId_ The ID of the token to be boosted.
     * @param depositedFNXAmount_ The amount of FNX that was deposited.
     * @param paidBoostFNXAmount_ The amount of FNX used for the boost.
     */
    function beforeFNXBoostPaid(address tokenOwner_, uint256 tokenId_, uint256 depositedFNXAmount_, uint256 paidBoostFNXAmount_) external;

    /**
     * @dev Returns the minimum FNX amount required for receiving a boost.
     * @return The minimum amount of FNX required for a boost.
     */
    function getMinFNXAmountForBoost() external view returns (uint256);

    /**
     * @dev Returns the minimum locked time required to qualify for a boost.
     * @return The minimum locked time in seconds.
     */
    function getMinLockedTimeForBoost() external view returns (uint256);

    /**
     * @dev Calculates the amount of FNX that can be boosted based on the deposited amount.
     * @param depositedFNXAmount_ The amount of FNX deposited.
     * @return The amount of FNX that will be boosted.
     */
    function calculateBoostFNXAmount(uint256 depositedFNXAmount_) external view returns (uint256);

    /**
     * @dev Returns the available amount of FNX for boosts, considering both balance and allowance.
     * @return The available FNX amount for boosts.
     */
    function getAvailableBoostFNXAmount() external view returns (uint256);
}

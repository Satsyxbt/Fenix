// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {YieldMode} from "./IERC20Rebasing.sol";

/**
 * @title IBlastRebasingTokensGovernor
 * @dev Interface for the BlastRebasingTokensGovernor contract.
 */
interface IBlastRebasingTokensGovernor {
    /**
     * @dev Enum representing the different directions for yield distribution.
     */
    enum YieldDistributionDirection {
        Others,
        Incentives,
        Rise,
        Bribes
    }

    /**
     * @dev Struct representing accounting information for tokens.
     * @param totalAccumulated The total accumulated amount of tokens.
     * @param available The available amount of tokens for distribution or withdrawal.
     */
    struct TokenAccountingInfo {
        uint256 totalAccumulated;
        uint256 available;
    }

    /**
     * @dev Struct representing yield distribution information.
     * @param tokensInfo A mapping of token addresses to their accounting information.
     * @param distributionPercentage The percentage of yield allocated to this direction.
     * @param isAvailableToSwapToTargetTokens Indicates if swapping to target tokens is available for this direction.
     */
    struct YieldDistributionInfo {
        mapping(address token => TokenAccountingInfo) tokensInfo;
        uint256 distributionPercentage;
        bool isAvailableToSwapToTargetTokens;
    }

    /**
     * @dev Struct representing claimable amounts result.
     * @param contractAddress The address of the token holder contract.
     * @param claimableAmount The amount of tokens that can be claimed.
     * @param mode The current yield mode of the token.
     */
    struct ClaimableAmountsResult {
        address contractAddress;
        uint256 claimableAmount;
        YieldMode mode;
    }

    /**
     * @dev Struct representing view information for token accounting.
     * @param token The address of the token.
     * @param totalAccumulated The total accumulated amount of the token.
     * @param available The available amount of the token for distribution or withdrawal.
     */
    struct TokenAccountingInfoView {
        address token;
        uint256 totalAccumulated;
        uint256 available;
    }

    /**
     * @dev Struct representing view information for yield distribution directions.
     * @param direction The yield distribution direction.
     * @param distributionPercentage The percentage allocated to the direction.
     * @param isAvailableToSwapToTargetTokens Indicates if swapping to target tokens is allowed for this direction.
     * @param tokensInfo The accounting information for the tokens in this direction.
     */
    struct YieldDistributionDiresctionsInfoView {
        YieldDistributionDirection direction;
        uint256 distributionPercentage;
        bool isAvailableToSwapToTargetTokens;
        TokenAccountingInfoView[] tokensInfo;
    }

    /**
     * @dev Struct representing the details of an airdrop.
     * @param recipient Address of the recipient of veFnx tokens.
     * @param withPermanentLock Indicates if the veFnx tokens should be permanently locked.
     * @param amount The amount of FNX tokens to lock for veFnx.
     * @param managedTokenIdForAttach The managed token ID for attaching veFnx.
     */
    struct AidropRow {
        address recipient;
        bool withPermanentLock;
        uint256 amount;
        uint256 managedTokenIdForAttach;
    }

    /**
     * @notice Emitted after successfully distributing veFnx to a recipient.
     * @param recipient Address of the recipient receiving the veFnx tokens.
     * @param tokenId The ID of the veFnx token created for the recipient.
     * @param lockDuration The duration for which FNX tokens are locked, expressed in seconds.
     * @param amount The amount of FNX tokens locked on behalf of the recipient.
     */
    event AirdropVeFnx(address indexed recipient, uint256 tokenId, uint256 lockDuration, uint256 amount);

    /**
     * @dev Emitted when a rebasing token holder is added.
     * @param token The address of the rebasing token.
     * @param contractAddress The address of the added token holder contract.
     */
    event AddRebasingTokenHolder(address indexed token, address indexed contractAddress);

    /**
     * @dev Emitted when tokens are claimed and distributed across different yield directions.
     * @param caller The address initiating the claim.
     * @param token The address of the token being claimed.
     * @param totalClaimedAmount The total amount of tokens claimed.
     * @param toOthersYieldDirectionDistributed The amount distributed to the 'Others' yield direction.
     * @param toIncentivesYieldDirectionDistributed The amount distributed to the 'Incentives' yield direction.
     * @param toRiseYieldDirectionDistributed The amount distributed to the 'Rise' yield direction.
     * @param toBribesYieldDirectionDistributed The amount distributed to the 'Bribes' yield direction.
     */
    event Claim(
        address indexed caller,
        address indexed token,
        uint256 indexed totalClaimedAmount,
        uint256 toOthersYieldDirectionDistributed,
        uint256 toIncentivesYieldDirectionDistributed,
        uint256 toRiseYieldDirectionDistributed,
        uint256 toBribesYieldDirectionDistributed
    );

    /**
     * @dev Emitted when yield distribution percentages are updated.
     * @param toOthersPercentage The percentage allocated to the 'Others' direction.
     * @param toIncentivesPercentage The percentage allocated to the 'Incentives' direction.
     * @param toRisePercentage The percentage allocated to the 'Rise' direction.
     * @param toBribesPercentage The percentage allocated to the 'Bribes' direction.
     */
    event UpdateYieldDistributionPercentage(
        uint256 toOthersPercentage,
        uint256 indexed toIncentivesPercentage,
        uint256 indexed toRisePercentage,
        uint256 indexed toBribesPercentage
    );

    /**
     * @dev Emitted when the availability of swapping to the target token is updated for a yield direction.
     * @param direction The yield distribution direction.
     * @param isAvailableToSwapToTargetTokens Indicates if swapping to target tokens is available for this direction.
     */
    event UpdateDirectionAvailableToSwapToTargetToken(YieldDistributionDirection direction, bool isAvailableToSwapToTargetTokens);

    /**
     * @notice Emitted when a contract address is updated.
     * @param key The key representing the contract.
     * @param value The new address of the contract.
     */
    event UpdateAddress(string key, address indexed value);

    /**
     * @dev Event emitted when tokens are withdrawn by an authorized address.
     * @param caller The address initiating the withdrawal.
     * @param recipient The address receiving the withdrawn tokens.
     * @param direction The yield distribution direction from which tokens are withdrawn.
     * @param token The address of the token being withdrawn.
     * @param amount The amount of tokens withdrawn.
     */
    event Withdraw(
        address caller,
        address indexed recipient,
        YieldDistributionDirection indexed direction,
        address indexed token,
        uint256 amount
    );

    /**
     * @dev Event emitted when a swap is performed using the V3 router.
     * @param caller The address initiating the swap.
     * @param direction The yield distribution direction for which the swap is performed.
     * @param tokenIn The address of the input token being swapped.
     * @param tokenOut The address of the output token received.
     * @param amountIn The amount of input tokens provided.
     * @param amountOut The amount of output tokens received.
     */
    event DirectV3Swap(
        address indexed caller,
        YieldDistributionDirection indexed direction,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @notice Initializes the contract by setting up roles and inherited contracts.
     * @param blastGoveror_ The address of the Blast Governor contract.
     */
    function initialize(address blastGoveror_) external;

    /**
     * @notice Updates the address of a specified contract.
     * @dev Only callable by an address with the VOTER_ADMIN_ROLE.
     * @param key_ The key representing the contract.
     * @param value_ The new address of the contract.
     * @custom:event UpdateAddress Emitted when a contract address is updated.
     * @custom:error InvalidAddressKey Thrown when an invalid key is provided.
     */
    function updateAddress(string memory key_, address value_) external;

    /**
     * @notice Adds a token holder.
     * @dev Adds a contract to the list of token holders.
     * @param token_ The address of the token.
     * @param contractAddress_ The address of the token holder contract.
     */
    function addTokenHolder(address token_, address contractAddress_) external;

    /**
     * @notice Sets whether a direction is available to swap to the target token.
     * @param yieldDirectionType_ The direction type of the yield.
     * @param isAvailableToSwapToTargetTokens_ Whether swapping to the target token is allowed.
     * @custom:event UpdateDirectionAvailableToSwapToTargetToken Emitted when availability of swapping to target token is updated.
     */
    function setDirectionAvailableToSwapToTargetToken(
        YieldDistributionDirection yieldDirectionType_,
        bool isAvailableToSwapToTargetTokens_
    ) external;

    /**
     * @notice Sets the percentage allocation for each yield distribution direction.
     * @param toOthersPercentage_ The percentage for the 'Others' yield direction.
     * @param toIncentivesPercentage_ The percentage for the 'Incentives' yield direction.
     * @param toRisePercentage_ The percentage for the 'Rise' yield direction.
     * @param toBribesPercentage_ The percentage for the 'Bribes' yield direction.
     * @custom:error InvalidPercentageSum Thrown if the total percentage does not equal 100% (1e18).
     */
    function setYieldDistributionDirectionsPercentage(
        uint256 toOthersPercentage_,
        uint256 toIncentivesPercentage_,
        uint256 toRisePercentage_,
        uint256 toBribesPercentage_
    ) external;

    /**
     * @notice Performs a direct swap of tokens using a Uniswap V3 router.
     * @param yieldDirectionType_ The yield direction type for which the swap is performed.
     * @param token_ The address of the token to be swapped.
     * @param amount_ The amount of tokens to be swapped.
     * @param minAmountOut_ The minimum amount of target tokens expected to receive.
     * @param limitSqrtPrice_ The limit on the sqrt price during the swap.
     * @param deadline_ The deadline by which the swap must be completed.
     * @custom:error AddressNotSetupForSupportSwap Thrown if the swap router or target token is not properly set up.
     * @custom:error InvalidSwapSourceToken Thrown if the source token is the same as the swap target token.
     * @custom:error SwapNotAvailableForDirection Thrown if swapping is not available for the specified direction.
     * @custom:error AmountMoreThenAvailabelToSwapByThisDirection Thrown if the requested amount exceeds the available amount for swap in the specified direction.
     * @custom:event DirectV3Swap Emitted when a swap is performed successfully.
     */
    function directV3Swap(
        YieldDistributionDirection yieldDirectionType_,
        address token_,
        uint256 amount_,
        uint256 minAmountOut_,
        uint160 limitSqrtPrice_,
        uint256 deadline_
    ) external;

    /**
     * @notice Withdraws tokens to a specified recipient.
     * @param yieldDirectionType_ The yield direction type for which the withdrawal is made.
     * @param token_ The address of the token to be withdrawn.
     * @param recipient_ The address of the recipient to receive the tokens.
     * @param amount_ The amount of tokens to be withdrawn.
     * @custom:error ZeroTokensToClaim Thrown if there are no tokens available to withdraw.
     * @custom:error InsufficientAvailableAmountToWithdraw Thrown if the requested withdrawal amount exceeds the available amount.
     * @custom:event Withdraw Emitted when tokens are withdrawn successfully.
     */
    function withdraw(YieldDistributionDirection yieldDirectionType_, address token_, address recipient_, uint256 amount_) external;

    /**
     * @notice Distributes FNX (target swap tokens) as veFNX to specified recipients.
     * @dev Allows an authorized address to distribute FNX tokens by creating locked veFNX tokens for recipients.
     * Tokens are locked for a duration of approximately 6 months.
     *
     * @param yieldDirectionType_ The yield distribution direction from which tokens are distributed.
     * @param rows_ An array of `AidropRow` structs containing recipient addresses, amounts, and other parameters for veFNX distribution.
     *
     * Requirements:
     * - The caller must have the `TOKEN_DISTRIBUTE_ROLE`.
     * - Each recipient address in `rows_` must not be the zero address.
     * - The total distribution amount must not exceed the available balance for the specified yield direction.
     *
     * Emits:
     * - `AirdropVeFnx` for each recipient when tokens are successfully distributed as veFNX.
     *
     * Errors:
     * - `ZeroRecipientAddress` if any recipient address in `rows_` is the zero address.
     * - `ZeroTokensToClaim` if the available balance for the specified yield direction is zero.
     * - `InsufficientAvailableAmountToDistribute` if the total distribution amount exceeds the available balance for the specified yield direction.
     */
    function distributeVeFnx(YieldDistributionDirection yieldDirectionType_, AidropRow[] calldata rows_) external;

    /**
     * @notice Claims from specified token holders.
     * @param token_ The address of the token.
     * @param holders_ The addresses of the token holders.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claimFromSpecifiedTokenHolders(address token_, address[] memory holders_) external returns (uint256 totalClaimedAmount);

    /**
     * @notice Claims tokens for a recipient within the specified range.
     * @param token_ The address of the token.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claim(address token_, uint256 offset_, uint256 limit_) external returns (uint256 totalClaimedAmount);

    /**
     * @notice Reads claimable amounts within the specified range.
     * @param token_ The address of the token.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return tokenHoldersClamableAmounts The claimable amounts of the token holders.
     */
    function readClaimableAmounts(
        address token_,
        uint256 offset_,
        uint256 limit_
    ) external view returns (ClaimableAmountsResult[] memory tokenHoldersClamableAmounts);

    /**
     * @notice Reads claimable amounts from specified token holders.
     * @param token_ The address of the token.
     * @param holders_ The addresses of the token holders.
     * @return tokenHoldersClamableAmounts The claimable amounts of the token holders.
     */
    function readClaimableAmountsFromSpecifiedTokenHolders(
        address token_,
        address[] memory holders_
    ) external view returns (ClaimableAmountsResult[] memory tokenHoldersClamableAmounts);

    /**
     * @notice Checks if a contract is a registered token holder.
     * @param token_ The address of the token.
     * @param contractAddress_ The address of the contract.
     * @return isRegistered Whether the contract is a registered token holder.
     */
    function isRegisteredTokenHolder(address token_, address contractAddress_) external view returns (bool isRegistered);

    /**
     * @notice Provides information about the current swap settings.
     * @dev Returns the target token and swap router addresses used for swaps.
     * @return targetToken The address of the target token for swaps.
     * @return swapRouter The address of the swap router.
     */
    function swapInfo() external view returns (address targetToken, address swapRouter);

    /**
     * @notice Gets information about yield distribution for a specific direction and token.
     * @param direction_ The yield distribution direction.
     * @param token_ The address of the token.
     * @return TokenAccountingInfo Struct containing accounting information for the token.
     */
    function getYieldDirectionTokenInfo(
        YieldDistributionDirection direction_,
        address token_
    ) external view returns (TokenAccountingInfo memory);

    /**
     * @notice Gets information about yield distribution for multiple directions and tokens.
     * @param tokens_ The addresses of the tokens to get information about.
     * @return array An array of YieldDistributionDiresctionsInfoView structs containing the yield distribution information for each direction.
     */
    function getYieldDirectionsInfo(address[] calldata tokens_) external view returns (YieldDistributionDiresctionsInfoView[] memory array);

    /**
     * @notice Lists token holders within the specified range.
     * @param token_ The address of the token.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return tokenHolders The addresses of the token holders.
     */
    function listRebasingTokenHolders(
        address token_,
        uint256 offset_,
        uint256 limit_
    ) external view returns (address[] memory tokenHolders);
}

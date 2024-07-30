// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IFenixRaise
 * @dev This interfaces for contract manages a token raise with both whitelist and public phases.
 *  It utilizes Merkle proof verification for whitelist management and ensures various caps and limits are adhered to during the raise.
 */
interface IFenixRaise {
    /**
     * @notice Emitted when a deposit is made
     * @param user The address of the user making the deposit
     * @param amount The amount of tokens deposited
     */
    event Deposit(address indexed user, uint256 indexed amount);

    /**
     * @notice Emitted when timestamps are updated
     * @param startWhitelistPhaseTimestamp The new timestamp for the start of the whitelist phase
     * @param startPublicPhaseTimestamp The new timestamp for the start of the public phase
     * @param endPublicPhaseTimestamp The new timestamp for the end of the public phase
     * @param startClaimPhaseTimestamp The new timestamp for the start of the claim phase
     */
    event UpdateTimestamps(
        uint256 indexed startWhitelistPhaseTimestamp,
        uint256 indexed startPublicPhaseTimestamp,
        uint256 indexed endPublicPhaseTimestamp,
        uint256 startClaimPhaseTimestamp
    );

    /**
     * @dev Emitted when a user claims their tokens.
     * @param user The address of the user.
     * @param claimAmount The total amount of tokens claimed.
     * @param toTokenAmount The amount of tokens transferred directly to the user.
     * @param toVeNFTAmount The amount of tokens locked as veNft.
     * @param tokenId The ID of the veNft lock created.
     */
    event Claim(address indexed user, uint256 claimAmount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);

    /**
     * @notice Emitted when deposit caps are updated
     * @param totalDepositCap The new total deposit cap
     * @param whitelistPhaseUserCap The new user cap for the whitelist phase
     * @param publicPhaseUserCap The new user cap for the public phase
     */
    event UpdateDepositCaps(uint256 indexed totalDepositCap, uint256 indexed whitelistPhaseUserCap, uint256 indexed publicPhaseUserCap);

    /**
     * @notice Emitted when the whitelist root is updated
     * @param root The new whitelist root
     */
    event UpdateWhitelistRoot(bytes32 indexed root);

    /**
     * @notice Emitted when deposits are withdrawn
     * @param caller The address of the caller withdrawing the deposits
     * @param depositsReciever The address receiving the deposits
     * @param amount The amount of tokens withdrawn
     */
    event WithdrawDeposits(address indexed caller, address indexed depositsReciever, uint256 indexed amount);

    /**
     * @notice Emitted when excessive rewards are withdrawn
     * @param caller The address of the caller withdrawing the excessive rewards
     * @param tokensReciever The address receiving the excessive rewards
     * @param amount The amount of rewards tokens withdrawn
     */
    event WithdrawExcessiveRewardTokens(address indexed caller, address indexed tokensReciever, uint256 indexed amount);

    /**
     * @notice Claim tokens after the raise
     * @dev Users can claim their reward tokens and veNFTs based on their deposited amount.
     *      If the user has already claimed, it reverts with `AlreadyClaimed`.
     *      If the deposited amount is zero, it reverts with `ZeroAmount`.
     *      If the claim phase not started, it reverts with `ClaimPhaseNotStarted`.
     */
    function claim() external;

    /**
     * @notice Allows users to deposit tokens during the raise
     * @param amount_ The amount of tokens to deposit
     * @param userCap_ The cap for the user (used for whitelist verification)
     * @param proof_ The Merkle proof for verifying the user is whitelisted
     */
    function deposit(uint256 amount_, uint256 userCap_, bytes32[] memory proof_) external;

    /**
     * @notice Withdraws the deposits after the raise is finished
     */
    function whithdrawDeposits() external;

    /**
     * @notice Withdraws the excessive rewards after the raise is finished
     */
    function withdrawExcessiveRewardTokens() external;

    /**
     * @notice Sets the deposit caps
     * @param totalDepositCap_ The total deposit cap
     * @param whitelistPhaseUserCap_ The user cap for the whitelist phase
     * @param publicPhaseUserCap_ The user cap for the public phase
     */
    function setDepositCaps(uint256 totalDepositCap_, uint256 whitelistPhaseUserCap_, uint256 publicPhaseUserCap_) external;

    /**
     * @notice Sets the whitelist root
     * @param root_ The new whitelist root
     */
    function setWhitelistRoot(bytes32 root_) external;

    /**
     * @notice Sets the timestamps for the phases
     * @param startWhitelistPhaseTimestamp_ The timestamp for the start of the whitelist phase
     * @param startPublicPhaseTimestamp_ The timestamp for the start of the public phase
     * @param endPublicPhaseTimestamp_ The timestamp for the end of the public phase
     * @param startClaimPhaseTimestamp_ The timestamp for the start of the claim phase
     */
    function setTimestamps(
        uint256 startWhitelistPhaseTimestamp_,
        uint256 startPublicPhaseTimestamp_,
        uint256 endPublicPhaseTimestamp_,
        uint256 startClaimPhaseTimestamp_
    ) external;

    /**
     * @notice Checks if a user is whitelisted
     * @param user_ The address of the user
     * @param userCap_ The cap for the user
     * @param proof_ The Merkle proof for verifying the user
     * @return True if the user is whitelisted, false otherwise
     */
    function isWhitelisted(address user_, uint256 userCap_, bytes32[] memory proof_) external view returns (bool);

    /**
     * @notice Checks if the whitelist phase is active
     * @return True if the whitelist phase is active, false otherwise
     */
    function isWhitelistPhase() external view returns (bool);

    /**
     * @notice Checks if the public phase is active
     * @return True if the public phase is active, false otherwise
     */
    function isPublicPhase() external view returns (bool);

    /**
     * @notice Checks if the claim phase is active
     * @return True if the claim phase is active, false otherwise
     */
    function isClaimPhase() external view returns (bool);

    /**
     * @notice Gets the reward amounts out based on the deposit amount
     * @param depositAmount_ The amount of tokens deposited
     * @return toRewardTokenAmount The amount of reward tokens
     * @return toVeNftAmount The amount to veNFT token
     */
    function getRewardsAmountOut(uint256 depositAmount_) external view returns (uint256 toRewardTokenAmount, uint256 toVeNftAmount);

    /**
     * @notice Returns whether a user has claimed their tokens
     * @param user_ The address of the user
     * @return True if the user has claimed their tokens, false otherwise
     */
    function isUserClaimed(address user_) external view returns (bool);

    /**
     * @notice Returns the address of the token being raised
     * @return The address of the token
     */
    function token() external view returns (address);

    /**
     * @notice Returns the address of the reward token
     * @return The address of the reward token
     */
    function rewardToken() external view returns (address);

    /**
     * @notice Returns the amount of reward tokens per deposit token
     * @return The amount of reward tokens per deposit token
     */
    function amountOfRewardTokenPerDepositToken() external view returns (uint256);

    /**
     * @notice Returns percentage of the claimed amount to be locked as veNFT
     * @return Percentage of the claimed amount to be locked as veNFT
     */
    function toVeNftPercentage() external view returns (uint256);

    /**
     * @notice Returns the address of the voting escrow
     * @return The address of the voting escrow
     */
    function votingEscrow() external view returns (address);

    /**
     * @notice Returns the address that will receive the deposits
     * @return The address of the deposits receiver
     */
    function depositsReciever() external view returns (address);

    /**
     * @notice Returns the Merkle root for the whitelist verification
     * @return The Merkle root
     */
    function whitelistMerklRoot() external view returns (bytes32);

    /**
     * @notice Returns the timestamp for the start of the whitelist phase
     * @return The timestamp for the start of the whitelist phase
     */
    function startWhitelistPhaseTimestamp() external view returns (uint256);

    /**
     * @notice Returns the timestamp for the start of the public phase
     * @return The timestamp for the start of the public phase
     */
    function startPublicPhaseTimestamp() external view returns (uint256);

    /**
     * @notice Returns the timestamp for the end of the public phase
     * @return The timestamp for the end of the public phase
     */
    function endPublicPhaseTimestamp() external view returns (uint256);

    /**
     * @notice Returns the timestamp for the start of the claim phase
     * @return The timestamp for the start of the claim phase
     */
    function startClaimPhaseTimestamp() external view returns (uint256);

    /**
     * @notice Returns the maximum amount a user can deposit during the whitelist phase
     * @return The user cap for the whitelist phase
     */
    function whitelistPhaseUserCap() external view returns (uint256);

    /**
     * @notice Returns the maximum amount a user can deposit during the public phase
     * @return The user cap for the public phase
     */
    function publicPhaseUserCap() external view returns (uint256);

    /**
     * @notice Returns the total cap for deposits
     * @return The total deposit cap
     */
    function totalDepositCap() external view returns (uint256);

    /**
     * @notice Returns the total amount deposited so far
     * @return The total amount deposited
     */
    function totalDeposited() external view returns (uint256);

    /**
     * @notice Returns the total amount claimed so far
     * @return The total amount claimed
     */
    function totalClaimed() external view returns (uint256);

    /**
     * @notice Returns the amount a specific user has deposited
     * @param user_ The address of the user
     * @return The amount deposited by the user
     */
    function userDeposited(address user_) external view returns (uint256);

    /**
     * @notice Returns the amount a specific user has deposited during whitelist phase
     * @param user_ The address of the user
     * @return The amount deposited by the user
     */
    function userDepositsWhitelistPhase(address user_) external view returns (uint256);
}

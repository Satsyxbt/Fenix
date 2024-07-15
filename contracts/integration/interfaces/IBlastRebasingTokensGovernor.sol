// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {YieldMode} from "./IERC20Rebasing.sol";

/**
 * @title IBlastRebasingTokensGovernor
 * @dev Interface for the BlastRebasingTokensGovernor contract.
 */
interface IBlastRebasingTokensGovernor {
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
     * @dev Emitted when a rebasing token holder is added.
     * @param token The address of the rebasing token.
     * @param contractAddress The address of the added token holder contract.
     */
    event AddRebasingTokenHolder(address indexed token, address indexed contractAddress);

    /**
     * @dev Emitted when a claim is made.
     * @param caller The address of the caller who initiated the claim.
     * @param recipient The address of the recipient who receives the claimed tokens.
     * @param token The address of the token being claimed.
     * @param holders The addresses of the token holders from which tokens were claimed.
     * @param totalClaimedAmount The total amount of tokens claimed.
     */
    event Claim(address indexed caller, address indexed recipient, address indexed token, address[] holders, uint256 totalClaimedAmount);

    /**
     * @notice Initializes the contract by setting up roles and inherited contracts.
     * @param blastGoveror_ The address of the Blast Governor contract.
     */
    function initialize(address blastGoveror_) external;

    /**
     * @notice Adds a token holder.
     * @dev Adds a contract to the list of token holders.
     * @param token_ The address of the token.
     * @param contractAddress_ The address of the token holder contract.
     */
    function addTokenHolder(address token_, address contractAddress_) external;

    /**
     * @notice Claims from specified token holders.
     * @param token_ The address of the token.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the token holders.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claimFromSpecifiedTokenHolders(
        address token_,
        address recipient_,
        address[] memory holders_
    ) external returns (uint256 totalClaimedAmount);

    /**
     * @notice Claims tokens for a recipient within the specified range.
     * @param token_ The address of the token.
     * @param recipient_ The address of the recipient.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claim(address token_, address recipient_, uint256 offset_, uint256 limit_) external returns (uint256 totalClaimedAmount);

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

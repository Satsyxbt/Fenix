// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

/**
 * @title IVeFnxSplitMerklAidrop
 * @dev Interface for the VeFnxSplitMerklAidropUpgradeable contract.
 */
interface IVeFnxSplitMerklAidrop {
    /**
     * @dev Emitted when a user claims their tokens.
     * @param user The address of the user.
     * @param claimAmount The total amount of tokens claimed.
     * @param toTokenAmount The amount of tokens transferred directly to the user.
     * @param toVeNFTAmount The amount of tokens locked as veNFT.
     * @param tokenId The ID of the veNFT lock created.
     */
    event Claim(address indexed user, uint256 claimAmount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);

    /**
     * @dev Emitted when the Merkle root is set.
     * @param merklRoot The new Merkle root.
     */
    event SetMerklRoot(bytes32 merklRoot);

    /**
     * @dev Emitted when the pure tokens rate is set.
     * @param pureTokensRate The new pure tokens rate.
     */
    event SetPureTokensRate(uint256 pureTokensRate);
    /**
     * @dev Emitted when the allowed status of a claim operator is set or changed.
     * @param operator The address of the claim operator.
     * @param isAllowed A boolean indicating whether the operator is allowed.
     */
    event SetIsAllowedClaimOperator(address indexed operator, bool indexed isAllowed);

    /**
     * @dev Emitted when tokens are recovered from the contract.
     * @param sender address that performed the recovery.
     * @param amount of tokens recovered.
     */
    event Recover(address indexed sender, uint256 amount);

    /**
     * @dev Allows a user to claim tokens or veNFT tokens based on a Merkle proof.
     * @param inPureTokens_ Boolean indicating if the claim is in pure tokens.
     * @param amount_ The amount to claim.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @param proof_ The Merkle proof for the claim.
     * @notice This function can only be called when the contract is not paused.
     */
    function claim(
        bool inPureTokens_,
        uint256 amount_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_,
        bytes32[] memory proof_
    ) external;

    /**
     * @dev Allows a claim operator to claim tokens on behalf of a target address.
     * @param target_ The address of the user on whose behalf tokens are being claimed.
     * @param inPureTokens_ Boolean indicating if the claim is in pure tokens.
     * @param amount_ The amount to claim.
     * @param withPermanentLock_ Whether the lock should be permanent.
     * @param managedTokenIdForAttach_ The ID of the managed NFT to attach, if any. 0 for ignore
     * @param proof_ The Merkle proof verifying the user's claim.
     * @notice This function can only be called when the contract is not paused.
     * @notice Reverts with `NotAllowedClaimOperator` if the caller is not an allowed claim operator.
     * @notice Emits a {Claim} event.
     */
    function claimFor(
        address target_,
        bool inPureTokens_,
        uint256 amount_,
        bool withPermanentLock_,
        uint256 managedTokenIdForAttach_,
        bytes32[] memory proof_
    ) external;

    /**
     * @dev Sets whether an address is allowed to operate claims on behalf of others.
     * Can only be called by the owner.
     * @param operator_ The address of the operator to set.
     * @param isAllowed_ A boolean indicating whether the operator is allowed.
     * @notice Emits a {SetIsAllowedClaimOperator} event.
     */
    function setIsAllowedClaimOperator(address operator_, bool isAllowed_) external;

    /**
     * @dev Pauses the contract, preventing any further claims.
     * Can only be called by the owner.
     */
    function pause() external;

    /**
     * @dev Unpauses the contract, allowing claims to be made.
     * Can only be called by the owner.
     */
    function unpause() external;

    /**
     * @dev Sets the Merkle root for verifying claims.
     * Can only be called by the owner when the contract is paused.
     * @param merklRoot_ The new Merkle root.
     */
    function setMerklRoot(bytes32 merklRoot_) external;

    /**
     * @dev Sets the pure tokens rate.
     * Can only be called by the owner when the contract is paused.
     * @param pureTokensRate_ The new pure tokens rate.
     * @notice Emits a {SetPureTokensRate} event.
     */
    function setPureTokensRate(uint256 pureTokensRate_) external;

    /**
     * @notice Allows the owner to recover tokens from the contract.
     * @param amount_ The amount of tokens to be recovered.
     * Transfers the specified amount of tokens to the owner's address.
     */
    function recoverToken(uint256 amount_) external;

    /**
     * @dev Verifies if a provided proof is valid for a given user and amount.
     * @param user_ The address of the user.
     * @param amount_ The amount to be verified.
     * @param proof_ The Merkle proof.
     * @return True if the proof is valid, false otherwise.
     */
    function isValidProof(address user_, uint256 amount_, bytes32[] memory proof_) external view returns (bool);

    /**
     * @dev Returns the address of the token contract.
     */
    function token() external view returns (address);

    /**
     * @dev Returns the address of the Voting Escrow contract.
     */
    function votingEscrow() external view returns (address);

    /**
     * @dev Rate for pure tokens.
     */
    function pureTokensRate() external view returns (uint256);

    /**
     * @dev Returns the Merkle root used for verifying claims.
     */
    function merklRoot() external view returns (bytes32);

    /**
     * @dev Returns the amount of tokens claimed by a user.
     * @param user The address of the user.
     * @return The amount of tokens claimed by the user.
     */
    function userClaimed(address user) external view returns (uint256);

    /**
     * @dev Checks if an address is an allowed claim operator.
     * @param operator_ The address to check.
     * @return true if the operator is allowed, false otherwise.
     */
    function isAllowedClaimOperator(address operator_) external view returns (bool);

    /**
     * @dev Calculates the equivalent amount in pure tokens based on the claim amount.
     * @param claimAmount_ The claim amount for which to calculate the equivalent pure tokens.
     * @return The calculated amount of pure tokens.
     */
    function calculatePureTokensAmount(uint256 claimAmount_) external view returns (uint256);
}

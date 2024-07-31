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
     * @param toVeNFTAmount The amount of tokens locked as veFNX.
     * @param tokenId The ID of the veFNX lock created.
     */
    event Claim(address indexed user, uint256 claimAmount, uint256 toTokenAmount, uint256 toVeNFTAmount, uint256 tokenId);

    /**
     * @dev Emitted when the Merkle root is set.
     * @param merklRoot The new Merkle root.
     */
    event SetMerklRoot(bytes32 merklRoot);

    /**
     * @dev Emitted when the split percentage is set.
     * @param toVeFnxPercentage The new percentage of tokens to be locked as veFNX.
     */
    event SetToVeFnxPercentage(uint256 toVeFnxPercentage);
    /**
     * @dev Emitted when the allowed status of a claim operator is set or changed.
     * @param operator The address of the claim operator.
     * @param isAllowed A boolean indicating whether the operator is allowed.
     */
    event SetIsAllowedClaimOperator(address indexed operator, bool indexed isAllowed);

    /**
     * @dev Emitted when FNX tokens are recovered from the contract.
     * @param sender address that performed the recovery.
     * @param amount of FNX tokens recovered.
     */
    event Recover(address indexed sender, uint256 amount);

    /**
     * @dev Allows a user to claim their allocated FNX and veFNX tokens.
     * @param amount_ The total amount of tokens the user can claim.
     * @param proof_ The Merkle proof verifying the user's claim.
     */
    function claim(uint256 amount_, bytes32[] memory proof_) external;

    /**
     * @dev Allows a claim operator to claim tokens on behalf of a target address.
     * Also, the user can claim for himself without the operator permissions
     * @param target_ The address of the user on whose behalf tokens are being claimed.
     * @param amount_ The total amount of tokens to claim.
     * @param proof_ The Merkle proof verifying the user's claim.
     * @notice This function can only be called when the contract is not paused.
     * @notice Reverts with `NotAllowedClaimOperator` if the caller is not an allowed claim operator.
     * @notice Emits a {Claim} event.
     */
    function claimFor(address target_, uint256 amount_, bytes32[] memory proof_) external;

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
     * @dev Sets the percentage of tokens to be locked as veFNX.
     * Can only be called by the owner.
     * @param toVeFnxPercentage_ The new percentage.
     */
    function setToVeFnxPercentage(uint256 toVeFnxPercentage_) external;

    /**
     * @notice Allows the owner to recover FNX tokens from the contract.
     * @param amount_ The amount of FNX tokens to be recovered.
     * Transfers the specified amount of FNX tokens to the owner's address.
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
     * @dev Returns the address of the FNX token contract.
     */
    function token() external view returns (address);

    /**
     * @dev Returns the address of the Voting Escrow contract.
     */
    function votingEscrow() external view returns (address);

    /**
     * @dev Returns the percentage of tokens to be locked as veFNX.
     */
    function toVeFnxPercentage() external view returns (uint256);

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
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Interface for VeFnxDistributor
 * @dev Interface for airdtop contract veFnxDistributor
 */
interface IVeFnxDistributor {
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
     * @dev Emitted when tokens are recovered by the owner.
     * @param token Address of the recovered token.
     * @param recoverAmount Amount of tokens recovered.
     */
    event RecoverToken(address indexed token, uint256 indexed recoverAmount);

    /**
     * @notice Distributes veFnx tokens to specified recipients by locking FNX tokens in the Voting Escrow contract.
     * @param rows_ An array of AidropRow structs representing the recipients and amounts to be distributed.
     */
    function distributeVeFnx(AidropRow[] calldata rows_) external;
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IManagedNFTStrategy
 * @dev Interface for strategies managing NFTs ,
 *      participate in voting, and claim rewards.
 */
interface IManagedNFTStrategy {
    /**
     * @dev Emitted when the name of the strategy is changed.
     * @param newName The new name that has been set for the strategy.
     */
    event SetName(string newName);

    /**
     * @dev Emitted when a new managed NFT is successfully attached to the strategy.
     * @param managedTokenId The ID of the managed NFT that has been attached.
     */
    event AttachedManagedNFT(uint256 indexed managedTokenId);

    /**
     * @notice Called when an NFT is attached to a strategy.
     * @dev Allows the strategy to perform initial setup or balance tracking when an NFT is first attached.
     * @param tokenId The ID of the NFT being attached.
     * @param userBalance The balance of governance tokens associated with the NFT at the time of attachment.
     */
    function onAttach(uint256 tokenId, uint256 userBalance) external;

    /**
     * @notice Called when an NFT is detached from a strategy.
     * @dev Allows the strategy to clean up or update records when an NFT is removed.
     * @param tokenId The ID of the NFT being detached.
     * @param userBalance The remaining balance of governance tokens associated with the NFT at the time of detachment.
     */
    function onDettach(uint256 tokenId, uint256 userBalance) external returns (uint256 lockedRewards);

    /**
     * @notice Gets the address of the managed NFT manager contract.
     * @return The address of the managed NFT manager.
     */
    function managedNFTManager() external view returns (address);

    /**
     * @notice Gets the address of the voting escrow contract used for locking governance tokens.
     * @return The address of the voting escrow contract.
     */
    function votingEscrow() external view returns (address);

    /**
     * @notice Gets the address of the voter contract that coordinates governance actions.
     * @return The address of the voter contract.
     */
    function voter() external view returns (address);

    /**
     * @notice Retrieves the name of the strategy.
     * @return A string representing the name of the strategy.
     */
    function name() external view returns (string memory);

    /**
     * @notice Retrieves the ID of the managed token.
     * @return The token ID used by the strategy.
     */
    function managedTokenId() external view returns (uint256);

    /**
     * @notice Submits a governance vote on behalf of the strategy.
     * @param poolVote_ An array of addresses representing the pools to vote on.
     * @param weights_ An array of weights corresponding to each pool vote.
     */
    function vote(address[] calldata poolVote_, uint256[] calldata weights_) external;

    /**
     * @notice Claims rewards allocated to the managed NFTs from specified gauges.
     * @param gauges_ An array of addresses representing the gauges from which rewards are to be claimed.
     */
    function claimRewards(address[] calldata gauges_) external;

    /**
     * @notice Claims bribes allocated to the managed NFTs for specific tokens and pools.
     * @param bribes_ An array of addresses representing the bribe pools.
     * @param tokens_ An array of token addresses for each bribe pool where rewards can be claimed.
     */
    function claimBribes(address[] calldata bribes_, address[][] calldata tokens_) external;

    /**
     * @notice Attaches a specific managed NFT to this strategy, setting up necessary governance or reward mechanisms.
     * @dev This function can only be called by administrators. It sets the `managedTokenId` and ensures that the token is
     *      valid and owned by this contract. Emits an `AttachedManagedNFT` event upon successful attachment.
     * @param managedTokenId_ The token ID of the NFT to be managed by this strategy.
     * throws AlreadyAttached if the strategy is already attached to a managed NFT.
     * throws IncorrectManagedTokenId if the provided token ID is not managed or not owned by this contract.
     */
    function attachManagedNFT(uint256 managedTokenId_) external;
}

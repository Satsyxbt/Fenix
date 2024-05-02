// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title Interface for Managed NFT Manager
 * @dev Defines the functions and events for managing NFTs, including attaching/detaching to strategies, authorization, and administrative checks.
 */
interface IManagedNFTManager {
    /**
     * @dev Emitted when the disabled state of a managed NFT is toggled.
     * @param sender The address that triggered the state change.
     * @param tokenId The ID of the managed NFT affected.
     * @param isDisable True if the NFT is now disabled, false if it is enabled.
     */
    event ToggleDisableManagedNFT(address indexed sender, uint256 indexed tokenId, bool indexed isDisable);

    /**
     * @dev Emitted when a new managed NFT is created and attached to a strategy.
     * @param sender The address that performed the creation.
     * @param strategy The address of the strategy to which the NFT is attached.
     * @param tokenId The ID of the newly created managed NFT.
     */
    event CreateManagedNFT(address indexed sender, address indexed strategy, uint256 indexed tokenId);

    /**
     * @dev Emitted when an NFT is whitelisted or removed from the whitelist.
     * @param tokenId The ID of the NFT being modified.
     * @param isWhitelisted True if the NFT is being whitelisted, false if it is being removed from the whitelist.
     */
    event SetWhitelistedNFT(uint256 indexed tokenId, bool indexed isWhitelisted);

    /**
     * @dev Emitted when an authorized user is set for a managed NFT.
     * @param managedTokenId The ID of the managed NFT.
     * @param authorizedUser The address being authorized.
     */
    event SetAuthorizedUser(uint256 indexed managedTokenId, address authorizedUser);

    /**
     * @notice Checks if a managed NFT is currently disabled.
     * @param managedTokenId_ The ID of the managed NFT.
     * @return True if the managed NFT is disabled, false otherwise.
     */
    function isDisabledNFT(uint256 managedTokenId_) external view returns (bool);

    /**
     * @notice Determines if a token ID is recognized as a managed NFT within the system.
     * @param managedTokenId_ The ID of the token to check.
     * @return True if the token is a managed NFT, false otherwise.
     */
    function isManagedNFT(uint256 managedTokenId_) external view returns (bool);

    /**
     * @notice Checks if an NFT is whitelisted within the management system.
     * @param tokenId_ The ID of the NFT to check.
     * @return True if the NFT is whitelisted, false otherwise.
     */
    function isWhitelistedNFT(uint256 tokenId_) external view returns (bool);

    /**
     * @notice Verifies if a user's NFT is attached to any managed NFT.
     * @param tokenId_ The ID of the user's NFT.
     * @return True if the NFT is attached, false otherwise.
     */
    function isAttachedNFT(uint256 tokenId_) external view returns (bool);

    /**
     * @notice Checks if a given account is an administrator of the managed NFT system.
     * @param account_ The address to check.
     * @return True if the address is an admin, false otherwise.
     */
    function isAdmin(address account_) external view returns (bool);

    /**
     * @notice Retrieves the managed token ID that a user's NFT is attached to.
     * @param tokenId_ The ID of the user's NFT.
     * @return The ID of the managed token to which the NFT is attached.
     */
    function getAttachedManagedTokenId(uint256 tokenId_) external view returns (uint256);

    /**
     * @notice Address of the Voting Escrow contract managing voting and staking mechanisms.
     */
    function votingEscrow() external view returns (address);

    /**
     * @notice Address of the Voter contract responsible for handling governance actions related to managed NFTs.
     */
    function voter() external view returns (address);

    /**
     * @notice Verifies if a given address is authorized to manage a specific managed NFT.
     * @param managedTokenId_ The ID of the managed NFT.
     * @param account_ The address to verify.
     * @return True if the address is authorized, false otherwise.
     */
    function isAuthorized(uint256 managedTokenId_, address account_) external view returns (bool);

    /**
     * @notice Assigns an authorized user for a managed NFT.
     * @param managedTokenId_ The ID of the managed NFT.
     * @param authorizedUser_ The address to authorize.
     */
    function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external;

    /**
     * @notice Creates a managed NFT and attaches it to a strategy
     * @param strategy_ The strategy to which the managed NFT will be attached
     */
    function createManagedNFT(address strategy_) external returns (uint256 managedTokenId);

    /**
     * @notice Toggles the disabled state of a managed NFT
     * @param managedTokenId_ The ID of the managed token to toggle
     * @dev Enables or disables a managed token to control its operational status, with an event emitted for state change.
     */
    function toggleDisableManagedNFT(uint256 managedTokenId_) external;

    /**
     * @notice Attaches a user's NFT to a managed NFT, enabling it within a specific strategy.
     * @param tokenId_ The user's NFT token ID.
     * @param managedTokenId The managed NFT token ID.
     */
    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId) external;

    /**
     * @notice Detaches a user's NFT from a managed NFT, disabling it within the strategy.
     * @param tokenId_ The user's NFT token ID.
     */
    function onDettachFromManagedNFT(uint256 tokenId_) external;
}

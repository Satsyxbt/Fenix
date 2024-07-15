// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IVotingEscrowV1_2} from "../core/interfaces/IVotingEscrowV1_2.sol";
import {IVotingEscrow} from "../core/interfaces/IVotingEscrow.sol";
import {IManagedNFTStrategy} from "./interfaces/IManagedNFTStrategy.sol";
import {IManagedNFTManager} from "./interfaces/IManagedNFTManager.sol";

/**
 * @title Managed NFT Manager Upgradeable
 * @dev Manages the lifecycle and access control for NFTs used in a managed strategy, leveraging governance and escrow functionalities.
 *      This contract serves as the central point for managing NFTs, their attachments to strategies, and authorized user interactions.
 */
contract ManagedNFTManagerUpgradeable is IManagedNFTManager, AccessControlUpgradeable, BlastGovernorClaimableSetup {
    /**
     * @dev Error indicating an unauthorized access attempt.
     */
    error AccessDenied();

    /**
     * @dev Error indicating an operation attempted on a managed NFT that is currently disabled.
     */
    error ManagedNFTIsDisabled();

    /**
     * @dev Error indicating that a required attachment action was not found or is missing.
     */
    error NotAttached();

    /**
     * @dev Error indicating that the specified token ID does not correspond to a managed NFT.
     */
    error NotManagedNFT();

    /**
     * @dev Error indicating an attempt to reattach an NFT that is already attached to a managed token.
     */
    error AlreadyAttached();

    /**
     * @dev Error indicating a mismatch or incorrect association between user NFTs and managed tokens.
     */
    error IncorrectUserNFT();
    /**
     * @dev Represents the state and association of a user's NFT within the management system.
     * @notice Stores details about an NFT's attachment status, which managed token it's linked to, and any associated amounts.
     */
    struct TokenInfo {
        bool isAttached; // Indicates if the NFT is currently attached to a managed strategy.
        uint256 attachedManagedTokenId; // The ID of the managed token to which this NFT is attached.
        uint256 amount; // The amount associated with this NFT in the context of the managed strategy.
    }

    /**
     * @dev Holds management details about a token within the managed NFT system.
     * @notice Keeps track of a managed token's operational status and authorized users.
     */
    struct ManagedTokenInfo {
        bool isManaged; // True if the token is recognized as a managed token.
        bool isDisabled; // Indicates if the token is currently disabled and not operational.
        address authorizedUser; // Address authorized to perform restricted operations for this managed token.
    }

    /**
     * @dev Role identifier for administrative functions within the NFT management context.
     */
    bytes32 public constant MANAGED_NFT_ADMIN = keccak256("MANAGED_NFT_ADMIN");

    /**
     * @notice Address of the Voting Escrow contract managing voting and staking mechanisms.
     */
    address public override votingEscrow;

    /**
     * @notice Address of the Voter contract responsible for handling governance actions related to managed NFTs.
     */
    address public override voter;

    /**
     * @notice Tracks detailed information about individual tokens.
     */
    mapping(uint256 => TokenInfo) public tokensInfo;

    /**
     * @notice Maintains management state for managed tokens.
     */
    mapping(uint256 => ManagedTokenInfo) public managedTokensInfo;

    /**
     * @notice Tracks whitelisting status of NFTs to control their eligibility within the system.
     */
    mapping(uint256 => bool) public override isWhitelistedNFT;

    /**
     * @dev Ensures that the function can only be called by the designated voter address.
     */
    modifier onlyVoter() {
        if (_msgSender() != voter) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Constructor that disables initialization on implementation.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the Managed NFT Manager contract
     * @param blastGovernor_ The address of the blast governor
     * @param votingEscrow_ The address of the voting escrow contract
     * @param voter_ The address of the voter contract
     */
    function initialize(address blastGovernor_, address votingEscrow_, address voter_) external initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __AccessControl_init();

        _checkAddressZero(votingEscrow_);
        _checkAddressZero(voter_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGED_NFT_ADMIN, msg.sender);

        votingEscrow = votingEscrow_;
        voter = voter_;
    }

    /**
     * @notice Creates a managed NFT and attaches it to a strategy
     * @param strategy_ The strategy to which the managed NFT will be attached
     */
    function createManagedNFT(address strategy_) external onlyRole(MANAGED_NFT_ADMIN) returns (uint256 managedTokenId) {
        managedTokenId = IVotingEscrowV1_2(votingEscrow).createManagedNFT(strategy_);
        managedTokensInfo[managedTokenId] = ManagedTokenInfo(true, false, address(0));
        IManagedNFTStrategy(strategy_).attachManagedNFT(managedTokenId);
        emit CreateManagedNFT(msg.sender, strategy_, managedTokenId);
    }

    /**
     * @notice Authorizes a user for a specific managed token ID
     * @param managedTokenId_ The token ID to authorize
     * @param authorizedUser_ The user being authorized
     */
    function setAuthorizedUser(uint256 managedTokenId_, address authorizedUser_) external onlyRole(MANAGED_NFT_ADMIN) {
        if (!managedTokensInfo[managedTokenId_].isManaged) {
            revert NotManagedNFT();
        }
        managedTokensInfo[managedTokenId_].authorizedUser = authorizedUser_;
        emit SetAuthorizedUser(managedTokenId_, authorizedUser_);
    }

    /**
     * @notice Toggles the disabled state of a managed NFT
     * @param managedTokenId_ The ID of the managed token to toggle
     * @dev Enables or disables a managed token to control its operational status, with an event emitted for state change.
     */
    function toggleDisableManagedNFT(uint256 managedTokenId_) external onlyRole(MANAGED_NFT_ADMIN) {
        if (!managedTokensInfo[managedTokenId_].isManaged) {
            revert NotManagedNFT();
        }
        bool isDisable = !managedTokensInfo[managedTokenId_].isDisabled;
        managedTokensInfo[managedTokenId_].isDisabled = isDisable;
        emit ToggleDisableManagedNFT(msg.sender, managedTokenId_, isDisable);
    }

    /**
     * @notice Handler for attaching to a managed NFT
     * @param tokenId_ The token ID of the user's NFT
     * @param managedTokenId_ The managed token ID to attach to
     */
    function onAttachToManagedNFT(uint256 tokenId_, uint256 managedTokenId_) external onlyVoter {
        ManagedTokenInfo memory managedTokenInfo = managedTokensInfo[managedTokenId_];
        if (!managedTokenInfo.isManaged) {
            revert NotManagedNFT();
        }

        if (managedTokenInfo.isDisabled) {
            revert ManagedNFTIsDisabled();
        }

        if (managedTokensInfo[tokenId_].isManaged || tokensInfo[tokenId_].isAttached) {
            revert IncorrectUserNFT();
        }

        uint256 userBalance = IVotingEscrowV1_2(votingEscrow).onAttachToManagedNFT(tokenId_, managedTokenId_);
        tokensInfo[tokenId_] = TokenInfo(true, managedTokenId_, userBalance);

        IManagedNFTStrategy(IVotingEscrow(votingEscrow).ownerOf(managedTokenId_)).onAttach(tokenId_, userBalance);
    }

    /**
     * @notice Handler for detaching from a managed NFT
     * @param tokenId_ The token ID of the user's NFT
     */
    function onDettachFromManagedNFT(uint256 tokenId_) external onlyVoter {
        TokenInfo memory tokenInfo = tokensInfo[tokenId_];

        if (!tokenInfo.isAttached) {
            revert NotAttached();
        }

        assert(tokenInfo.attachedManagedTokenId != 0);

        uint256 lockedRewards = IManagedNFTStrategy(IVotingEscrow(votingEscrow).ownerOf(tokenInfo.attachedManagedTokenId)).onDettach(
            tokenId_,
            tokenInfo.amount
        );

        IVotingEscrowV1_2(votingEscrow).onDettachFromManagedNFT(
            tokenId_,
            tokenInfo.attachedManagedTokenId,
            tokenInfo.amount + lockedRewards
        );

        delete tokensInfo[tokenId_];
    }

    /**
     * @notice Sets or unsets an NFT as whitelisted
     * @param tokenId_ The token ID of the NFT
     * @param isWhitelisted_ True if whitelisting, false otherwise
     */
    function setWhitelistedNFT(uint256 tokenId_, bool isWhitelisted_) external onlyRole(MANAGED_NFT_ADMIN) {
        isWhitelistedNFT[tokenId_] = isWhitelisted_;
        emit SetWhitelistedNFT(tokenId_, isWhitelisted_);
    }

    /**
     * @notice Retrieves the managed token ID attached to a specific user NFT.
     * @dev Returns the managed token ID to which the user's NFT is currently attached.
     * @param tokenId_ The token ID of the user's NFT.
     * @return The ID of the managed token to which the NFT is attached.
     */
    function getAttachedManagedTokenId(uint256 tokenId_) external view returns (uint256) {
        return tokensInfo[tokenId_].attachedManagedTokenId;
    }

    /**
     * @notice Checks if a specific user NFT is currently attached to a managed token.
     * @dev Returns true if the user's NFT is attached to any managed token.
     * @param tokenId_ The token ID of the user's NFT.
     * @return True if the NFT is attached, false otherwise.
     */
    function isAttachedNFT(uint256 tokenId_) external view returns (bool) {
        return tokensInfo[tokenId_].isAttached;
    }

    /**
     * @notice Determines if a managed token is currently disabled.
     * @dev Checks the disabled status of a managed token to prevent operations during maintenance or shutdown periods.
     * @param managedTokenId_ The ID of the managed token.
     * @return True if the managed token is disabled, false otherwise.
     */
    function isDisabledNFT(uint256 managedTokenId_) external view returns (bool) {
        return managedTokensInfo[managedTokenId_].isDisabled;
    }

    /**
     * @notice Checks if a given address has administrative privileges.
     * @dev Determines whether an address holds the MANAGED_NFT_ADMIN role, granting administrative capabilities.
     * @param account_ The address to check for administrative privileges.
     * @return True if the address has administrative privileges, false otherwise.
     */
    function isAdmin(address account_) external view returns (bool) {
        return account_ == address(this) || super.hasRole(MANAGED_NFT_ADMIN, account_);
    }

    /**
     * @notice Checks if a user is authorized to interact with a specific managed token.
     * @dev Determines whether an address is the designated authorized user for a managed token.
     * @param managedTokenId_ The ID of the managed token.
     * @param account_ The address to verify authorization.
     * @return True if the address is authorized, false otherwise.
     */
    function isAuthorized(uint256 managedTokenId_, address account_) external view returns (bool) {
        return managedTokensInfo[managedTokenId_].authorizedUser == account_;
    }

    /**
     * @notice Determines if a token ID corresponds to a managed NFT within the system.
     * @dev Checks the management status of a token ID to validate its inclusion in managed operations.
     * @param managedTokenId_ The ID of the token to check.
     * @return True if the token is a managed NFT, false otherwise.
     */
    function isManagedNFT(uint256 managedTokenId_) external view override returns (bool) {
        return managedTokensInfo[managedTokenId_].isManaged;
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

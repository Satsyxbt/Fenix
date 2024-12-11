// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {IERC20Upgradeable, SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {BlastGovernorClaimableSetup} from "../../integration/BlastGovernorClaimableSetup.sol";
import {IVotingEscrow} from "../../core/interfaces/IVotingEscrow.sol";
import {IBribeVeFNXRewardToken} from "./interfaces/IBribeVeFNXRewardToken.sol";

/**
 * @title BribeVeFNXRewardToken
 * @notice This contract serves as an intermediary token (brVeFNX) used to facilitate
 * the conversion of FNX rewards into veFNX NFTs via a VotingEscrow contract. Users can
 * receive these intermediary tokens (brVeFNX) when they deposit FNX. When these tokens
 * are transferred to non-whitelisted addresses, they are automatically burned and
 * converted into veFNX NFTs by locking FNX in the VotingEscrow contract. This flow is
 * particularly useful for "bribe" mechanisms, where veFNX positions are desired like bribes
 * without directly managing lock creation and extension.
 */
contract BribeVeFNXRewardToken is IBribeVeFNXRewardToken, ERC20Upgradeable, BlastGovernorClaimableSetup, AccessControlUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Role identifier for entities allowed to mint brVeFNX tokens.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role identifier for addresses exempt from automatic conversion when receiving brVeFNX.
    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");

    /// @notice Address of the VotingEscrow contract which mints veFNX NFTs.
    address public votingEscrow;

    /// @notice Address of the underlying FNX token that gets locked in the VotingEscrow.
    address public underlyingToken;

    /// @notice Parameters used when calling createLockFor() in the VotingEscrow contract.
    CreateLockParams public override createLockParams;

    /**
     * @param blastGovernor_ The address of the BlastGovernor contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract.
     * @dev This function must be called only once. Sets up roles, token name/symbol, and references to VotingEscrow.
     * @param blastGovernor_ The address of the BlastGovernor contract.
     * @param votingEscrow_ The address of the VotingEscrow contract.
     */
    function initialize(address blastGovernor_, address votingEscrow_) external initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __ERC20_init("Bribe VeFNX Reward Token", "brVeFNX");
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        votingEscrow = votingEscrow_;
        underlyingToken = IVotingEscrow(votingEscrow).token();
        createLockParams = CreateLockParams({
            lockDuration: 15724800,
            shouldBoosted: false,
            withPermanentLock: false,
            managedTokenIdForAttach: 0
        });
    }

    /**
     * @notice Updates the parameters used for creating new veFNX locks.
     * @dev Only callable by an address holding the DEFAULT_ADMIN_ROLE.
     *      This function sets new values that dictate how veFNX locks are created when
     *      intermediary tokens are transferred to non-whitelisted addresses.
     * @param createLockParams_ The new parameters specifying lock duration, boosting,
     *                          permanent lock setting, and associated managed token ID.
     *
     * Emits an {UpdateCreateLockParams} event.
     */
    function updateCreateLockParams(CreateLockParams memory createLockParams_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        createLockParams = createLockParams_;
        emit UpdateCreateLockParams(createLockParams_);
    }

    /**
     * @notice Mints brVeFNX tokens in exchange for underlying FNX tokens.
     * @dev The caller must have the MINTER_ROLE. The caller transfers FNX to this contract,
     *      which can later be locked into veFNX when transferred out to non-whitelisted addresses.
     * @param to_ The address to receive the minted brVeFNX tokens.
     * @param amount_ The amount of FNX provided and thus the amount of brVeFNX minted.
     */
    function mint(address to_, uint256 amount_) external override onlyRole(MINTER_ROLE) {
        IERC20Upgradeable(underlyingToken).safeTransferFrom(_msgSender(), address(this), amount_);
        _mint(to_, amount_);
    }

    /**
     * @dev Hook that is called after any token transfer, including minting and burning.
     *      If tokens are transferred to a non-whitelisted address (and the sender is not a minter),
     *      the transferred amount of brVeFNX is immediately burned and converted into a veFNX position
     *      via the VotingEscrow contract.
     *
     * Requirements:
     * - The conversion only occurs if:
     *   - `from_` is not zero and does not have MINTER_ROLE, and
     *   - `to_` is not zero and does not have WHITELIST_ROLE.
     *
     * @param from_ The address sending the tokens.
     * @param to_ The address receiving the tokens.
     * @param amount_ The number of tokens transferred.
     */
    function _afterTokenTransfer(address from_, address to_, uint256 amount_) internal virtual override {
        if (to_ == address(0) || from_ == address(0)) {
            return;
        }

        if (hasRole(MINTER_ROLE, from_) || hasRole(WHITELIST_ROLE, to_)) {
            return;
        }

        _burn(to_, amount_);

        IVotingEscrow votingEscrowCache = IVotingEscrow(votingEscrow);
        IERC20Upgradeable(underlyingToken).safeApprove(address(votingEscrowCache), amount_);

        CreateLockParams memory createLockParamsCache = createLockParams;
        votingEscrowCache.createLockFor(
            amount_,
            createLockParamsCache.lockDuration,
            to_,
            createLockParamsCache.shouldBoosted,
            createLockParamsCache.withPermanentLock,
            createLockParamsCache.managedTokenIdForAttach
        );
    }
}

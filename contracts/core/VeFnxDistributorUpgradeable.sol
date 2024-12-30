// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IVeFnxDistributor} from "./interfaces/IVeFnxDistributor.sol";

import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";

/**
 * @title VeFnxDistributorUpgradeable
 * @notice A contract to distribute veFnx tokens to specified recipients by locking FNX tokens in the Voting Escrow contract.
 * @dev
 *  - Inherits from:
 *      1) IVeFnxDistributor (interface with function signatures for distribution and recovery).
 *      2) AccessControlEnumerableUpgradeable (for role-based access control).
 *      3) BlastGovernorClaimableSetup (for integration with Blast Governor).
 *  - The contract allows authorized roles to set whitelisted "reasons" for airdrops, distribute locked FNX (veFnx),
 *    and recover tokens if needed.
 */
contract VeFnxDistributorUpgradeable is IVeFnxDistributor, AccessControlEnumerableUpgradeable, BlastGovernorClaimableSetup {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @notice Role identifier for accounts allowed to initiate veFnx distributions.
     */
    bytes32 internal constant _DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    /**
     * @notice Role identifier for accounts allowed to recover tokens (withdraw).
     */
    bytes32 internal constant _WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    /**
     * @notice The address of the FNX token contract (to be locked for veFnx).
     */
    address public fenix;

    /**
     * @notice The address of the Voting Escrow contract used to create veFnx.
     */
    address public votingEscrow;

    /**
     * @dev Maps the keccak256 hash of a reason string to a boolean indicating if it is whitelisted.
     */
    mapping(bytes32 => bool) internal _isWhitelistedReasons;

    /// @notice Thrown when the contract's balance of FNX is insufficient for distribution.
    error InsufficientBalance();

    /// @notice Thrown if the recipient address is the zero address.
    error ZeroRecipientAddress();

    /// @notice Thrown if the provided reason is not whitelisted.
    error NotWhitelistedReason();

    /// @notice Thrown if the provided arrayies with diff length.
    error ArrayLengthMismatch();

    /**
     * @notice Constructor that ensures the implementation contract cannot be initialized more than once.
     * @param blastGovernor_ The address of the Blast Governor contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract, setting up the FNX and Voting Escrow addresses and granting admin roles.
     * @param blastGovernor_ The address of the Blast Governor contract.
     * @param fenix_ The address of the FNX token contract (non-zero).
     * @param votingEscrow_ The address of the Voting Escrow contract (non-zero).
     * @dev Grants the DEFAULT_ADMIN_ROLE to the deployer (caller of `initialize`).
     */
    function initialize(address blastGovernor_, address fenix_, address votingEscrow_) external initializer {
        _checkAddressZero(fenix_);
        _checkAddressZero(votingEscrow_);
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __AccessControlEnumerable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        fenix = fenix_;
        votingEscrow = votingEscrow_;
    }

    /**
     * @notice Updates the whitelisting status of multiple airdrop reasons.
     * @param reasons_ An array of reasons to set or unset from the whitelist.
     * @param isWhitelisted_ A matching array of booleans indicating whether each reason is whitelisted.
     * @dev Emitted via {SetWhitelistReasons}.
     */
    function setWhitelistReasons(string[] calldata reasons_, bool[] calldata isWhitelisted_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (reasons_.length != isWhitelisted_.length) {
            revert ArrayLengthMismatch();
        }
        for (uint256 i; i < reasons_.length; ) {
            _isWhitelistedReasons[keccak256(abi.encode(reasons_[i]))] = isWhitelisted_[i];
            unchecked {
                i++;
            }
        }
        emit SetWhitelistReasons(reasons_, isWhitelisted_);
    }

    /**
     * @notice Checks if a given reason is whitelisted.
     * @param reason_ The reason string to check.
     * @return A boolean indicating if the reason is whitelisted.
     */
    function isWhitelistedReason(string memory reason_) public view returns (bool) {
        return _isWhitelistedReasons[keccak256(abi.encode(reason_))];
    }

    /**
     * @notice Distributes veFnx tokens to specified recipients by locking FNX tokens in the Voting Escrow contract.
     * @dev
     *  - Requires the caller to have the `_DISTRIBUTOR_ROLE`.
     *  - Verifies that `reason_` is whitelisted. If not, reverts with {NotWhitelistedReason}.
     *  - Calculates the total sum of FNX tokens needed. If the contract does not have enough, reverts with {InsufficientBalance}.
     *  - Locks FNX in the Voting Escrow for each recipient, creating veFnx positions.
     *  - Emits {AirdropVeFnxTotal} after distributing to all recipients in this batch.
     *  - Emits {AirdropVeFnx} for each individual recipient.
     * @param reason_ A whitelisted string describing the airdrop reason.
     * @param rows_ An array of AirdropRow structs that specify each recipient, lock duration, amount, etc.
     */
    function distributeVeFnx(string memory reason_, AidropRow[] calldata rows_) external override onlyRole(_DISTRIBUTOR_ROLE) {
        if (!isWhitelistedReason(reason_)) {
            revert NotWhitelistedReason();
        }

        IERC20Upgradeable fenixCache = IERC20Upgradeable(fenix);
        IVotingEscrow veCache = IVotingEscrow(votingEscrow);

        uint256 totalDistributionSum;
        for (uint256 i; i < rows_.length; ) {
            if (rows_[i].recipient == address(0)) {
                revert ZeroRecipientAddress();
            }
            totalDistributionSum += rows_[i].amount;
            unchecked {
                i++;
            }
        }

        if (totalDistributionSum > fenixCache.balanceOf(address(this))) revert InsufficientBalance();

        fenixCache.safeApprove(address(veCache), totalDistributionSum);
        for (uint256 i; i < rows_.length; ) {
            AidropRow memory row = rows_[i];
            uint256 tokenId = veCache.createLockFor(
                row.amount,
                row.lockDuration,
                row.recipient,
                false,
                row.withPermanentLock,
                row.managedTokenIdForAttach
            );
            emit AirdropVeFnx(row.recipient, reason_, tokenId, row.amount);
            unchecked {
                i++;
            }
        }

        emit AidropVeFnxTotal(_msgSender(), reason_, totalDistributionSum);
    }

    /**
     * @notice Allows the holder of `_WITHDRAWER_ROLE` to recover tokens from this contract.
     * @dev
     *  - This can be used to retrieve any ERC20 token that was mistakenly sent to this contract.
     * @param token_ The address of the token to recover.
     * @param recoverAmount_ The amount of tokens to recover.
     * @custom:emits RecoverToken
     */
    function recoverTokens(address token_, uint256 recoverAmount_) external override onlyRole(_WITHDRAWER_ROLE) {
        IERC20Upgradeable(token_).safeTransfer(msg.sender, recoverAmount_);
        emit RecoverToken(token_, recoverAmount_);
    }

    /**
     * @notice Checks if the provided address is zero and reverts if it is.
     * @param addr_ The address to check.
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }
}

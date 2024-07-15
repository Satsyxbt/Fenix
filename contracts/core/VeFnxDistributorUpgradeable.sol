// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IVeFnxDistributor} from "./interfaces/IVeFnxDistributor.sol";

import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";

/**
 * @title VeFnx Distributor Upgradeable
 * @dev Contract to distribute veFnx tokens to specified recipients. Inherits functionality for ownership management
 * and integration with Blast Governor. This contract allows the owner to distribute veFnx tokens by locking FNX tokens
 * in the Voting Escrow contract on behalf of recipients for a fixed duration.
 */
contract VeFnxDistributorUpgradeable is IVeFnxDistributor, BlastGovernorClaimableSetup, Ownable2StepUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 internal constant _LOCK_DURATION = 182 days; // Lock duration for veFnx tokens

    address public fenix; // Address of the FNX token contract
    address public votingEscrow; // Address of the Voting Escrow contract

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the VeFnxDistributor with required contract addresses.
     * @param blastGovernor_ Address of the Blast Governor contract.
     * @param fenix_ Address of the FNX token contract.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     * @dev Once initialized, the contract sets up the FNX and Voting Escrow addresses and ensures
     * that they are not zero addresses. Also initializes inherited contracts.
     */
    function initialize(address blastGovernor_, address fenix_, address votingEscrow_) external initializer {
        _checkAddressZero(fenix_);
        _checkAddressZero(votingEscrow_);

        __Ownable2Step_init();
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        fenix = fenix_;
        votingEscrow = votingEscrow_;
    }

    /**
     * @notice Distributes veFnx to the specified recipients by locking FNX tokens on their behalf.
     * @param recipients_ Array of recipient addresses to receive veFnx tokens.
     * @param amounts_ Array of amounts of FNX tokens to be locked for each recipient.
     * @dev Ensures the lengths of the recipients and amounts arrays match, checks for sufficient balance, and locks FNX tokens to distribute veFnx tokens.
     * Emits an `AridropVeFnx` event for each distribution. Resets allowance to zero after distributions.
     */
    function distributeVeFnx(address[] calldata recipients_, uint256[] calldata amounts_) external override onlyOwner {
        if (recipients_.length != amounts_.length) {
            revert ArraysLengthMismatch();
        }

        IERC20Upgradeable fenixCache = IERC20Upgradeable(fenix);
        IVotingEscrow veCache = IVotingEscrow(votingEscrow);

        uint256 totalDistributionSum;

        for (uint256 i; i < amounts_.length; ) {
            totalDistributionSum += amounts_[i];
            unchecked {
                i++;
            }
        }

        if (totalDistributionSum > fenixCache.balanceOf(address(this))) revert InsufficientBalance();

        fenixCache.safeApprove(address(veCache), totalDistributionSum);

        for (uint256 i; i < amounts_.length; ) {
            uint256 tokenId = veCache.create_lock_for_without_boost(amounts_[i], _LOCK_DURATION, recipients_[i]);
            emit AridropVeFnx(recipients_[i], tokenId, _LOCK_DURATION, amounts_[i]);

            unchecked {
                i++;
            }
        }

        fenixCache.safeApprove(address(veCache), 0);
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

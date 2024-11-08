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
    /// @notice Address of the FNX token contract
    address public fenix;

    /// @notice Address of the Voting Escrow contract
    address public votingEscrow;

    /// @notice Indicates that the contract's balance of FNX is insufficient to cover the total distribution.
    error InsufficientBalance();

    /// @notice Indicates that the recipient address is zero.
    error ZeroRecipientAddress();

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     * @param blastGovernor_ Address of the Blast Governor contract.
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
     * @notice Distributes veFnx tokens to specified recipients by locking FNX in the Voting Escrow contract.
     * @param rows_ An array of AidropRow structs representing the recipients and amounts to be distributed.
     * @dev The function locks FNX tokens for each recipient in the Voting Escrow contract, creating veFnx tokens.
     * It checks if the total amount to be distributed is available in the contract's balance.
     * Emits an {AirdropVeFnx} event for each successful distribution.
     * @custom:error ZeroRecipientAddress Thrown if the recipient address is zero.
     * @custom:error InsufficientBalance Thrown if the contract's FNX balance is insufficient for the total distribution.
     */
    function distributeVeFnx(AidropRow[] calldata rows_) external override onlyOwner {
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
                _LOCK_DURATION,
                row.recipient,
                false,
                row.withPermanentLock,
                row.managedTokenIdForAttach
            );
            emit AirdropVeFnx(row.recipient, tokenId, _LOCK_DURATION, row.amount);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Allows the owner to recover tokens mistakenly sent to the contract.
     * @param token_ Address of the token to recover.
     * @param recoverAmount_ Amount of the token to recover.
     * @dev Only callable by the contract owner. Emits a {RecoverToken} event upon success.
     */
    function recoverTokens(address token_, uint256 recoverAmount_) external onlyOwner {
        IERC20Upgradeable(token_).safeTransfer(msg.sender, recoverAmount_);
        emit RecoverToken(token_, recoverAmount_);
    }

    /**
     * @dev Checks if the provided address is zero and reverts with ZeroRecipientAddress error if it is.
     * @param addr_ The address to be checked.
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }
}

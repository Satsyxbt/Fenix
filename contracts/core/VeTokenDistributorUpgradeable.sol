// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IVeTokenDistributor} from "./interfaces/IVeTokenDistributor.sol";

import {ModeSfsSetup} from "../integration/ModeSfsSetup.sol";

/**
 * @title VeToken Distributor Upgradeable
 * @dev Contract to distribute veSOLEX tokens to specified recipients. Inherits functionality for ownership management
 * and integration with Mode SFS. This contract allows the owner to distribute veSOLEX tokens by locking SOLEX tokens
 * in the Voting Escrow contract on behalf of recipients for a fixed duration.
 */
contract VeTokenDistributorUpgradeable is IVeTokenDistributor, ModeSfsSetup, Ownable2StepUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 internal constant _LOCK_DURATION = 182 days; // Lock duration for veSOLEX tokens

    address public token; // Address of the SOLEX token contract
    address public votingEscrow; // Address of the Voting Escrow contract

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the VeTokenDistributor with required contract addresses.
     * @param modeSfs_ Address of the Mode SFS contract.
     * @param sfsAssignTokenId_ The token ID for SFS assignment.
     * @param token_ Address of the SOLEX token contract.
     * @param votingEscrow_ Address of the Voting Escrow contract.
     * @dev Once initialized, the contract sets up the SOLEX and Voting Escrow addresses and ensures
     * that they are not zero addresses. Also initializes inherited contracts.
     */
    function initialize(address modeSfs_, uint256 sfsAssignTokenId_, address token_, address votingEscrow_) external initializer {
        __Ownable2Step_init();
        __ModeSfsSetup__init(modeSfs_, sfsAssignTokenId_);

        _checkAddressZero(token_);
        _checkAddressZero(votingEscrow_);

        token = token_;
        votingEscrow = votingEscrow_;
    }

    /**
     * @notice Distributes veSOLEX to the specified recipients by locking SOLEX tokens on their behalf.
     * @param recipients_ Array of recipient addresses to receive veSOLEX tokens.
     * @param amounts_ Array of amounts of SOLEX tokens to be locked for each recipient.
     * @dev Ensures the lengths of the recipients and amounts arrays match, checks for sufficient balance, and locks SOLEX tokens to distribute veSOLEX tokens.
     * Emits an `AirdropVeToken` event for each distribution. Resets allowance to zero after distributions.
     */
    function distributeVeToken(address[] calldata recipients_, uint256[] calldata amounts_) external override onlyOwner {
        if (recipients_.length != amounts_.length) {
            revert ArraysLengthMismatch();
        }

        IERC20Upgradeable tokenCache = IERC20Upgradeable(token);
        IVotingEscrow veCache = IVotingEscrow(votingEscrow);

        uint256 totalDistributionSum;

        for (uint256 i; i < amounts_.length; ) {
            totalDistributionSum += amounts_[i];
            unchecked {
                i++;
            }
        }

        if (totalDistributionSum > tokenCache.balanceOf(address(this))) revert InsufficientBalance();

        tokenCache.safeApprove(address(veCache), totalDistributionSum);

        for (uint256 i; i < amounts_.length; ) {
            uint256 tokenId = veCache.create_lock_for_without_boost(amounts_[i], _LOCK_DURATION, recipients_[i]);
            emit AirdropVeToken(recipients_[i], tokenId, _LOCK_DURATION, amounts_[i]);

            unchecked {
                i++;
            }
        }

        tokenCache.safeApprove(address(veCache), 0);
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

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IMinimalLinearVesting} from "./interfaces/IMinimalLinearVesting.sol";

/**
 * @title MinimalLinearVestingUpgradeable
 * @dev This contract manages linear token vesting with claim functionality.
 * The contract allows the owner to set wallet allocations, update vesting parameters,
 * and users can claim their vested tokens over time.
 */
contract MinimalLinearVestingUpgradeable is IMinimalLinearVesting, OwnableUpgradeable, BlastGovernorClaimableSetup {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @notice The token address for the vested token.
     * @dev This is the ERC20 token that will be vested and claimed by users.
     */
    address public override token;

    /**
     * @notice The timestamp when the vesting period starts.
     * @dev Vesting will begin at this timestamp, and users will be able to claim tokens accordingly.
     */
    uint256 public override startTimestamp;

    /**
     * @notice The duration of the vesting period in seconds.
     * @dev This defines how long the vesting period lasts after the `startTimestamp`.
     */
    uint256 public override duration;

    /**
     * @notice The total amount of tokens that have been allocated to all wallets.
     * @dev This value represents the sum of all tokens allocated across all wallets,
     * which is used to ensure that the contract maintains enough tokens to satisfy all allocations.
     */
    uint256 public totalAllocated;

    /**
     * @notice Mapping that stores the token allocation for each wallet.
     */
    mapping(address wallet => uint256) public override allocation;

    /**
     * @notice Mapping that stores the claimed amount of tokens for each wallet.
     */
    mapping(address wallet => uint256) public override claimed;

    /**
     * @notice Thrown when an action is not allowed during the claim phase.
     * @dev This error is triggered when trying to perform restricted actions after the vesting period has started.
     */
    error NotAvailableDuringClaimPhase();

    /**
     * @notice Thrown when the claim phase has not started yet.
     * @dev This error occurs when a user attempts to claim tokens before the vesting start time.
     */
    error ClaimPhaseNotStarted();

    /**
     * @notice Thrown when the amount available for claim is zero.
     * @dev This error is triggered when a user attempts to claim tokens but has no tokens available for claim.
     */
    error ZeroClaimAmount();

    /**
     * @notice Thrown when the lengths of arrays provided do not match.
     */
    error ArrayLengthMismatch();

    /**
     * @dev Modifier to restrict actions that cannot be performed during the claim phase.
     * Reverts with `NotAvailableDuringClaimPhase` if vesting has already started.
     */
    modifier onlyNotDuringClaimPhase() {
        if (startTimestamp > 0 && startTimestamp < block.timestamp) {
            revert NotAvailableDuringClaimPhase();
        }
        _;
    }

    /**
     * @dev Constructor to initialize the contract with the Blast Governor address.
     * @param blastGovernor_ The address of the Blast Governor contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the vesting contract.
     * @dev This function can only be called once, during the initialization phase.
     * @param blastGovernor_ The address of the Blast Governor contract.
     * @param token_ The address of the token to be vested.
     * @param startTimestamp_ The timestamp when vesting starts.
     * @param duration_ The duration of the vesting period in seconds.
     */
    function initialize(address blastGovernor_, address token_, uint256 startTimestamp_, uint256 duration_) external initializer {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __Ownable_init();
        token = token_;
        startTimestamp = startTimestamp_;
        duration = duration_;
        emit UpdateVestingParams(startTimestamp_, duration_);
    }

    /**
     * @notice Sets the token allocation for multiple wallets.
     * @dev Can only be called by the owner and before the vesting has started.
     * Reverts with `NotAvailableDuringClaimPhase` if vesting has started.
     * Reverts with `ArrayLengthMismatch` if the lengths of `wallets_` and `amounts_` do not match or if they are empty.
     * The total allocated amount is adjusted based on the changes in the wallet allocations.
     * If the current balance exceeds the new allocation, the excess tokens are transferred to the owner.
     * If the current balance is less than the new allocation, the owner must transfer the difference to the contract.
     * @param wallets_ The array of wallet addresses.
     * @param amounts_ The array of token amounts allocated to each wallet.
     */
    function setWalletsAllocation(
        address[] calldata wallets_,
        uint256[] calldata amounts_
    ) external override onlyOwner onlyNotDuringClaimPhase {
        if (wallets_.length != amounts_.length || wallets_.length == 0) {
            revert ArrayLengthMismatch();
        }
        uint256 newTotalAllocated = totalAllocated;
        for (uint256 i; i < wallets_.length; ) {
            newTotalAllocated -= allocation[wallets_[i]];
            newTotalAllocated += amounts_[i];
            allocation[wallets_[i]] = amounts_[i];
            unchecked {
                i++;
            }
        }
        uint256 currentBalance = IERC20Upgradeable(token).balanceOf(address(this));
        if (currentBalance > newTotalAllocated) {
            IERC20Upgradeable(token).safeTransfer(msg.sender, currentBalance - newTotalAllocated);
        } else if (currentBalance < newTotalAllocated) {
            IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), newTotalAllocated - currentBalance);
        }
        totalAllocated = newTotalAllocated;
        emit UpdateWalletsAllocation(wallets_, amounts_);
    }

    /**
     * @notice Updates the vesting parameters such as the start timestamp and duration.
     * @dev Can only be called by the owner.
     * @param startTimestamp_ The new vesting start timestamp.
     * @param duration_ The new duration of the vesting in seconds.
     */
    function setVestingParams(uint256 startTimestamp_, uint256 duration_) external override onlyOwner onlyNotDuringClaimPhase {
        startTimestamp = startTimestamp_;
        duration = duration_;
        emit UpdateVestingParams(startTimestamp_, duration_);
    }

    /**
     * @notice Allows users to claim their vested tokens.
     * @dev Reverts with `ClaimPhaseNotStarted` if the vesting period has not started yet.
     * Reverts with `ZeroClaimAmount` if there are no tokens available for claim.
     */
    function claim() external override {
        if (!isClaimPhase()) {
            revert ClaimPhaseNotStarted();
        }
        uint256 availableForClaim = getAvailableForClaim(msg.sender);
        if (availableForClaim == 0) {
            revert ZeroClaimAmount();
        }
        claimed[msg.sender] += availableForClaim;
        IERC20Upgradeable(token).safeTransfer(msg.sender, availableForClaim);
        emit Claim(msg.sender, availableForClaim);
    }

    /**
     * @notice Returns the amount of tokens available for claim for a given wallet.
     * @param wallet_ The address of the wallet to check.
     * @return The amount of tokens available for claim.
     * @dev This function calculates the unlocked tokens based on the elapsed time and vesting schedule.
     */
    function getAvailableForClaim(address wallet_) public view override returns (uint256) {
        return calculateUnlockAmount(allocation[wallet_], startTimestamp, block.timestamp, duration) - claimed[wallet_];
    }

    /**
     * @notice Returns whether the claim phase has started.
     * @dev The claim phase starts when the current timestamp is greater than or equal to the `startTimestamp`.
     * @return True if the claim phase has started, false otherwise.
     */
    function isClaimPhase() public view override returns (bool) {
        uint256 start = startTimestamp;
        return start > 0 && block.timestamp >= start;
    }

    /**
     * @notice Calculates the unlocked amount of tokens based on the vesting schedule.
     * @param amount_ The total amount allocated to the wallet.
     * @param startTimestamp_ The timestamp when the vesting started.
     * @param currentTimestamp_ The current block timestamp.
     * @param duration_ The vesting duration.
     * @return The amount of unlocked tokens based on the elapsed time.
     * @dev The calculation is based on the time passed since the start of the vesting period and the total duration.
     */
    function calculateUnlockAmount(
        uint256 amount_,
        uint256 startTimestamp_,
        uint256 currentTimestamp_,
        uint256 duration_
    ) public pure returns (uint256) {
        if (currentTimestamp_ < startTimestamp_) {
            return 0;
        }
        if (currentTimestamp_ >= startTimestamp_ + duration_) {
            return amount_;
        }
        uint256 unlockPercentage = ((currentTimestamp_ - startTimestamp_) * 1e18) / duration_;
        return (amount_ * unlockPercentage) / 1e18;
    }
}

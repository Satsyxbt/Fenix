// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IRewardReciever} from "./interfaces/IRewardReciever.sol";
import {IPerpetualsGauge} from "./interfaces/IPerpetualsGauge.sol";

/**
 * @title PerpetualsGaugeUpgradeable
 * @dev This contract manages reward distribution in a gauge system for perpetual traders.
 *  It integrates with the BlastGovernorClaimableSetup and implements
 *  reentrancy protection and ownable functionalities.
 */
contract PerpetualsGaugeUpgradeable is IPerpetualsGauge, BlastGovernorClaimableSetup, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice The address of the reward token
    address public override rewardToken;

    /// @notice The address of the reward receiver contract
    address public override rewarder;

    /// @notice The address authorized to distribute rewards
    address public override DISTRIBUTION;

    /// @notice The name of the gauge
    string public override NAME;

    /**
     * @dev Error thrown when the provided reward token address is incorrect.
     */
    error IncorrectRewardToken();

    /**
     * @dev Error thrown when an unauthorized address attempts to access restricted functionality.
     */
    error AccessDenied();

    /**
     * @dev Modifier to check if the caller is the authorized voter.
     */
    modifier onlyVoter() {
        if (_msgSender() != DISTRIBUTION) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Initializes the contract and disables initializers.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with the given parameters.
     * @param blastGovernor_ The address of the BlastGovernor.
     * @param rewardToken_ The address of the reward token.
     * @param voter_ The address authorized to distribute rewards.
     * @param rewarder_ The address of the reward receiver contract.
     * @param name_ The name of the gauge.
     */
    function initialize(
        address blastGovernor_,
        address rewardToken_,
        address voter_,
        address rewarder_,
        string memory name_
    ) external initializer {
        _checkAddressZero(rewardToken_);
        _checkAddressZero(voter_);
        _checkAddressZero(rewarder_);

        __BlastGovernorClaimableSetup_init(blastGovernor_);
        __ReentrancyGuard_init();
        __Ownable_init();

        rewardToken = rewardToken_;
        rewarder = rewarder_;
        DISTRIBUTION = voter_;
        NAME = name_;
    }

    /**
     * @notice Notifies the contract of the reward amount to be distributed.
     * @param token_ The address of the reward token.
     * @param rewardAmount_ The amount of reward tokens to be distributed.
     */
    function notifyRewardAmount(address token_, uint256 rewardAmount_) external override nonReentrant onlyVoter {
        if (token_ != rewardToken) {
            revert IncorrectRewardToken();
        }

        IERC20Upgradeable token = IERC20Upgradeable(token_);
        IERC20Upgradeable(token).safeTransferFrom(DISTRIBUTION, address(this), rewardAmount_);

        IRewardReciever rewarderCache = IRewardReciever(rewarder);

        IERC20Upgradeable(token).safeApprove(address(rewarderCache), rewardAmount_);

        rewarderCache.notifyRewardAmount(token_, rewardAmount_);
        emit RewardAdded(rewardAmount_);
    }

    /**
     * @notice Claims the fees for the internal_bribe.
     * @return claimed0 The amount of the first token claimed.
     * @return claimed1 The amount of the second token claimed.
     */
    function claimFees() external override returns (uint256 claimed0, uint256 claimed1) {
        return (0, 0);
    }

    /**
     * @notice Gets the reward for a specific account.
     * @param user_ The address of the account to get the reward for.
     */
    function getReward(address user_) external override {}

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

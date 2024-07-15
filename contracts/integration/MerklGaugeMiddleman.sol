// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IDistributionCreator, DistributionParameters} from "./interfaces/IDistributionCreator.sol";
import {IMerklGaugeMiddleman} from "./interfaces/IMerklGaugeMiddleman.sol";
import {IPairIntegrationInfo} from "./interfaces/IPairIntegrationInfo.sol";
import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";

/**
 * @title Merkl Gauge Middleman Contract
 * @dev This contract acts as a middleman between Gauges and the DistributionCreator,
 * facilitating the reward distribution process. It allows setting up distribution parameters
 * for each gauge, adjusting token allowance, and notifying about rewards.
 *
 * This version is a modified implementation based on the MerklGaugeMiddleman contract from Angle Protocol.
 * See original implementation at: https://github.com/AngleProtocol/merkl-contracts/blob/main/contracts/middleman/MerklGaugeMiddleman.sol
 *
 * The contract uses OpenZeppelin's Ownable for ownership management and SafeERC20 for safe ERC20 interactions.
 */
contract MerklGaugeMiddleman is IMerklGaugeMiddleman, BlastGovernorClaimableSetup, Ownable {
    using SafeERC20 for IERC20;

    // Mapping of each gauge to its reward distribution parameters
    mapping(address => DistributionParameters) public gaugeParams;

    // token interface
    IERC20 public token;

    // Distribution creator contract interface
    IDistributionCreator public merklDistributionCreator;

    // =================================== EVENT ===================================

    constructor(address blastGovernor_, address token_, address merklDistributionCreator_) {
        if (token_ == address(0) || merklDistributionCreator_ == address(0)) {
            revert AddressZero();
        }
        __BlastGovernorClaimableSetup_init(blastGovernor_);

        token = IERC20(token_);
        merklDistributionCreator = IDistributionCreator(merklDistributionCreator_);

        IERC20(token_).safeIncreaseAllowance(merklDistributionCreator_, type(uint256).max);
    }

    // ============================= EXTERNAL FUNCTIONS ============================

    /// @notice Restores the allowance for the token to the `DistributionCreator` contract
    /// Depending on the token implementation, not needed for Fenix implementations
    function setFenixAllowance() external {
        IERC20 fenixCache = token;
        address creator = address(merklDistributionCreator);
        uint256 currentAllowance = fenixCache.allowance(address(this), creator);
        if (currentAllowance < type(uint256).max) fenixCache.safeIncreaseAllowance(creator, type(uint256).max - currentAllowance);
    }

    /**
     * @dev Sets the reward distribution parameters for a specific gauge. Only callable by the contract owner.
     * Ensures the gauge and reward token addresses are valid and that the reward token is whitelisted.
     *
     * @param gauge_ Address of the gauge for which to set the parameters
     * @param params_ DistributionParameters struct containing the reward distribution settings
     */
    function setGauge(address gauge_, DistributionParameters memory params_) external onlyOwner {
        IDistributionCreator creator = merklDistributionCreator;
        if (gauge_ == address(0) || params_.rewardToken != address(token) || creator.rewardTokenMinAmounts(params_.rewardToken) == 0)
            revert InvalidParams();

        gaugeParams[gauge_] = params_;

        emit GaugeSet(gauge_);
    }

    /**
     * @dev Notifies the DistributionCreator about the reward for a specific gauge. Can be called by any contract.
     * It's an override of the IMerklGaugeMiddleman interface.
     *
     * @param gauge_ Address of the gauge to notify
     * @param amount_ Amount of the reward
     */
    function notifyReward(address gauge_, uint256 amount_) external virtual override {
        _notifyReward(gauge_, amount_);
    }

    /**
     * @dev Transfers tokens from the caller and notifies the DistributionCreator about the reward.
     * This function allows combining the transfer and notification into a single transaction.
     *
     * @param gauge_ Address of the gauge to notify
     * @param amount_ Amount of tokens to transfer and notify about
     */
    function notifyRewardWithTransfer(address gauge_, uint256 amount_) external virtual override {
        token.safeTransferFrom(msg.sender, address(this), amount_);
        _notifyReward(gauge_, amount_);
    }

    /**
     * @dev Internal function to handle the notification logic. Validates the gauge parameters and amount,
     * then either creates a distribution or refunds the tokens if the amount is below the minimum threshold.
     *
     * @param gauge_ Address of the gauge to notify
     * @param amount_ Amount of tokens to use for the distribution
     */
    function _notifyReward(address gauge_, uint256 amount_) internal {
        DistributionParameters memory params = gaugeParams[gauge_];
        if (params.uniV3Pool == address(0)) revert InvalidParams();

        IERC20 tokenChache = token;

        if (amount_ == 0) amount_ = tokenChache.balanceOf(address(this));

        if (amount_ > 0) {
            params.epochStart = uint32(block.timestamp);
            params.amount = amount_;

            IDistributionCreator creatorCache = merklDistributionCreator;
            if (amount_ > creatorCache.rewardTokenMinAmounts(address(tokenChache)) * params.numEpoch) {
                uint256 distributionAmount = creatorCache.createDistribution(params);
                emit CreateDistribution(msg.sender, gauge_, amount_, distributionAmount);
            } else {
                tokenChache.safeTransfer(msg.sender, amount_);
            }
        }
    }
}

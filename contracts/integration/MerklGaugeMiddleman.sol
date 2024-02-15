// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IDistributionCreator, DistributionParameters} from "./interfaces/IDistributionCreator.sol";
import {IMerklGaugeMiddleman} from "./interfaces/IMerklGaugeMiddleman.sol";
import {IPairIntegrationInfo} from "./interfaces/IPairIntegrationInfo.sol";
import {BlastGovernorSetup} from "./BlastGovernorSetup.sol";

/**
 * @title Merkl Gauge Middleman Contract
 * @dev This contract acts as a middleman between Fenix Gauges and the DistributionCreator,
 * facilitating the reward distribution process. It allows setting up distribution parameters
 * for each gauge, adjusting FENIX token allowance, and notifying about rewards.
 *
 * This version is a modified implementation based on the MerklGaugeMiddleman contract from Angle Protocol.
 * See original implementation at: https://github.com/AngleProtocol/merkl-contracts/blob/main/contracts/middleman/MerklGaugeMiddleman.sol
 *
 * The contract uses OpenZeppelin's Ownable for ownership management and SafeERC20 for safe ERC20 interactions.
 */
contract MerklGaugeMiddleman is IMerklGaugeMiddleman, BlastGovernorSetup, Ownable {
    using SafeERC20 for IERC20;

    // Mapping of each gauge to its reward distribution parameters
    mapping(address => DistributionParameters) public gaugeParams;

    // FENIX token interface
    IERC20 public fenix;

    // Distribution creator contract interface
    IDistributionCreator public merklDistributionCreator;

    // =================================== EVENT ===================================

    constructor(address governor_, address fenix_, address merklDistributionCreator_) {
        __BlastGovernorSetup_init(governor_);

        if (fenix_ != address(0) || merklDistributionCreator_ != address(0)) {
            revert ZeroAddress();
        }

        fenix = IERC20(fenix_);
        merklDistributionCreator = IDistributionCreator(merklDistributionCreator_);

        IERC20(fenix_).safeIncreaseAllowance(merklDistributionCreator_, type(uint256).max);
    }

    // ============================= EXTERNAL FUNCTIONS ============================

    /// @notice Restores the allowance for the FENIX token to the `DistributionCreator` contract
    function setFenixAllowance() external {
        IERC20 fenixCache = fenix;
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
        if (
            gauge_ == address(0) ||
            params_.rewardToken != address(fenix) ||
            (creator.isWhitelistedToken(IPairIntegrationInfo(params_.uniV3Pool).token0()) == 0 &&
                creator.isWhitelistedToken(IPairIntegrationInfo(params_.uniV3Pool).token1()) == 0)
        ) revert InvalidParams();

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
     * @dev Transfers FENIX tokens from the caller and notifies the DistributionCreator about the reward.
     * This function allows combining the transfer and notification into a single transaction.
     *
     * @param gauge_ Address of the gauge to notify
     * @param amount_ Amount of FENIX tokens to transfer and notify about
     */
    function notifyRewardWithTransfer(address gauge_, uint256 amount_) external virtual override {
        fenix.safeTransferFrom(msg.sender, address(this), amount_);
        _notifyReward(gauge_, amount_);
    }

    /**
     * @dev Internal function to handle the notification logic. Validates the gauge parameters and amount,
     * then either creates a distribution or refunds the FENIX tokens if the amount is below the minimum threshold.
     *
     * @param gauge_ Address of the gauge to notify
     * @param amount_ Amount of FENIX tokens to use for the distribution
     */
    function _notifyReward(address gauge_, uint256 amount_) internal {
        DistributionParameters memory params = gaugeParams[gauge_];
        if (params.uniV3Pool == address(0)) revert InvalidParams();

        IERC20 fenixCache = fenix;

        if (amount_ == 0) amount_ = fenixCache.balanceOf(address(this));

        params.epochStart = uint32(block.timestamp);
        params.amount = amount_;

        IDistributionCreator creator = merklDistributionCreator;
        if (amount_ > 0) {
            if (amount_ > creator.rewardTokenMinAmounts(address(fenixCache)) * params.numEpoch) {
                uint256 distributionAmount = creator.createDistribution(params);
                emit CreateDistribution(msg.sender, gauge_, amount_, distributionAmount);
            } else {
                fenixCache.safeTransfer(msg.sender, amount_);
            }
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {IBaseGaugeUpgradeable} from "./IBaseGaugeUpgradeable.sol";

interface ICLGaugeUpgradeable is IBaseGaugeUpgradeable {
    function initialize(
        address rewardToken_,
        address votingEscrow_,
        address token_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        address feeVault_
    ) external;

    function setFeeVault(address) external;
}

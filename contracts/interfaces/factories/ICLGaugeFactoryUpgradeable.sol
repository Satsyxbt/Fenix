// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

interface ICLGaugeFactoryUpgradeable is IBeacon {
    event CreateGauge(address indexed caller, address indexed gauge);
    event UpdateDistributionForGauge(address indexed gauge, address indexed newDistribution);

    function createGauge(
        address rewardToken_,
        address votingEscrow_,
        address token_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        bool isPair_
    ) external returns (address);

    function setDistribution(address gauge_, address newDistribution_) external;

    function initialize(address gaugeImplementation_) external;
}

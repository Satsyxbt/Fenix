// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {ICLGaugeFactoryUpgradeable} from "../interfaces/factories/ICLGaugeFactoryUpgradeable.sol";
import {IGaugeUpgradeable} from "../interfaces/IGaugeUpgradeable.sol";

import {BaseFactoryUpgradeable} from "./BaseFactoryUpgradeable.sol";

contract CLGaugeFactoryUpgradeable is ICLGaugeFactoryUpgradeable, BaseFactoryUpgradeable {
    address public lastGauge;

    address[] internal _gauges;

    constructor() {
        _disableInitializers();
    }

    function initialize(address gaugesImplementation_) external virtual override initializer {
        __Base_Factory_init(gaugesImplementation_);
    }

    function createGauge(
        address rewardToken_,
        address votingEscrow_,
        address token_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        bool isPair_
    ) external virtual override returns (address) {
        // @TODO Should deploy CLVaultFee for integrate ICHI
        address newGaugeProxy = address(
            new BeaconProxy(
                address(this),
                abi.encodeWithSelector(
                    IGaugeUpgradeable.initialize.selector,
                    rewardToken_,
                    votingEscrow_,
                    token_,
                    distribution_,
                    internalBribe_,
                    externalBribe_,
                    isPair_
                    // @TODO Should also provide paramaters for support integrate ICHI
                )
            )
        );

        emit CreateGauge(msg.sender, newGaugeProxy);
        return newGaugeProxy;
    }

    function setDistribution(address gauge_, address newDistribution_) external virtual override {
        IGaugeUpgradeable(gauge_).setDistribution(newDistribution_);
        emit UpdateDistributionForGauge(gauge_, newDistribution_);
    }

    function length() external view returns (uint256) {
        return _gauges.length;
    }

    function list(uint256 offset_, uint256 limit_) external view returns (address[] memory) {
        uint256 totalGauges = _gauges.length;
        if (offset_ >= totalGauges) {
            return new address[](0);
        }
        uint256 numElements = limit_;
        if (offset_ + limit_ > totalGauges) {
            numElements = totalGauges - offset_;
        }
        address[] memory gaugeSubset = new address[](numElements);
        for (uint256 i; i < numElements; ) {
            gaugeSubset[i] = _gauges[offset_ + i];
            unchecked {
                i++;
            }
        }
        return gaugeSubset;
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

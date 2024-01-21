// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IRewarder} from "../interfaces/IRewarder.sol";
import {IPair} from "../interfaces/external/IPair.sol";
import {IGaugeUpgradeable} from "../interfaces/gauges/IGaugeUpgradeable.sol";
import {IBribeUpgradeable} from "../interfaces/IBribeUpgradeable.sol";

import {BaseGaugeUpgradeable} from "./BaseGaugeUpgradeable.sol";

contract GaugeUpgradeable is IGaugeUpgradeable, BaseGaugeUpgradeable {
    using SafeERC20 for IERC20;
    bool public isForPair;

    /**
     * @dev Initializes the contract by disabling initializers to prevent the implementation contract
     * from being misused.
     */
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address rewardToken_,
        address votingEscrow_,
        address depositToken_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        bool isForPair_
    ) external virtual override initializer {
        __BaseGaugeUpgradeable_init(rewardToken_, votingEscrow_, depositToken_, distribution_, internalBribe_, externalBribe_);
        isForPair = isForPair_;
    }

    function _claimFees() internal virtual override returns (uint256 claimed0, uint256 claimed1) {
        if (!isForPair) {
            return (0, 0);
        }
        return super._claimFees();
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

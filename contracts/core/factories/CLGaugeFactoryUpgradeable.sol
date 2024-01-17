// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {ICLGaugeFactoryUpgradeable, IGaugeFactoryUpgradeable} from "../interfaces/factories/ICLGaugeFactoryUpgradeable.sol";
import {ICLGaugeUpgradeable} from "../interfaces/gauges/ICLGaugeUpgradeable.sol";
import {IPermissionsRegistry} from "../interfaces/IPermissionsRegistry.sol";

import {CLFeesVault} from "../CLFeesVault.sol";
import {GaugeFactoryUpgradeable} from "./GaugeFactoryUpgradeable.sol";

/**
 * @title CLGaugeFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev This contract creates and manages gauges contracts
 *      Inherits from GaugeFactoryUpgradeable for factory patterns,
 *      respectively. It is a variant of BeaconUpgrade, providing the implementation address of the deployed gauges,
 *      as well as a mechanism for updating the implementation of all gauges
 */
contract CLGaugeFactoryUpgradeable is ICLGaugeFactoryUpgradeable, GaugeFactoryUpgradeable {
    /**
     * @dev Stores the address of the last created fee vault contract for last created gauge.
     */
    address public override lastFeeVault;

    /**
     * @dev Creates a new gauge contract.
     *
     * Can be called by any one
     *
     * Emits an {GaugeCreate} event with new gauge and feeVault addresses
     *
     * @param rewardToken_ Address of the reward token.
     * @param votingEscrow_ Address of the voting escrow contract.
     * @param token_ Address of LP or Vault pool.
     * @param distribution_ Address of the distribution contract - Voter.
     * @param internalBribe_ Address of the internal bribe contract.
     * @param externalBribe_ Address of the external bribe contract.
     *
     * isPair_ Flag indicating whether the gauge is for a token pair. not used in CLGaugeUpgradeable
     *
     * @return Address of the newly created gauge contract.
     */
    function createGauge(
        address rewardToken_,
        address votingEscrow_,
        address token_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        bool /* isPair_ */
    ) external virtual override(GaugeFactoryUpgradeable, IGaugeFactoryUpgradeable) returns (address) {
        address newFeeVault = address(new CLFeesVault(token_, address(permissionsRegistry), distribution_));
        address newGaugeProxy = address(
            new BeaconProxy(
                address(this),
                abi.encodeWithSelector(
                    ICLGaugeUpgradeable.initialize.selector,
                    rewardToken_,
                    votingEscrow_,
                    token_,
                    distribution_,
                    internalBribe_,
                    externalBribe_,
                    newFeeVault
                )
            )
        );

        lastFeeVault = newFeeVault;
        lastGauge = newGaugeProxy;

        _gauges.push(newGaugeProxy);

        emit GaugeCreated(newGaugeProxy, newFeeVault);
        return newGaugeProxy;
    }

    /**
     * @dev Sets the ClFeesVault for a batch of gauge contracts.
     *
     * Requirements:
     * - Only callable by a user with 'GAUGE_ADMIN' role.
     *
     * @param gauges_ Array of gauge contract addresses.
     * @param vault_ Address of the fee vault to be set for each gauge.
     */
    function setGaugeFeeVault(address[] calldata gauges_, address vault_) external virtual override onlyAllowed {
        for (uint256 i; i < gauges_.length; ) {
            ICLGaugeUpgradeable(gauges_[i]).setFeeVault(vault_);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

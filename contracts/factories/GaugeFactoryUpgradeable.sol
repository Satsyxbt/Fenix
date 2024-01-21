// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {BeaconProxy} from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {IGaugeFactoryUpgradeable} from "../interfaces/factories/IGaugeFactoryUpgradeable.sol";
import {IGaugeUpgradeable} from "../interfaces/gauges/IGaugeUpgradeable.sol";
import {IPermissionsRegistry} from "../interfaces/IPermissionsRegistry.sol";

import {CLFeesVault} from "../CLFeesVault.sol";
import {BaseFactoryUpgradeable} from "./BaseFactoryUpgradeable.sol";

/**
 * @title GaugeFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev This contract creates and manages gauges contracts
 *      Inherits from BaseFactoryUpgradeable for factory patterns,
 *      respectively. It is a variant of BeaconUpgrade, providing the implementation address of the deployed gauges,
 *      as well as a mechanism for updating the implementation of all gauges
 */
contract GaugeFactoryUpgradeable is IGaugeFactoryUpgradeable, BaseFactoryUpgradeable {
    /**
     * @dev Stores the address of the last created gauge contract.
     */
    address public override lastGauge;

    /**
     * @dev Reference to the permissions registry contract.
     * This contract manages various roles and permissions within the ecosystem.
     */
    IPermissionsRegistry public permissionsRegistry;

    /**
     * @dev An array storing addresses of all the gauges contracts created.
     */
    address[] internal _gauges;

    /**
     * @dev Modifier to restrict function access to either addresses with the 'GAUGE_ADMIN' role.
     * Checks if the message sender has the 'GAUGE_ADMIN' role in the permissions registry.
     * Reverts with 'AccessDenied' custom error if the conditions are not met.
     */
    modifier onlyAllowed() {
        if (!permissionsRegistry.hasRole("GAUGE_ADMIN", msg.sender)) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Modifier to restrict access to the function, with the call allowed from the EmergencyCouncil
     * Checks if the sender of the message has 'EmergencyCouncil' in the permission registry.
     * Returns a custom error 'AccessDenied' if the conditions are not met.
     */
    modifier emergencyCouncil() {
        if (permissionsRegistry.emergencyCouncil() != msg.sender) {
            revert AccessDenied();
        }
        _;
    }

    /**
     * @dev Modifier to check that address is not the zero address.
     * Checks if the provided address is the zero address and reverts with 'ZeroAddress' error if it is.
     */
    modifier notZero(address addr_) {
        if (addr_ == address(0)) {
            revert ZeroAddress();
        }
        _;
    }

    /**
     * @dev Initializes the contract by disabling initializers to prevent the implementation contract
     * from being misused.
     */
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with necessary components and initial configuration.
     *
     * This function sets the initial state of the contract, including the addresses of key contracts
     * within the Fenix ecosystem and initial gauges implementation.
     *
     * @param permissionsRegistry_ The address of the Permissions Registry contract, used to manage access and roles.
     * @param gaugesImplementation_ The implementation address for the gauge contracts created by this factory.
     */
    function initialize(
        address permissionsRegistry_,
        address gaugesImplementation_
    ) external virtual override notZero(permissionsRegistry_) initializer {
        __Base_Factory_init(gaugesImplementation_);
        permissionsRegistry = IPermissionsRegistry(permissionsRegistry_);
    }

    /**
     * @dev Upgrades the gauges to a new implementation.
     *
     * Requirements:
     *
     * - msg.sender must be the GAUGE_ADMIN.
     * - `newImplementation` must be a contract.
     */
    function upgradeProxiesTo(address newImplementation_) external virtual override onlyAllowed {
        _setImplementation(newImplementation_);
    }

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
        bool isForPair_
    ) external virtual override returns (address) {
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
                    isForPair_
                )
            )
        );

        lastGauge = newGaugeProxy;

        _gauges.push(newGaugeProxy);

        emit GaugeCreated(newGaugeProxy);
        return newGaugeProxy;
    }

    /**
     * @dev Activates emergency mode for a batch of gauges.
     *
     * Requirements:
     * - Only callable by the emergency council.
     *
     * @param gauges_ Array of gauge contract addresses for which to activate emergency mode.
     */
    function activateEmergencyMode(address[] calldata gauges_) external virtual override emergencyCouncil {
        for (uint256 i; i < gauges_.length; ) {
            IGaugeUpgradeable(gauges_[i]).activateEmergencyMode();
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Stops emergency mode for a batch of gauges.
     *
     * Requirements:
     * - Only callable by the emergency council.
     *
     * @param gauges_ Array of gauge contract addresses for which to stop emergency mode.
     */
    function stopEmergencyMode(address[] calldata gauges_) external virtual override emergencyCouncil {
        for (uint256 i; i < gauges_.length; ) {
            IGaugeUpgradeable(gauges_[i]).stopEmergencyMode();
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Sets the permissions registry address for the gauge factory.
     *
     * Emits an {SetPermissionRegistry} event with new permission registry address
     *
     * Requirements:
     * - Can only be called by the contract owner.
     * - `permissionsRegistry_` cannot be the zero address.
     *
     * @param permissionsRegistry_ The new permissions registry address.
     */
    function setPermissionsRegistry(address permissionsRegistry_) external virtual override onlyAllowed notZero(permissionsRegistry_) {
        permissionsRegistry = IPermissionsRegistry(permissionsRegistry_);
        emit SetPermissionRegistry(permissionsRegistry_);
    }

    /**
     * @dev Sets the rewarder pid for a batch of gauge contracts.
     *
     * Requirements:
     * - Only callable by a user with 'GAUGE_ADMIN' role.
     * - Length of `gauges_` and `pids_` arrays must match.
     *
     * @param gauges_ Array of gauge contract addresses.
     * @param pids_ Array of pid for rewarders corresponding to each gauge.
     */
    function setRewarderPid(address[] calldata gauges_, uint256[] calldata pids_) external virtual override onlyAllowed {
        if (gauges_.length != pids_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < gauges_.length; ) {
            IGaugeUpgradeable(gauges_[i]).setRewarderPid(pids_[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Sets the gauge rewarder for a batch of gauge contracts.
     *
     * Requirements:
     * - Only callable by a user with 'GAUGE_ADMIN' role.
     * - Length of `gauges_` and `rewarder_` arrays must match.
     *
     * @param gauges_ Array of gauge contract addresses.
     * @param rewarder_ Array of rewarder contract addresses corresponding to each gauge.
     */
    function setGaugeRewarder(address[] calldata gauges_, address[] calldata rewarder_) external virtual override onlyAllowed {
        if (gauges_.length != rewarder_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < gauges_.length; ) {
            IGaugeUpgradeable(gauges_[i]).setGaugeRewarder(rewarder_[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Sets the distribution contract for a batch of gauge contracts.
     *
     * Requirements:
     * - Only callable by a user with 'GAUGE_ADMIN' role.
     *
     * @param gauges_ Array of gauge contract addresses.
     * @param newDistribution_ Address of the new distribution contract to be set for each gauge.
     */
    function setDistribution(address[] calldata gauges_, address newDistribution_) external virtual override onlyAllowed {
        for (uint256 i; i < gauges_.length; ) {
            IGaugeUpgradeable(gauges_[i]).setDistribution(newDistribution_);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Sets the internal bribe contract for a batch of gauge contracts.
     *
     * Requirements:
     * - Only callable by a user with 'GAUGE_ADMIN' role.
     * - Length of `gauges_` and `internalBribes_` arrays must match.
     *
     * @param gauges_ Array of gauge contract addresses.
     * @param internalBribes_ Array of internal bribe contract addresses corresponding to each gauge.
     */
    function setInternalBribe(address[] calldata gauges_, address[] calldata internalBribes_) external virtual override onlyAllowed {
        if (gauges_.length != internalBribes_.length) {
            revert MismatchArrayLen();
        }
        for (uint256 i; i < gauges_.length; ) {
            IGaugeUpgradeable(gauges_[i]).setInternalBribe(internalBribes_[i]);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Returns the total number of gauges created.
     *
     * @return uint256 The total number of gauges.
     */
    function length() external view virtual override returns (uint256) {
        return _gauges.length;
    }

    /**
     * @dev Lists a subset of all gauges, defined by an offset and a limit.
     *
     * @param offset_ The starting index for the subset.
     * @param limit_ The maximum number of items to return.
     * @return address[] Array of gauge contract addresses in the specified range.
     */
    function list(uint256 offset_, uint256 limit_) external view virtual override returns (address[] memory) {
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

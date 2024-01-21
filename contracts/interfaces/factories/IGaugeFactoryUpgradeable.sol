// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

/**
 * @title ICLGaugeFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev Interface for the ICLGaugeFactoryUpgradeable contract.
 */
interface IGaugeFactoryUpgradeable is IBeacon {
    /**
     * @dev Emitted when a new gauge is created.
     * @param gauge Address of the created gauge contract.
     */
    event GaugeCreated(address indexed gauge);

    /**
     * @dev Emitted when the permission registry address is set.
     * @param permissionRegistry Address of the permission registry.
     */
    event SetPermissionRegistry(address indexed permissionRegistry);

    // Error definitions
    error MismatchArrayLen();
    error AccessDenied();
    error ZeroAddress();

    /**
     * @dev Initializes the contract with necessary components and initial configuration.
     *
     * This function sets the initial state of the contract, including the addresses of key contracts
     * within the Fenix ecosystem and initial gauges implementation.
     *
     * @param permissionsRegistry_ The address of the Permissions Registry contract, used to manage access and roles.
     * @param gaugesImplementation_ The implementation address for the gauge contracts created by this factory.
     */
    function initialize(address permissionsRegistry_, address gaugesImplementation_) external;

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
        bool
    ) external returns (address);

    /**
     * @dev Upgrades the gauges to a new implementation.
     *
     * Requirements:
     *
     * - msg.sender must be the GAUGE_ADMIN.
     * - `newImplementation` must be a contract.
     */
    function upgradeProxiesTo(address newImplementation_) external;

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
    function setPermissionsRegistry(address permissionsRegistry_) external;

    /**
     * @dev Stops emergency mode for a batch of gauges.
     *
     * Requirements:
     * - Only callable by the emergency council.
     *
     * @param gauges_ Array of gauge contract addresses for which to stop emergency mode.
     */
    function stopEmergencyMode(address[] calldata gauges_) external;

    /**
     * @dev Activates emergency mode for a batch of gauges.
     *
     * Requirements:
     * - Only callable by the emergency council.
     *
     * @param gauges_ Array of gauge contract addresses for which to activate emergency mode.
     */
    function activateEmergencyMode(address[] calldata gauges_) external;

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
    function setRewarderPid(address[] calldata gauges_, uint[] calldata pids_) external;

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
    function setGaugeRewarder(address[] calldata gauges_, address[] calldata rewarder_) external;

    /**
     * @dev Sets the distribution contract for a batch of gauge contracts.
     *
     * Requirements:
     * - Only callable by a user with 'GAUGE_ADMIN' role.
     *
     * @param gauges_ Array of gauge contract addresses.
     * @param newDistribution_ Address of the new distribution contract to be set for each gauge.
     */
    function setDistribution(address[] calldata gauges_, address newDistribution_) external;

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
    function setInternalBribe(address[] calldata gauges_, address[] calldata internalBribes_) external;

    /**
     * @dev Return the address of the last created gauge contract.
     */
    function lastGauge() external view returns (address);

    /**
     * @dev Returns the total number of gauges created.
     *
     * @return uint256 The total number of gauges.
     */
    function length() external view returns (uint256);

    /**
     * @dev Lists a subset of all gauges, defined by an offset and a limit.
     *
     * @param offset_ The starting index for the subset.
     * @param limit_ The maximum number of items to return.
     * @return address[] Array of gauge contract addresses in the specified range.
     */
    function list(uint256 offset_, uint256 limit_) external view returns (address[] memory);
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IGaugeFactoryUpgradeable} from "./IGaugeFactoryUpgradeable.sol";

/**
 * @title ICLGaugeFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev Interface for the ICLGaugeFactoryUpgradeable contract.
 */
interface ICLGaugeFactoryUpgradeable is IGaugeFactoryUpgradeable {
    /**
     * @dev Emitted when a new gauge is created.
     * @param gauge Address of the created gauge contract.
     * @param feeVault Address of the created CLFeesVault contract for deployed gauge.
     */
    event GaugeCreated(address indexed gauge, address indexed feeVault);

    /**
     * @dev Sets the ClFeesVault for a batch of gauge contracts.
     *
     * Requirements:
     * - Only callable by a user with 'GAUGE_ADMIN' role.
     *
     * @param gauges_ Array of gauge contract addresses.
     * @param vault_ Address of the fee vault to be set for each gauge.
     */
    function setGaugeFeeVault(address[] calldata gauges_, address vault_) external;

    /**
     * @dev Return the address of the last created CLFeesVault contract.
     */
    function lastFeeVault() external view returns (address);
}

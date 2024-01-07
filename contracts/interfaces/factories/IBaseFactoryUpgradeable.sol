// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

/**
 * @title IBaseFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev Interface for a Base Factory Upgradeable contract.
 *      Extends the IBeacon interface from OpenZeppelin and includes additional features
 *      specific to a factory contract designed for managing upgradeable contracts.
 *      This interface primarily focuses on upgrade-related functionalities.
 */
interface IBaseFactoryUpgradeable is IBeacon {
    /**
     * @dev Emitted when the implementation contract is upgraded.
     * @param implementation The address of the new implementation contract.
     */
    event Upgraded(address indexed implementation);

    /**
     * @dev A special error thrown when the address has not passed the contract check
     */
    error AddressNotContract();
}

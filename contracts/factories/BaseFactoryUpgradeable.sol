// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IBaseFactoryUpgradeable} from "../interfaces/factories/IBaseFactoryUpgradeable.sol";

/**
 * @title BaseFactoryUpgradeable
 * @author Fenix Protocol team
 * @dev Abstract contract serving as a base for upgradeable factories.
 *      Includes functionality to set the address of the implementation contract for further reading by BeaconProxies.
 *      See: {https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/beacon/UpgradeableBeacon.sol}
 */
abstract contract BaseFactoryUpgradeable is IBaseFactoryUpgradeable, Initializable {
    /**
     * @dev Address of the current implementation of the bribe contract.
     * This address is used as the implementation reference for the beacon proxies.
     */
    address internal _implementation;

    /**
     * @dev Initializes the contract by setting the implementation address.
     * @param implementation_ The address of the implementation contract to be used.
     */
    function __Base_Factory_init(address implementation_) internal onlyInitializing {
        _setImplementation(implementation_);
    }

    /**
     * @dev Returns the current implementation address of the contract.
     * @return The address of the implementation contract.
     */
    function implementation() external view virtual override returns (address) {
        return _implementation;
    }

    /**
     * @dev Sets the implementation contract address for use by beacon proxies.
     *
     * Emits an {Upgraded} event.
     *
     * Requirements:
     *
     * - `newImplementation` must be a contract.
     *
     * @param newImplementation_ The new implementation contract address.
     */
    function _setImplementation(address newImplementation_) internal virtual {
        if (!Address.isContract(newImplementation_)) {
            revert AddressNotContract();
        }
        _implementation = newImplementation_;
        emit Upgraded(newImplementation_);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

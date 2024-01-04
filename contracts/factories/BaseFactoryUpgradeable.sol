// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import {IBaseFactoryUpgradeable} from "../interfaces/factories/IBaseFactoryUpgradeable.sol";

abstract contract BaseFactoryUpgradeable is IBaseFactoryUpgradeable, OwnableUpgradeable {
    /**
     * @dev Address of the current implementation of the bribe contract.
     * This address is used as the implementation reference for the beacon proxies.
     */
    address internal _implementation;

    /**
     * @dev Initializes the contract setting the deployer as the initial owner
     */
    function __Base_Factory_init(address implementation_) internal onlyInitializing {
        __Ownable_init();
        _setImplementation(implementation_);
    }

    /**
     * @dev Upgrades the beacon to a new implementation.
     *
     * Requirements:
     *
     * - msg.sender must be the owner of the contract.
     * - `newImplementation` must be a contract.
     */
    function upgradeProxiesTo(address newImplementation_) external virtual override onlyOwner {
        _setImplementation(newImplementation_);
    }

    /**
     * @dev Returns the current implementation address.
     */
    function implementation() external view virtual override returns (address) {
        return _implementation;
    }

    /**
     * @dev Sets the implementation contract address for this beacon proxies
     *
     * Emits an {Upgraded} event.
     *
     * Requirements:
     *
     * - `newImplementation` must be a contract.
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

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {BaseFactoryUpgradeable} from "../../factories/BaseFactoryUpgradeable.sol";

contract BaseFactoryUpgradeableMock is BaseFactoryUpgradeable {
    function initialize(address implementation_) external initializer {
        __Base_Factory_init(implementation_);
    }

    function baseFactoryInit(address implementation_) external {
        __Base_Factory_init(implementation_);
    }

    function upgradeTo(address newImplementation_) external {
        _setImplementation(newImplementation_);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

interface IBaseFactoryUpgradeable is IBeacon {
    event Upgraded(address indexed implementation);

    error AddressNotContract();

    function upgradeProxiesTo(address newImplementation_) external;
}

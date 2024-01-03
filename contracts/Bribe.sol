// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract BribeUpgradeable is ReentrancyGuardUpgradeable {
    constructor() {
        _disableInitializers();
    }

    function initialize(address voter_, address bribeFactory_, string memory type_, bool internal_) external initializer {
        __ReentrancyGuard_init();
    }
}

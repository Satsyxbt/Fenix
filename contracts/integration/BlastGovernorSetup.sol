// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBlast} from "./interfaces/IBlast.sol";

abstract contract BlastGovernorSetup {
    function __BlastGovernorSetup_init(address gov_) internal {
        require(gov_ != address(0));
        IBlast(0x4300000000000000000000000000000000000002).configureGovernor(gov_);
    }
}

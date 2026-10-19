// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;
import {BlastGovernorSetup} from "../integration/BlastGovernorSetup.sol";

contract BlastGovernorSetupMock is BlastGovernorSetup {
    constructor(address gov_) {
        __BlastGovernorSetup_init(gov_);
    }
}

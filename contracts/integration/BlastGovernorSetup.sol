// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBlast} from "./interfaces/IBlast.sol";

/**
 * @title Blast Governor Setup
 * @dev Abstract contract for setting up a governor in the Blast ecosystem.
 * This contract provides an initialization function to configure a governor address
 * for the Blast protocol, utilizing the `IBlast` interface.
 */
abstract contract BlastGovernorSetup {
    /// @dev Error thrown when an operation involves a zero address where a valid address is required.
    error AddressZero();

    /**
     * @dev Initializes the governor configuration for the Blast protocol.
     * This internal function is meant to be called in the initialization process
     * of a derived contract that sets up governance.
     *
     * @param gov_ The address of the governor to be configured in the Blast protocol.
     * Must be a non-zero address.
     */
    function __BlastGovernorSetup_init(address gov_) internal {
        if (gov_ == address(0)) {
            revert AddressZero();
        }
        IBlast(0x4300000000000000000000000000000000000002).configureGovernor(gov_);
    }
}

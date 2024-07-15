// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {IBlastFull, YieldMode, GasMode} from "./interfaces/IBlastFull.sol";
import {IBlastGovernor} from "./interfaces/IBlastGovernor.sol";

/**
 * @title Blast Governor Claiamble Setup
 * @dev Abstract contract for setting up a governor in the Blast ecosystem.
 * This contract provides an initialization function to configure a governor address
 * for the Blast protocol, utilizing the `IBlast` interface.
 */
abstract contract BlastGovernorClaimableSetup {
    /// @dev Error thrown when an operation involves a zero address where a valid address is required.
    error AddressZero();

    /**
     * @dev Initializes the governor and claimable configuration for the Blast protocol.
     * This internal function is meant to be called in the initialization process
     * of a derived contract that sets up governance.
     *
     * @param blastGovernor_ The address of the governor to be configured in the Blast protocol.
     * Must be a non-zero address.
     */
    function __BlastGovernorClaimableSetup_init(address blastGovernor_) internal {
        if (blastGovernor_ == address(0)) {
            revert AddressZero();
        }
        IBlastFull(0x4300000000000000000000000000000000000002).configure(YieldMode.CLAIMABLE, GasMode.CLAIMABLE, blastGovernor_);
        if (blastGovernor_.code.length > 0) {
            IBlastGovernor(blastGovernor_).addGasHolder(address(this));
        }
    }
}

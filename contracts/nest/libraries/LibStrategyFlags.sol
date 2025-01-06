// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

/**
 * @title LibStrategyFlags
 * @dev Provides utility functions for managing strategy flags in the context of managed strategies.
 */
library LibStrategyFlags {
    /**
     * @notice Checks if a given strategy flags set contains a specific flag.
     * @dev Uses bitwise operations to determine the presence of a flag within the provided flags set.
     * @param strategyFlags_ The set of flags to check
     * @param flag_ The specific flag to verify
     * @return res True if the flag is present in the set, false otherwise.
     */
    function hasFlag(uint8 strategyFlags_, uint256 flag_) internal pure returns (bool res) {
        assembly {
            res := gt(and(strategyFlags_, flag_), 0)
        }
    }

    /**
     * @dev Flag constant used to indicate that restrictions on recovering tokens should be ignored.
     */
    uint256 internal constant IGNORE_RESTRICTIONS_ON_RECOVER_TOKENS = 1;
}

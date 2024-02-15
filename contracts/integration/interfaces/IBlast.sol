// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IBlast Interface
 * @dev Interface for interacting with the Blast protocol, specifically for configuring
 * governance settings. This interface abstracts the function to set up a governor
 * within the Blast ecosystem.
 */
interface IBlast {
    /**
     * @dev Configures the governor for the Blast protocol.
     * This function is intended to be used by contracts responsible for setting up
     * or modifying the governance structure within Blast.
     *
     * @param governor The address of the governor to be set. This address will gain
     * the ability to perform governance-related actions within the Blast protocol.
     */
    function configureGovernor(address governor) external;
}

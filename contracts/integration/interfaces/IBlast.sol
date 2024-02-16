// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IBlast Interface
 * @dev Interface for interacting with the Blast protocol, specifically for configuring
 * governance settings. This interface abstracts the function to set up a governor
 * within the Blast ecosystem.
 */
interface IBlast {
    function configureGovernor(address _governor) external;
}

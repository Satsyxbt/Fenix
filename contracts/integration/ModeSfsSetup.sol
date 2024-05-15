// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

/**
 * @title ModeSfsSetup
 * @dev Abstract contract for setting up the Mode SFS assignment.
 * Provides an initialization function for assigning a smart contract to an SFS token.
 */
abstract contract ModeSfsSetup {
    /**
     * @dev Error thrown when an operation involves a zero address where a valid address is required.
     */
    error AddressZero();

    /**
     * @dev Initializes the Mode SFS setup by assigning the contract to an SFS token.
     *
     * Requirements:
     * - `modeSfs_` must not be the zero address.
     * - `sfsAssignTokenId_` must be greater than zero.
     *
     * @param modeSfs_ The address of the Mode SFS contract.
     * @param sfsAssignTokenId_ The tokenId of the SFS to which the contract will be assigned.
     */
    function __ModeSfsSetup__init(address modeSfs_, uint256 sfsAssignTokenId_) internal {
        if (modeSfs_ == address(0)) {
            revert AddressZero();
        }
        assert(sfsAssignTokenId_ > 0);
        (bool success, ) = modeSfs_.call(abi.encodeWithSignature("assign(uint256)", sfsAssignTokenId_));
        assert(success);
    }
}

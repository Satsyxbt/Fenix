// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ModeSfsSetup} from "./ModeSfsSetup.sol";
import {IModeSfsSetupFactoryManager} from "./interfaces/IModeSfsSetupFactoryManager.sol";

/**
 * @title ModeSfsSetupFactoryManager
 * @dev Abstract contract that manages the setup and configuration of Mode SFS.
 * Inherits from `ModeSfsSetup` and implements `IModeSfsSetupFactoryManager`.
 */
abstract contract ModeSfsSetupFactoryManager is IModeSfsSetupFactoryManager, ModeSfsSetup {
    /**
     * @inheritdoc IModeSfsSetupFactoryManager
     */
    address public override defaultModeSfs;

    /**
     * @inheritdoc IModeSfsSetupFactoryManager
     */
    uint256 public override defaultSfsAssignTokenId;

    /**
     * @dev Error thrown when an operation involves a zero token ID where a valid token ID is required.
     */
    error ZeroSfsAssignTokenId();

    /**
     * @dev Initializes the contract with default Mode SFS address and SFS assign token ID.
     * Calls the parent initializer to set up the Mode SFS assignment.
     *
     * @param modeSfs_ The address of the Mode SFS contract.
     * @param sfsAssignTokenId_ The tokenId of the SFS to which the contract will be assigned.
     */

    function __ModeSfsSetupFactoryManager_init(address modeSfs_, uint256 sfsAssignTokenId_) internal virtual {
        __ModeSfsSetup__init(modeSfs_, sfsAssignTokenId_);

        defaultModeSfs = modeSfs_;
        defaultSfsAssignTokenId = sfsAssignTokenId_;
    }

    /**
     * @inheritdoc IModeSfsSetupFactoryManager
     */
    function setDefaultModeSfs(address defaultModeSfs_) external virtual override {
        _checkAccessForModeSfsSetupFactoryManager();
        _checkAddressZero(defaultModeSfs_);

        defaultModeSfs = defaultModeSfs_;
        emit DefaultModeSfs(defaultModeSfs_);
    }

    /**
     * @inheritdoc IModeSfsSetupFactoryManager
     */
    function setDefaultSfsAssignTokenId(uint256 defaultSfsAssignTokenId_) external virtual override {
        _checkAccessForModeSfsSetupFactoryManager();
        if (defaultSfsAssignTokenId_ == 0) {
            revert ZeroSfsAssignTokenId();
        }

        defaultSfsAssignTokenId = defaultSfsAssignTokenId_;
        emit DefaultSfsAssignTokenId(defaultSfsAssignTokenId_);
    }

    /**
     * @dev Internal function to check if the message sender has the required permissions to manage the Mode SFS setup.
     * Reverts the transaction if the sender is not authorized.
     */
    function _checkAccessForModeSfsSetupFactoryManager() internal virtual;

    /**
     * @dev Checks if the provided address is the zero address, and throws an `AddressZero` error if it is.
     *
     * @param addr_ The address to check.
     */
    function _checkAddressZero(address addr_) internal pure virtual {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

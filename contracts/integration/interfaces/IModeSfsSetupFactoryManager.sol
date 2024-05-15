// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IModeSfsSetupFactoryManager
 * @dev Interface for the Mode Sfs Setup Factory Manager.
 */
interface IModeSfsSetupFactoryManager {
    /**
     * @dev Emitted when the default Mode SFS address is set.
     * @param defaultModeSfs The new default Mode SFS address.
     */
    event DefaultModeSfs(address indexed defaultModeSfs);

    /**
     * @dev Emitted when the default SFS assign token ID is set.
     * @param defaultSfsAssignTokenId The new default SFS assign token ID.
     */
    event DefaultSfsAssignTokenId(uint256 indexed defaultSfsAssignTokenId);

    /**
     * @dev Sets the default Mode SFS address.
     *
     * Requirements:
     * - The caller must have the appropriate access permissions.
     * - `defaultModeSfs_` cannot be the zero address.
     *
     * @param defaultModeSfs_ The new default Mode SFS address.
     */
    function setDefaultModeSfs(address defaultModeSfs_) external;

    /**
     * @dev Sets the default SFS assign token ID.
     *
     * Requirements:
     * - The caller must have the appropriate access permissions.
     * - `defaultSfsAssignTokenId_` must be greater than zero.
     *
     * @param defaultSfsAssignTokenId_ The new default SFS assign token ID.
     */
    function setDefaultSfsAssignTokenId(uint256 defaultSfsAssignTokenId_) external;

    /**
     * @return The address of the default Mode SFS contract.
     */
    function defaultModeSfs() external view returns (address);

    /**
     * @return The token ID of the default SFS assign token.
     */
    function defaultSfsAssignTokenId() external view returns (uint256);
}

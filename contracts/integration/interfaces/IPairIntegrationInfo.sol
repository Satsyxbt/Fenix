// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IPairIntegrationInfo {
    /// @notice The first of the two tokens of the pool, sorted by address
    /// @return The token contract address
    function token0() external view returns (address);

    /// @notice The second of the two tokens of the pool, sorted by address
    /// @return The token contract address
    function token1() external view returns (address);

    /// @notice The contract to which community fees are transferred
    /// @return communityVaultAddress The communityVault address
    function communityVault() external view returns (address);
}

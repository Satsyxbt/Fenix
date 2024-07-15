// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {GasMode} from "./IBlastFull.sol";

/**
 * @title IBlastGovernor
 * @dev Interface for the BlastGovernor contract.
 */
interface IBlastGovernor {
    /**
     * @dev Structure representing gas parameters.
     * @param contractAddress Address of the gas holder contract.
     * @param etherSeconds Accumulated ether seconds.
     * @param etherBalance Ether balance.
     * @param lastUpdated Timestamp of the last update.
     * @param gasMode Current gas mode.
     */
    struct GasParamsResult {
        address contractAddress;
        uint256 etherSeconds;
        uint256 etherBalance;
        uint256 lastUpdated;
        GasMode gasMode;
    }

    /**
     * @dev Emitted when a gas holder is added.
     * @param contractAddress The address of the added gas holder contract.
     */
    event AddGasHolder(address indexed contractAddress);

    /**
     * @dev Emitted when gas is claimed.
     * @param caller The address of the caller who initiated the claim.
     * @param recipient The address of the recipient who receives the claimed gas.
     * @param gasHolders The addresses of the gas holders from which gas was claimed.
     * @param totalClaimedAmount The total amount of gas claimed.
     */
    event ClaimGas(address indexed caller, address indexed recipient, address[] gasHolders, uint256 totalClaimedAmount);

    /**
     * @notice Adds a gas holder.
     * @dev Adds a contract to the list of gas holders.
     * @param contractAddress_ The address of the gas holder contract.
     */
    function addGasHolder(address contractAddress_) external;

    /**
     * @notice Claims all gas for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimAllGas(address recipient_, uint256 offset_, uint256 limit_) external returns (uint256 totalClaimedGas);

    /**
     * @notice Claims all gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimAllGasFromSpecifiedGasHolders(address recipient_, address[] memory holders_) external returns (uint256 totalClaimedGas);

    /**
     * @notice Claims gas at minimum claim rate for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param minClaimRateBips_ The minimum claim rate in basis points.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGasAtMinClaimRate(
        address recipient_,
        uint256 minClaimRateBips_,
        uint256 offset_,
        uint256 limit_
    ) external returns (uint256 totalClaimedGas);

    /**
     * @notice Claims gas at minimum claim rate for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param minClaimRateBips_ The minimum claim rate in basis points.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGasAtMinClaimRateFromSpecifiedGasHolders(
        address recipient_,
        uint256 minClaimRateBips_,
        address[] memory holders_
    ) external returns (uint256 totalClaimedGas);

    /**
     * @notice Claims maximum gas for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimMaxGas(address recipient_, uint256 offset_, uint256 limit_) external returns (uint256 totalClaimedGas);

    /**
     * @notice Claims maximum gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimMaxGasFromSpecifiedGasHolders(address recipient_, address[] memory holders_) external returns (uint256 totalClaimedGas);

    /**
     * @notice Claims a specific amount of gas for a recipient within the specified range.
     * @param recipient_ The address of the recipient.
     * @param gasToClaim_ The amount of gas to claim.
     * @param gasSecondsToConsume_ The amount of gas seconds to consume.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGas(
        address recipient_,
        uint256 gasToClaim_,
        uint256 gasSecondsToConsume_,
        uint256 offset_,
        uint256 limit_
    ) external returns (uint256 totalClaimedGas);

    /**
     * @notice Claims a specific amount of gas for a recipient from specified gas holders.
     * @param recipient_ The address of the recipient.
     * @param gasToClaim_ The amount of gas to claim.
     * @param gasSecondsToConsume_ The amount of gas seconds to consume.
     * @param holders_ The addresses of the gas holders.
     * @return totalClaimedGas The total amount of gas claimed.
     */
    function claimGasFromSpecifiedGasHolders(
        address recipient_,
        uint256 gasToClaim_,
        uint256 gasSecondsToConsume_,
        address[] memory holders_
    ) external returns (uint256 totalClaimedGas);

    /**
     * @notice Reads gas parameters within the specified range.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return gasHoldersParams The gas parameters of the gas holders.
     */
    function readGasParams(uint256 offset_, uint256 limit_) external view returns (GasParamsResult[] memory gasHoldersParams);

    /**
     * @notice Reads gas parameters from specified gas holders.
     * @param holders_ The addresses of the gas holders.
     * @return gasHoldersParams The gas parameters of the gas holders.
     */
    function readGasParamsFromSpecifiedGasHolders(
        address[] memory holders_
    ) external view returns (GasParamsResult[] memory gasHoldersParams);

    /**
     * @notice Checks if a contract is a registered gas holder.
     * @param contractAddress_ The address of the contract.
     * @return isRegistered Whether the contract is a registered gas holder.
     */
    function isRegisteredGasHolder(address contractAddress_) external view returns (bool isRegistered);

    /**
     * @notice Lists gas holders within the specified range.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of gas holders to process.
     * @return gasHolders The addresses of the gas holders.
     */
    function listGasHolders(uint256 offset_, uint256 limit_) external view returns (address[] memory gasHolders);
}

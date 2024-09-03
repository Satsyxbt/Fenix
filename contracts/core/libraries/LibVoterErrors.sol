// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @notice Reverts when access is denied for the operation.
 */
error AccessDenied();

/**
 * @notice Reverts when an invalid address key is provided.
 */
error InvalidAddressKey();

/**
 * @notice Reverts when the vote delay has already been set.
 */
error VoteDelayAlreadySet();

/**
 * @notice Reverts when the provided vote delay exceeds the maximum allowed.
 */
error VoteDelayTooBig();

/**
 * @notice Reverts when an operation is attempted on a gauge that has already been killed.
 */
error GaugeAlreadyKilled();

/**
 * @notice Reverts when an operation is attempted on a gauge that is not currently killed.
 */
error GaugeNotKilled();

/**
 * @notice Reverts when an operation is attempted on a pool that was not created by the factory.
 */
error PoolNotCreatedByFactory();

/**
 * @notice Reverts when an attempt is made to create a gauge for a pool that already has one.
 */
error GaugeForPoolAlreadyExists();

/**
 * @notice Reverts when a voting operation is attempted without a prior reset.
 */
error NoResetBefore();

/**
 * @notice Reverts when the calculated vote power for a pool is zero.
 */
error ZeroPowerForPool();

/**
 * @notice Reverts when the required delay period for voting has not passed.
 */
error VoteDelay();

/**
 * @notice Reverts when the lengths of provided arrays do not match.
 */
error ArrayLengthMismatch();

/**
 * @notice Reverts when an operation is attempted on a disabled managed NFT.
 */
error DisabledManagedNft();

/**
 * @notice Reverts when the operation is attempted outside the allowed distribution window.
 */
error DistributionWindow();

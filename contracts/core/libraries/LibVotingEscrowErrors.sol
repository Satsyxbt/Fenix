// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @notice Reverts when an operation is attempted on a token that has been used to vote.
 */
error TokenVoted();

/**
 * @notice Reverts when an operation is attempted with a value of zero, where a non-zero value is required.
 */
error ValueZero();

/**
 * @notice Reverts when an operation is attempted on a non-existent token.
 */
error TokenNotExist();

/**
 * @notice Reverts when an operation is attempted on a token that has not yet expired.
 */
error TokenExpired();

/**
 * @notice Reverts when an invalid lock duration is provided.
 */
error InvalidLockDuration();

/**
 * @notice Reverts when an operation is attempted on a permanently locked token.
 */
error PermanentLocked();

/**
 * @notice Reverts when an operation is attempted on a token that is not expired.
 */
error TokenNoExpired();

/**
 * @notice Reverts when an operation is attempted on a token that is not permanently locked.
 */
error NotPermanentLocked();

/**
 * @notice Reverts when an invalid address key is provided.
 */
error InvalidAddressKey();

/**
 * @notice Reverts when a merge operation is attempted with the same token IDs.
 */
error MergeTokenIdsTheSame();

/**
 * @notice Reverts when access is denied for the operation.
 */
error AccessDenied();

/**
 * @notice Reverts when an operation is attempted on a token with zero voting power.
 */
error ZeroVotingPower();

/**
 * @notice Reverts when an operation is attempted on a non-managed NFT.
 */
error NotManagedNft();

/**
 * @notice Reverts when a transfer is attempted on a managed NFT.
 */
error ManagedNftTransferDisabled();

/**
 * @notice Reverts when a gauge already exists for a pool.
 */
error GaugeForPoolAlreadyExists();

/**
 * @notice Reverts when an operation is attempted on an attached token.
 */
error TokenAttached();

/**
 * @notice Reverts when an operation is attempted on a token that is not attached.
 */
error TokenNotAttached();

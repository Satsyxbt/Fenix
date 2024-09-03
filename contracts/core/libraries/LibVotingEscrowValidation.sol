// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IVotingEscrowV2.sol";
import "./LibVotingEscrowErrors.sol";

/**
 * @title LibVotingEscrowValidation
 * @notice Library providing validation checks for various Voting Escrow operations.
 */
library LibVotingEscrowValidation {
    /**
     * @notice Validates the conditions for withdrawing a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token does not exist, is attached, is voted, or has not expired.
     */
    function withdrawCheck(IVotingEscrowV2.TokenState memory self_) internal view {
        checkExist(self_);
        checkNotAttached(self_);
        checkNotVoted(self_);
        checkExpired(self_);
    }

    /**
     * @notice Validates if the token has expired.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is permanently locked or has not yet expired.
     */
    function checkExpired(IVotingEscrowV2.TokenState memory self_) internal view {
        IVotingEscrowV2.LockedBalance memory locked = self_.locked;
        if (locked.isPermanentLocked || locked.end > block.timestamp) {
            revert TokenNoExpired();
        }
    }

    /**
     * @notice Validates the conditions for increasing the unlock time of a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token does not exist, is attached, is permanently locked, or has expired.
     */
    function increaseUnlockCheck(IVotingEscrowV2.TokenState memory self_) internal view {
        checkExist(self_);
        checkNotAttached(self_);
        checkNotPermanentLocked(self_);
        checkNotExpired(self_);
    }

    /**
     * @notice Validates the conditions for depositing into a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token does not exist, is attached, or has expired.
     */
    function depositCheck(IVotingEscrowV2.TokenState memory self_) internal view {
        checkExist(self_);
        checkNotAttached(self_);
        checkNotExpired(self_);
    }

    /**
     * @notice Validates the conditions for transferring a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is voted or attached.
     */
    function transferCheck(IVotingEscrowV2.TokenState memory self_) internal pure {
        checkNotVoted(self_);
        checkNotAttached(self_);
    }

    /**
     * @notice Validates the conditions for merging the "from" token in a merge operation.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is voted, attached, or permanently locked.
     */
    function mergeCheckFrom(IVotingEscrowV2.TokenState memory self_) internal view {
        checkNotVoted(self_);
        checkNotAttached(self_);
        checkNotExpired(self_);
        checkNotPermanentLocked(self_);
    }

    /**
     * @notice Validates the conditions for merging the "to" token in a merge operation.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is attached.
     */
    function mergeCheckTo(IVotingEscrowV2.TokenState memory self_) internal view {
        checkNotAttached(self_);
        checkNotExpired(self_);
    }

    /**
     * @notice Validates the conditions for permanently locking a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token does not exist, is attached, is permanently locked, or has expired.
     */
    function lockPermanentCheck(IVotingEscrowV2.TokenState memory self_) internal view {
        checkExist(self_);
        checkNotAttached(self_);
        checkNotExpired(self_);
        checkNotPermanentLocked(self_);
    }

    /**
     * @notice Validates the conditions for unlocking a permanently locked token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is voted, not permanently locked, or attached.
     */
    function unlockPermanentCheck(IVotingEscrowV2.TokenState memory self_) internal pure {
        checkNotVoted(self_);
        checkNotAttached(self_);
        checkPermanentLocked(self_);
    }

    /**
     * @notice Validates the conditions for attaching a token to a managed NFT.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is attached, voted, or expired.
     */
    function attachToManagedNftCheck(IVotingEscrowV2.TokenState memory self_) internal view {
        checkNotAttached(self_);
        checkNotVoted(self_);
        checkNotExpired(self_);
    }

    /**
     * @notice Validates the conditions for detaching a token from a managed NFT.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is not attached or is voted.
     */
    function dettachFromManagedNftCheck(IVotingEscrowV2.TokenState memory self_) internal pure {
        checkAttached(self_);
    }

    /**
     * @notice Checks if the token has been voted.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `TokenVoted` if the token has been voted.
     */
    function checkNotVoted(IVotingEscrowV2.TokenState memory self_) internal pure {
        if (self_.isVoted) {
            revert TokenVoted();
        }
    }

    /**
     * @notice Checks if the token exists.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `TokenNotExist` if the token does not exist.
     */
    function checkExist(IVotingEscrowV2.TokenState memory self_) internal pure {
        if (self_.locked.amount == 0 && !self_.isAttached) {
            revert TokenNotExist();
        }
    }

    /**
     * @notice Checks if the token has not expired.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `TokenExpired` if the token has expired.
     */
    function checkNotExpired(IVotingEscrowV2.TokenState memory self_) internal view {
        IVotingEscrowV2.LockedBalance memory locked = self_.locked;
        if ((!locked.isPermanentLocked && locked.end < block.timestamp) && !self_.isAttached) {
            revert TokenExpired();
        }
    }

    /**
     * @notice Checks if the token is permanently locked.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `NotPermanentLocked` if the token is not permanently locked.
     */
    function checkPermanentLocked(IVotingEscrowV2.TokenState memory self_) internal pure {
        if (!self_.locked.isPermanentLocked) {
            revert NotPermanentLocked();
        }
    }

    /**
     * @notice Checks if the token is not permanently locked.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `PermanentLocked` if the token is permanently locked.
     */
    function checkNotPermanentLocked(IVotingEscrowV2.TokenState memory self_) internal pure {
        if (self_.locked.isPermanentLocked) {
            revert PermanentLocked();
        }
    }

    /**
     * @notice Placeholder function for checking if the token is not attached.
     * @param self_ The state of the token to validate.
     * @dev This function can be expanded for specific attachment checks.
     */
    function checkNotAttached(IVotingEscrowV2.TokenState memory self_) internal pure {
        if (self_.isAttached) {
            revert TokenAttached();
        }
    }

    /**
     * @notice Placeholder function for checking if the token is attached.
     * @param self_ The state of the token to validate.
     * @dev This function can be expanded for specific attachment checks.
     */
    function checkAttached(IVotingEscrowV2.TokenState memory self_) internal pure {
        if (!self_.isAttached) {
            revert TokenNotAttached();
        }
    }

    /**
     * @notice Checks if the provided value is not zero.
     * @param value_ The value to validate.
     * @dev Reverts with `ValueZero` if the value is zero.
     */
    function checkNoValueZero(uint256 value_) internal pure {
        if (value_ == 0) {
            revert ValueZero();
        }
    }
}

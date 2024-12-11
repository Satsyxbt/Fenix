// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IVotingEscrow.sol";
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
    function withdrawCheck(IVotingEscrow.TokenState memory self_) internal view {
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
    function checkExpired(IVotingEscrow.TokenState memory self_) internal view {
        IVotingEscrow.LockedBalance memory locked = self_.locked;
        if (locked.isPermanentLocked || locked.end > block.timestamp) {
            revert TokenNoExpired();
        }
    }

    /**
     * @notice Validates the conditions for increasing the unlock time of a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token does not exist, is attached, is permanently locked, or has expired.
     */
    function increaseUnlockCheck(IVotingEscrow.TokenState memory self_) internal view {
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
    function depositToAttachedNFTCheck(IVotingEscrow.TokenState memory self_) internal pure {
        checkExist(self_);
        checkAttached(self_);
    }

    /**
     * @notice Validates the conditions for depositing into a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token does not exist, is attached, or has expired.
     */
    function depositCheck(IVotingEscrow.TokenState memory self_) internal view {
        checkExist(self_);
        checkNotAttached(self_);
        checkNotExpired(self_);
    }

    /**
     * @notice Validates the conditions for transferring a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is voted or attached.
     */
    function transferCheck(IVotingEscrow.TokenState memory self_) internal pure {
        checkNotVoted(self_);
        checkNotAttached(self_);
    }

    /**
     * @notice Validates the conditions for merging the "from" token in a merge operation.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is voted, attached, or permanently locked.
     */
    function mergeCheckFrom(IVotingEscrow.TokenState memory self_) internal view {
        checkNotVoted(self_);
        checkNotAttached(self_);
        checkNotExpired(self_);
        checkNotPermanentLocked(self_);
    }

    /**
     * @notice Validates whether a veFNX NFT can be burned to reclaim FNX for bribes.
     * @dev The token must not be attached, must not have a recent voting history,
     *      and must not be permanently locked.
     * @param self_ The current state of the veFNX token to be validated.
     * @custom:reverts If the token is attached, has voted, or is permanently locked,
     *                 preventing it from being burned for bribes.
     */
    function burnToBribeCheck(IVotingEscrow.TokenState memory self_) internal pure {
        checkNotAttached(self_);
        checkNotVoted(self_);
        checkNotPermanentLocked(self_);
    }

    /**
     * @notice Validates the conditions for merging the "to" token in a merge operation.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is attached.
     */
    function mergeCheckTo(IVotingEscrow.TokenState memory self_) internal view {
        checkNotAttached(self_);
        checkNotExpired(self_);
    }

    /**
     * @notice Validates the conditions for permanently locking a token.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token does not exist, is attached, is permanently locked, or has expired.
     */
    function lockPermanentCheck(IVotingEscrow.TokenState memory self_) internal view {
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
    function unlockPermanentCheck(IVotingEscrow.TokenState memory self_) internal pure {
        checkNotVoted(self_);
        checkNotAttached(self_);
        checkPermanentLocked(self_);
    }

    /**
     * @notice Validates the conditions for attaching a token to a managed NFT.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is attached, voted, or expired.
     */
    function attachToManagedNftCheck(IVotingEscrow.TokenState memory self_) internal view {
        checkNotAttached(self_);
        checkNotVoted(self_);
        checkNotExpired(self_);
    }

    /**
     * @notice Validates the conditions for detaching a token from a managed NFT.
     * @param self_ The state of the token to validate.
     * @dev Reverts if the token is not attached or is voted.
     */
    function dettachFromManagedNftCheck(IVotingEscrow.TokenState memory self_) internal pure {
        checkAttached(self_);
    }

    /**
     * @notice Checks if the token has been voted.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `TokenVoted` if the token has been voted.
     */
    function checkNotVoted(IVotingEscrow.TokenState memory self_) internal pure {
        if (self_.isVoted) {
            revert TokenVoted();
        }
    }

    /**
     * @notice Checks if the token exists.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `TokenNotExist` if the token does not exist.
     */
    function checkExist(IVotingEscrow.TokenState memory self_) internal pure {
        if (self_.locked.amount == 0 && !self_.isAttached) {
            revert TokenNotExist();
        }
    }

    /**
     * @notice Checks if the token has not expired.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `TokenExpired` if the token has expired.
     */
    function checkNotExpired(IVotingEscrow.TokenState memory self_) internal view {
        IVotingEscrow.LockedBalance memory locked = self_.locked;
        if ((!locked.isPermanentLocked && locked.end < block.timestamp) && !self_.isAttached) {
            revert TokenExpired();
        }
    }

    /**
     * @notice Checks if the token is permanently locked.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `NotPermanentLocked` if the token is not permanently locked.
     */
    function checkPermanentLocked(IVotingEscrow.TokenState memory self_) internal pure {
        if (!self_.locked.isPermanentLocked) {
            revert NotPermanentLocked();
        }
    }

    /**
     * @notice Checks if the token is not permanently locked.
     * @param self_ The state of the token to validate.
     * @dev Reverts with `PermanentLocked` if the token is permanently locked.
     */
    function checkNotPermanentLocked(IVotingEscrow.TokenState memory self_) internal pure {
        if (self_.locked.isPermanentLocked) {
            revert PermanentLocked();
        }
    }

    /**
     * @notice Placeholder function for checking if the token is not attached.
     * @param self_ The state of the token to validate.
     * @dev This function can be expanded for specific attachment checks.
     */
    function checkNotAttached(IVotingEscrow.TokenState memory self_) internal pure {
        if (self_.isAttached) {
            revert TokenAttached();
        }
    }

    /**
     * @notice Placeholder function for checking if the token is attached.
     * @param self_ The state of the token to validate.
     * @dev This function can be expanded for specific attachment checks.
     */
    function checkAttached(IVotingEscrow.TokenState memory self_) internal pure {
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

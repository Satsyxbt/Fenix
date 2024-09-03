// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./LibVotingEscrowConstants.sol";

library LibVotingEscrowUtils {
    /**
     * @notice Internal function to get the maximum unlock timestamp.
     * @return The maximum unlock timestamp.
     */
    function maxUnlockTimestamp() internal view returns (uint256) {
        return roundToWeek(block.timestamp + MAX_LOCK_TIME);
    }

    /**
     * @notice Internal function to round a timestamp to the nearest week.
     * @param time_ The timestamp to round.
     * @return The rounded timestamp.
     */
    function roundToWeek(uint256 time_) internal pure returns (uint256) {
        return (time_ / WEEK) * WEEK;
    }

    /**
     * @notice Internal function to convert a uint256 amount to an int128.
     * @param amount_ The amount to convert.
     * @return The converted amount.
     */
    function toInt128(uint256 amount_) internal pure returns (int128) {
        return int128(int256(amount_));
    }

    /**
     * @notice Internal function to convert an int128 amount to a uint256.
     * @param amount_ The amount to convert.
     * @return The converted amount.
     */
    function toUint256(int128 amount_) internal pure returns (uint256) {
        return uint256(int256(amount_));
    }
}

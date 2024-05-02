// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

/**
 * @title VirtualRewarderCheckpoints
 * @dev Library to manage checkpoints in a virtual reward system. This library facilitates the storage of state
 * at specific timestamps for historical data tracking and reward calculation.
 */
library VirtualRewarderCheckpoints {
    struct Checkpoint {
        uint256 timestamp; // Timestamp at which the checkpoint is logged
        uint256 amount; // Amount or value associated with the checkpoint
    }

    /**
     * @notice Writes a new checkpoint or updates an existing one in the mapping.
     * @dev If a checkpoint at the given timestamp already exists, it updates the amount; otherwise, it creates a new checkpoint.
     *
     * @param self_ Mapping from index to Checkpoint.
     * @param lastIndex_ Index of the last recorded checkpoint.
     * @param timestamp_ Timestamp for the new checkpoint.
     * @param amount_ Amount to be associated with the new checkpoint.
     * @return newIndex The index of the newly written checkpoint.
     *
     * Example:
     * mapping(uint256 => Checkpoint) checkpoints;
     * uint256 lastIndex = 0;
     * lastIndex = VirtualRewarderCheckpoints.writeCheckpoint(checkpoints, lastIndex, block.timestamp, 100);
     */
    function writeCheckpoint(
        mapping(uint256 index => Checkpoint checkpoint) storage self_,
        uint256 lastIndex_,
        uint256 timestamp_,
        uint256 amount_
    ) internal returns (uint256 newIndex) {
        Checkpoint memory last = self_[lastIndex_];

        newIndex = last.timestamp == timestamp_ ? lastIndex_ : lastIndex_ + 1;

        self_[newIndex] = Checkpoint({timestamp: timestamp_, amount: amount_});
    }

    /**
     * @notice Retrieves the amount at the checkpoint closest to and not after the given timestamp.
     *
     * @param self_ Mapping from index to Checkpoint.
     * @param lastIndex_ Index of the last checkpoint.
     * @param timestamp_ Timestamp for querying the amount.
     * @return amount The amount at the closest checkpoint.
     *
     * Example:
     * uint256 amount = VirtualRewarderCheckpoints.getAmount(checkpoints, lastIndex, block.timestamp);
     */
    function getAmount(
        mapping(uint256 index => Checkpoint checkpoint) storage self_,
        uint256 lastIndex_,
        uint256 timestamp_
    ) internal view returns (uint256) {
        return self_[getCheckpointIndex(self_, lastIndex_, timestamp_)].amount;
    }

    /**
     * @notice Retrieves the index of the checkpoint that is nearest to and less than or equal to the given timestamp.
     * @dev Performs a binary search to find the closest timestamp, which is efficient on sorted data.
     *
     * @param self_ Mapping from index to Checkpoint.
     * @param lastIndex_ Index of the last checkpoint.
     * @param timestamp_ Timestamp to query the nearest checkpoint for.
     * @return index The index of the closest checkpoint by timestamp.
     *
     * Example:
     * uint256 index = VirtualRewarderCheckpoints.getCheckpointIndex(checkpoints, lastIndex, block.timestamp - 10);
     */
    function getCheckpointIndex(
        mapping(uint256 index => Checkpoint checkpoint) storage self_,
        uint256 lastIndex_,
        uint256 timestamp_
    ) internal view returns (uint256) {
        if (lastIndex_ == 0) {
            return 0;
        }

        if (self_[lastIndex_].timestamp <= timestamp_) {
            return lastIndex_;
        }

        if (self_[0].timestamp > timestamp_) {
            return 0;
        }

        uint256 start;
        uint256 end = lastIndex_;
        while (end > start) {
            uint256 middle = end - (end - start) / 2;
            Checkpoint memory checkpoint = self_[middle];
            if (checkpoint.timestamp == timestamp_) {
                return middle;
            } else if (checkpoint.timestamp < timestamp_) {
                start = middle;
            } else {
                end = middle - 1;
            }
        }

        return start;
    }
}

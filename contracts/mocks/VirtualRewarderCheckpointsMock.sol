// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {VirtualRewarderCheckpoints} from "../nest/libraries/VirtualRewarderCheckpoints.sol";

contract VirtualRewarderCheckpointsMock {
    mapping(uint256 index => VirtualRewarderCheckpoints.Checkpoint checkpoint) public checkpoints;

    function writeCheckpoint(uint256 lastIndex_, uint256 timestamp_, uint256 amount_) external returns (uint256) {
        return VirtualRewarderCheckpoints.writeCheckpoint(checkpoints, lastIndex_, timestamp_, amount_);
    }

    function getCheckpointIndex(uint256 lastIndex_, uint256 timestamp_) external view returns (uint256) {
        return VirtualRewarderCheckpoints.getCheckpointIndex(checkpoints, lastIndex_, timestamp_);
    }

    function getAmount(uint256 lastIndex_, uint256 timestamp_) external view returns (uint256) {
        return VirtualRewarderCheckpoints.getAmount(checkpoints, lastIndex_, timestamp_);
    }
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

interface IRewardReciever {
    function notifyRewardAmount(address token_, uint256 rewardAmount_) external;
}

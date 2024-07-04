// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IRewardReciever {
    function notifyRewardAmount(address token_, uint256 rewardAmount_) external;
}

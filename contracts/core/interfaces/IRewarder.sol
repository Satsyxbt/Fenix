// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IRewarder {
    function onReward(uint256 pid, address user, address recipient, uint256 lqdrAmount, uint256 newLpAmount) external;
}

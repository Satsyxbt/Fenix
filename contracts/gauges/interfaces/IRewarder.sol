// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IRewarder {
    function onReward(address user, address recipient, uint256 userBalance) external;
}

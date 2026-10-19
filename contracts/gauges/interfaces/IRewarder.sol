// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

interface IRewarder {
    function onReward(address user, address recipient, uint256 userBalance) external;
}

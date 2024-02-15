// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IMerklGaugeMiddleman {
    function notifyReward(address gauge, uint256 amount) external;

    function notifyRewardWithTransfer(address gauge, uint256 amount) external;
}

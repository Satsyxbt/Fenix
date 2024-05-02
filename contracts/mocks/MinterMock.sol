// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract MinterMock {
    uint256 public constant WEEK = 86400 * 7;

    uint256 public active_period;

    function setPeriod(uint256 period_) external {
        active_period = period_;
    }

    function period() public view returns (uint256) {
        return (block.timestamp / WEEK) * WEEK;
    }
}

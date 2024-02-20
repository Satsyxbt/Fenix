// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract VoterMock {
    mapping(address => bool) public isGauge;
    mapping(address => address) public poolForGauge;

    function setGauge(address gauge_, address pool_) external {
        isGauge[gauge_] = true;
        poolForGauge[gauge_] = pool_;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract ImplementationMock {
    function version() external pure returns (uint256) {
        return 1;
    }

    function bribeVersion() external pure returns (string memory) {
        return "Bribe Mock";
    }

    function gaugeVersion() external pure returns (string memory) {
        return "Gauge Mock";
    }
}

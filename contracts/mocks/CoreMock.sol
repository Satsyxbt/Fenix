// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract CoreMock {
    function isGovernorOrGuardian(address) external view returns (bool) {
        return true;
    }
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

contract CoreMock {
    function isGovernorOrGuardian(address) external view returns (bool) {
        return true;
    }
}

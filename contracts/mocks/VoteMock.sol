// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract VoteMock {
    address public v;
    address public m;

    constructor(address ve_, address miner_) {
        v = ve_;
        m = miner_;
    }

    function ve() external view returns (address) {
        return v;
    }

    function minter() external view returns (address) {
        return m;
    }
}

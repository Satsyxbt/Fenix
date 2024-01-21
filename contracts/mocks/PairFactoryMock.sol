// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract PairFactoryMock {
    mapping(address => bool) internal _isPair;

    function setIsPair(address pool_, bool is_) external {
        _isPair[pool_] = is_;
    }

    function isPair(address pool_) external view returns (bool) {
        return _isPair[pool_];
    }
}

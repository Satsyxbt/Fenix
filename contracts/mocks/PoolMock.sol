// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract PoolMock {
    address public token1;
    address public token0;

    function setTokens(address token0_, address token1_) external {
        token0 = token0_;
        token1 = token1_;
    }
}

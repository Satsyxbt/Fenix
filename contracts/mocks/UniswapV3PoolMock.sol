// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract UniswapV3PoolMock {
    address internal _token0;
    address internal _token1;

    function setToken0(address token0_) external {
        _token0 = token0_;
    }

    function setToken1(address token1_) external {
        _token1 = token1_;
    }

    function token0() external view returns (address) {
        return _token0;
    }

    function token1() external view returns (address) {
        return _token1;
    }
}

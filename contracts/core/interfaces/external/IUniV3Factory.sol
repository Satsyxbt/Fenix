// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IUniV3Factory {
    function poolByPair(address tokenA, address tokenB) external view returns (address pool);
}

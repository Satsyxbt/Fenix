// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.0;

interface IPairQuote {
    function quote(address tokenIn, uint amountIn, uint granularity) external view returns (uint amountOut);
}

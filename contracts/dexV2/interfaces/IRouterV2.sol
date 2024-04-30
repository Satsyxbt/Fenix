// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IRouterV2 {
    struct route {
        address from;
        address to;
        bool stable;
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        route[] calldata routes,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function pairFor(address tokenA, address tokenB, bool stable) external view returns (address pair);

    function getAmountsOut(uint amountIn, route[] memory routes) external view returns (uint[] memory amounts);

    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) external view returns (uint amount, bool stable);
}

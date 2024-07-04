// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import "./RouterV2.sol";
import {IUniswapV2PartialRouter} from "./interfaces/IUniswapV2PartialRouter.sol";

contract UniswapV2PartialRouter is RouterV2, IUniswapV2PartialRouter {
    constructor(address _blastGovernor, address _factory, address _wETH) RouterV2(_blastGovernor, _factory, _wETH) {}

    function WETH() public view returns (address) {
        return address(wETH);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external override returns (uint amountA, uint amountB, uint liquidity) {
        return addLiquidity(tokenA, tokenB, false, amountADesired, amountBDesired, amountAMin, amountBMin, to, deadline);
    }

    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable override returns (uint amountToken, uint amountETH, uint liquidity) {
        return addLiquidityETH(token, false, amountTokenDesired, amountTokenMin, amountETHMin, to, deadline);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external override returns (uint amountA, uint amountB) {
        return removeLiquidity(tokenA, tokenB, false, liquidity, amountAMin, amountBMin, to, deadline);
    }

    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external override returns (uint amountToken, uint amountETH) {
        return removeLiquidityETH(token, false, liquidity, amountTokenMin, amountETHMin, to, deadline);
    }

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override returns (uint amountA, uint amountB) {
        return removeLiquidityWithPermit(tokenA, tokenB, false, liquidity, amountAMin, amountBMin, to, deadline, approveMax, v, r, s);
    }

    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override returns (uint amountToken, uint amountETH) {
        return removeLiquidityETHWithPermit(token, false, liquidity, amountTokenMin, amountETHMin, to, deadline, approveMax, v, r, s);
    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        return swapExactTokensForTokens(amountIn, amountOutMin, pathsToVolatilityRoutes(path), to, deadline);
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override returns (uint[] memory amounts) {
        return swapExactETHForTokens(amountOutMin, pathsToVolatilityRoutes(path), to, deadline);
    }

    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override returns (uint[] memory amounts) {
        return swapExactTokensForETH(amountIn, amountOutMin, pathsToVolatilityRoutes(path), to, deadline);
    }

    function getReserves(address tokenA, address tokenB) external view override returns (uint reserveA, uint reserveB) {
        return getReserves(tokenA, tokenB, false);
    }

    function getAmountsOut(uint amountIn, address[] calldata path) external view override returns (uint[] memory amounts) {
        return getAmountsOut(amountIn, pathsToVolatilityRoutes(path));
    }

    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external override returns (uint amountETH) {
        (, amountETH) = removeLiquidityETHSupportingFeeOnTransferTokens(
            token,
            false,
            liquidity,
            amountTokenMin,
            amountETHMin,
            to,
            deadline
        );
    }

    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override returns (uint amountETH) {
        (, amountETH) = removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
            token,
            false,
            liquidity,
            amountTokenMin,
            amountETHMin,
            to,
            deadline,
            approveMax,
            v,
            r,
            s
        );
    }

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {
        return swapExactTokensForTokensSupportingFeeOnTransferTokens(amountIn, amountOutMin, pathsToVolatilityRoutes(path), to, deadline);
    }

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable override {
        swapExactETHForTokensSupportingFeeOnTransferTokens(amountOutMin, pathsToVolatilityRoutes(path), to, deadline);
    }

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external override {
        swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, pathsToVolatilityRoutes(path), to, deadline);
    }

    function pathsToVolatilityRoutes(address[] memory path) public pure returns (route[] memory) {
        route[] memory routes = new route[](path.length - 1);
        for (uint i; i < path.length - 1; ) {
            routes[i] = route({from: path[i], to: path[i + 1], stable: false});
            unchecked {
                i++;
            }
        }
        return routes;
    }
}

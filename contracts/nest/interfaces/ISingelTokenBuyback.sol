// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {IRouterV2} from "../../dexV2/interfaces/IRouterV2.sol";

interface ISingelTokenBuyback {
    event BuybackTokenByV2(
        address indexed caller,
        address indexed inputToken,
        address indexed outputToken,
        IRouterV2.route[] routes,
        uint256 inputAmount,
        uint256 outputAmount
    );

    /**
     * @notice Address of the Router V2 Path Provider used for fetching and calculating optimal token swap routes.
     * @dev This address is utilized to access routing functionality for executing token buybacks.
     */
    function routerV2PathProvider() external view returns (address);

    /**
     * @notice Buys back tokens by swapping specified input tokens for a target token via a DEX
     * @dev Executes a token swap using the optimal route found via Router V2 Path Provider. Ensures input token is not the target token and validates slippage.
     *
     * @param inputToken_ The ERC20 token to swap from.
     * @param inputRouters_ Array of routes to potentially use for the swap.
     * @param slippage_ The maximum allowed slippage for the swap, in basis points.
     * @param deadline_ Unix timestamp after which the transaction will revert.
     */
    function buybackTokenByV2(
        address inputToken_,
        IRouterV2.route[] calldata inputRouters_,
        uint256 slippage_,
        uint256 deadline_
    ) external returns (uint256 outputAmount);

    /**
     * @notice Retrieves the target token for buybacks.
     * @dev Provides an abstraction layer over internal details, potentially allowing for dynamic updates in the future.
     * @return The address of the token targeted for buyback operations.
     */
    function getBuybackTargetToken() external view returns (address);
}

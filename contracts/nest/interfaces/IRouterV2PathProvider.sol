// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {IRouterV2} from "../../dexV2/interfaces/IRouterV2.sol";

/**
 * @title Interface for Router V2 Path Provider
 * @notice Defines the required functionalities for managing routing paths within a decentralized exchange.
 */
interface IRouterV2PathProvider {
    /**
     * @notice Emitted when a new route is registered for a token
     * @param token Address of the token for which the route is registered
     * @param route Details of the registered route
     */
    event RegisterRouteForToken(address indexed token, IRouterV2.route route);

    /**
     * @notice Emitted when the allowance of a token to be used in input routes is updated
     * @param token Address of the token
     * @param isAllowed New allowance status (true if allowed, false otherwise)
     */
    event SetAllowedTokenInInputRouters(address indexed token, bool indexed isAllowed);

    /**
     * @notice Emitted when a new route is added to a token
     * @param token Address of the token to which the route is added
     * @param route Details of the route added
     */
    event AddRouteToToken(address indexed token, IRouterV2.route route);

    /**
     * @notice Emitted when a route is removed from a token
     * @param token Address of the token from which the route is removed
     * @param route Details of the route removed
     */
    event RemoveRouteFromToken(address indexed token, IRouterV2.route route);

    /**
     * @notice Sets whether a token can be used in input routes
     * @param token_ Address of the token to set the permission
     * @param isAllowed_ Boolean flag to allow or disallow the token
     */
    function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external;

    /**
     * @notice Fetches the address of the router
     * @return The address of the router contract
     */
    function router() external view returns (address);

    /**
     * @notice Fetches the address of the factory
     * @return The address of the factory contract
     */
    function factory() external view returns (address);

    /**
     * @notice Checks if a token is allowed in input routes
     * @param token_ Address of the token to check
     * @return True if the token is allowed, false otherwise
     */
    function isAllowedTokenInInputRoutes(address token_) external view returns (bool);

    /**
     * @notice Retrieves all possible routes between two tokens
     * @param inputToken_ Address of the input token
     * @param outputToken_ Address of the output token
     * @return routes A two-dimensional array of routes
     */
    function getRoutesTokenToToken(address inputToken_, address outputToken_) external view returns (IRouterV2.route[][] memory routes);

    /**
     * @notice Determines the optimal route and output amount for a given input amount between two tokens
     * @param inputToken_ Address of the input token
     * @param outputToken_ Address of the output token
     * @param amountIn_ Amount of the input token
     * @return A tuple containing the optimal route and the output amount
     */
    function getOptimalTokenToTokenRoute(
        address inputToken_,
        address outputToken_,
        uint256 amountIn_
    ) external view returns (IRouterV2.route[] memory, uint256 amountOut);

    /**
     * @notice Calculates the output amount for a specified route given an input amount
     * @param amountIn_ Amount of input tokens
     * @param routes_ Routes to calculate the output amount
     * @return The amount of output tokens
     */
    function getAmountOutQuote(uint256 amountIn_, IRouterV2.route[] calldata routes_) external view returns (uint256);

    /**
     * @notice Validates if all routes provided are valid according to the system's rules
     * @param inputRouters_ Array of routes to validate
     * @return True if all routes are valid, false otherwise
     */
    function isValidInputRoutes(IRouterV2.route[] calldata inputRouters_) external view returns (bool);
}

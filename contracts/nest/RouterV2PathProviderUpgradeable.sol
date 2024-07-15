// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

import {BlastGovernorClaimableSetup} from "../integration/BlastGovernorClaimableSetup.sol";
import {IRouterV2} from "../dexV2/interfaces/IRouterV2.sol";
import {IPairFactory} from "../dexV2/interfaces/IPairFactory.sol";
import {IRouterV2PathProvider} from "./interfaces/IRouterV2PathProvider.sol";
import {IPairQuote} from "./interfaces/IPairQuote.sol";

/**
 * @title Router V2 Path Provider Upgradeable
 * @notice Provides management for token routing paths within a decentralized exchange platform.
 * @dev Utilizes upgradeable patterns from OpenZeppelin, including Ownable and Initializable functionalities.
 */
contract RouterV2PathProviderUpgradeable is IRouterV2PathProvider, Ownable2StepUpgradeable, BlastGovernorClaimableSetup {
    /**
     * @notice Constant used to specify the granularity of quotes in getAmountOutQuote
     */
    uint256 public constant PAIR_QUOTE_GRANULARITY = 3;
    /**
     * @notice Address of the router used for fetching and calculating routes
     * @dev This should be set to the address of the router managing the routes and their calculations.
     */
    address public override router;

    /**
     * @notice Address of the factory used for managing pair creations
     * @dev This should be set to the address of the factory responsible for creating and managing token pairs.
     */
    address public override factory;

    /**
     * @notice Mapping of tokens to their permission status for being used in input routes
     * @dev True if the token is allowed to be used in input routes, false otherwise. This is checked during route validation.
     */
    mapping(address => bool) public override isAllowedTokenInInputRoutes;

    /**
     * @notice Mapping of tokens to their associated routing paths
     * @dev Stores an array of `IRouterV2.route` structs for each token, representing the possible routes for token exchange.
     */
    mapping(address => IRouterV2.route[]) public tokenToRoutes;

    /**
     * @notice Custom error for signaling issues with the path in route calculations
     * @dev This error is thrown when there is a discontinuity in the route path, indicating a misconfiguration.
     */
    error InvalidPath();

    /**
     * @notice Custom error for signaling invalid route configurations
     * @dev This error is thrown when a route configuration does not meet the required criteria, such as incorrect token addresses or settings.
     */
    error InvalidRoute();

    /**
     * @notice Custom error for signaling when a route does not exist in the mapping
     * @dev This error is thrown when an attempt is made to access or modify a non-existent route in the tokenToRoutes mapping.
     */
    error RouteNotExist();

    /**
     * @notice Custom error for signaling when a route already exists in the mapping
     * @dev This error is thrown when there is an attempt to add a route that already exists in the tokenToRoutes mapping, to prevent duplicates.
     */
    error RouteAlreadyExist();

    /**
     * @notice Disables initialization on the implementation to prevent proxy issues.
     * @dev Constructor sets up non-initializable pattern for proxy use.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with necessary governance and operational addresses
     * @dev Sets up blast governance and operational aspects of the contract. This function can only be called once.
     *
     * @param blastGovernor_ The governance address capable of claiming the contract
     * @param factory_ The factory address used to manage pairings
     * @param router_ The router address used to manage routing logic
     */
    function initialize(address blastGovernor_, address factory_, address router_) external initializer {
        _checkAddressZero(factory_);
        _checkAddressZero(router_);

        __BlastGovernorClaimableSetup_init(blastGovernor_);

        __Ownable2Step_init();

        factory = factory_;
        router = router_;
    }

    /**
     * @notice Sets whether a token can be used in input routes
     * @dev Only callable by the owner. Emits a SetAllowedTokenInInputRouters event on change.
     *
     * @param token_ The token address to set the allowance for
     * @param isAllowed_ Boolean flag to allow or disallow the token
     */

    function setAllowedTokenInInputRouters(address token_, bool isAllowed_) external onlyOwner {
        isAllowedTokenInInputRoutes[token_] = isAllowed_;
        emit SetAllowedTokenInInputRouters(token_, isAllowed_);
    }

    /**
     * @notice Adds a new route to a token
     * @dev Verifies route validity and uniqueness before addition. Reverts on errors.
     *
     * @param token_ The token address to add the route to
     * @param route_ The route to add
     */
    function addRouteToToken(address token_, IRouterV2.route memory route_) external onlyOwner {
        _checkAddressZero(token_);
        _checkAddressZero(route_.from);

        if (token_ != route_.to || token_ == route_.from) {
            revert InvalidRoute();
        }

        uint256 length = tokenToRoutes[token_].length;
        for (uint256 i; i < length; ) {
            if (tokenToRoutes[token_][i].from == route_.from && tokenToRoutes[token_][i].stable == route_.stable) {
                revert RouteAlreadyExist();
            }
            unchecked {
                i++;
            }
        }

        tokenToRoutes[token_].push(route_);
        emit AddRouteToToken(token_, route_);
    }

    /**
     * @notice Removes a route from a token
     * @dev Verifies the existence of the route before removal. Emits RemoveRouteFromToken event on success.
     *
     * @param token_ The token address to remove the route from
     * @param route_ The route to remove
     */
    function removeRouteFromToken(address token_, IRouterV2.route memory route_) external onlyOwner {
        _checkAddressZero(token_);
        _checkAddressZero(route_.from);

        if (token_ != route_.to || token_ == route_.from) {
            revert InvalidRoute();
        }

        uint256 length = tokenToRoutes[token_].length;
        for (uint256 i; i < length; ) {
            if (tokenToRoutes[token_][i].from == route_.from && tokenToRoutes[token_][i].stable == route_.stable) {
                tokenToRoutes[token_][i] = tokenToRoutes[token_][length - 1];
                tokenToRoutes[token_].pop();
                emit RemoveRouteFromToken(token_, route_);
                return;
            }
            unchecked {
                i++;
            }
        }
        revert RouteNotExist();
    }

    /**
     * @notice Retrieves all routes associated with a specific token
     * @dev Returns an array of routes for a given token address.
     *
     * @param token_ The token address to retrieve routes for
     * @return An array of IRouterV2.route structures
     */
    function getTokenRoutes(address token_) external view returns (IRouterV2.route[] memory) {
        return tokenToRoutes[token_];
    }

    /**
     * @notice Retrieves all possible routes between two tokens
     * @dev Returns a two-dimensional array of routes for possible paths from inputToken_ to outputToken_
     *
     * @param inputToken_ The address of the input token
     * @param outputToken_ The address of the output token
     * @return A two-dimensional array of routes
     */
    function getRoutesTokenToToken(address inputToken_, address outputToken_) external view returns (IRouterV2.route[][] memory) {
        return _getRoutesTokenToToken(inputToken_, outputToken_);
    }

    /**
     * @notice Determines the optimal route and expected output amount for a token pair given an input amount
     * @dev Searches through all possible routes to find the one that provides the highest output amount
     *
     * @param inputToken_ The address of the input token
     * @param outputToken_ The address of the output token
     * @param amountIn_ The amount of input tokens to trade
     * @return A tuple containing the optimal route and the amount out
     */
    function getOptimalTokenToTokenRoute(
        address inputToken_,
        address outputToken_,
        uint256 amountIn_
    ) external view returns (IRouterV2.route[] memory, uint256 amountOut) {
        IPairFactory factoryCache = IPairFactory(factory);
        IRouterV2 routerCache = IRouterV2(router);

        IRouterV2.route[][] memory routesTokenToToken = _getRoutesTokenToToken(inputToken_, outputToken_);

        uint256 index;
        uint256 bestMultiRouteAmountOut;

        for (uint256 i; i < routesTokenToToken.length; ) {
            if (
                factoryCache.getPair(routesTokenToToken[i][0].from, routesTokenToToken[i][0].to, routesTokenToToken[i][0].stable) !=
                address(0)
            ) {
                try routerCache.getAmountsOut(amountIn_, routesTokenToToken[i]) returns (uint256[] memory amountsOut) {
                    if (amountsOut[2] > bestMultiRouteAmountOut) {
                        bestMultiRouteAmountOut = amountsOut[2];
                        index = i;
                    }
                } catch {}
            }
            unchecked {
                i++;
            }
        }

        IRouterV2.route[] memory singelRoute = new IRouterV2.route[](1);
        uint256 amountOutStabel;
        uint256 amountOutVolatility;

        if (factoryCache.getPair(inputToken_, outputToken_, true) != address(0)) {
            singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: true});
            try routerCache.getAmountsOut(amountIn_, singelRoute) returns (uint256[] memory amountsOut) {
                amountOutStabel = amountsOut[1];
            } catch {}
        }

        if (factoryCache.getPair(inputToken_, outputToken_, false) != address(0)) {
            singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: false});
            try routerCache.getAmountsOut(amountIn_, singelRoute) returns (uint256[] memory amountsOut) {
                amountOutVolatility = amountsOut[1];
            } catch {}
        }

        if (amountOutVolatility >= amountOutStabel && amountOutVolatility >= bestMultiRouteAmountOut) {
            if (amountOutVolatility == 0) {
                return (new IRouterV2.route[](0), 0);
            }
            return (singelRoute, amountOutVolatility);
        } else if (amountOutStabel >= amountOutVolatility && amountOutStabel >= bestMultiRouteAmountOut) {
            singelRoute[0] = IRouterV2.route({from: inputToken_, to: outputToken_, stable: true});
            return (singelRoute, amountOutStabel);
        } else {
            return (routesTokenToToken[index], bestMultiRouteAmountOut);
        }
    }

    /**
     * @notice Calculates the output amount for a specified route given an amount of input tokens, using granular quoting
     * @dev This function extends getAmountOut by incorporating quoting functionality, which factors in additional parameters like granularity.
     *
     * @param amountIn_ The amount of input tokens
     * @param routes_ The routes to be evaluated
     * @return The output amount of tokens after trading along the specified routes
     */
    function getAmountOutQuote(uint256 amountIn_, IRouterV2.route[] calldata routes_) external view returns (uint256) {
        if (routes_.length == 0) {
            revert InvalidPath();
        }
        for (uint256 i; i < routes_.length - 1; ) {
            if (routes_[i].to != routes_[i + 1].from) {
                revert InvalidPath();
            }
            unchecked {
                i++;
            }
        }

        IPairFactory pairFactoryCache = IPairFactory(factory);
        for (uint256 i; i < routes_.length; ) {
            address pair = pairFactoryCache.getPair(routes_[i].from, routes_[i].to, routes_[i].stable);
            if (pair == address(0)) {
                return 0;
            }
            amountIn_ = IPairQuote(pair).quote(routes_[i].from, amountIn_, PAIR_QUOTE_GRANULARITY);

            unchecked {
                i++;
            }
        }
        return amountIn_;
    }

    /**
     * @notice Checks if all routes in a provided array are valid according to the contract's rules
     * @dev Iterates through each route in the array to check if they are allowed in input routes.
     *
     * @param inputRouters_ An array of routes to be validated
     * @return True if all routes are valid, false otherwise
     */
    function isValidInputRoutes(IRouterV2.route[] calldata inputRouters_) external view returns (bool) {
        for (uint256 i; i < inputRouters_.length; ) {
            if (!isAllowedTokenInInputRoutes[inputRouters_[i].from]) {
                return false;
            }
            unchecked {
                i++;
            }
        }
        return true;
    }

    /**
     * @notice Retrieves a list of possible routes between two tokens, considering stable and volatile routes
     * @dev This function calculates and returns all viable routes between `inputToken_` and `outputToken_` considering both stability settings.
     * It first determines the number of potential routes and then populates them with both stable and volatile path options.
     *
     * @param inputToken_ The address of the input token for which routes are being sought.
     * @param outputToken_ The address of the output token to which routes are being mapped.
     * @return routes A two-dimensional array of `IRouterV2.route`, where each primary array entry contains two routes: one stable and one volatile.
     */
    function _getRoutesTokenToToken(address inputToken_, address outputToken_) internal view returns (IRouterV2.route[][] memory routes) {
        IRouterV2.route[] memory tokenRoutes = tokenToRoutes[outputToken_];

        uint256 actualSize;
        for (uint256 i; i < tokenRoutes.length; ) {
            if (outputToken_ == tokenRoutes[i].to && inputToken_ != tokenRoutes[i].from) {
                actualSize++;
            }
            unchecked {
                i++;
            }
        }

        routes = new IRouterV2.route[][](actualSize * 2);
        uint256 count;
        for (uint256 i; i < tokenRoutes.length; ) {
            IRouterV2.route memory route = tokenToRoutes[outputToken_][i];
            if (outputToken_ == route.to && inputToken_ != route.from) {
                routes[count] = new IRouterV2.route[](2);
                routes[count + 1] = new IRouterV2.route[](2);

                routes[count][0] = IRouterV2.route({from: inputToken_, to: route.from, stable: true});
                routes[count][1] = route;

                routes[count + 1][0] = IRouterV2.route({from: inputToken_, to: route.from, stable: false});
                routes[count + 1][1] = route;

                unchecked {
                    count += 2;
                }
            }
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Checked provided address on zero value, throw AddressZero error in case when addr_ is zero
     *
     * @param addr_ The address which will checked on zero
     */
    function _checkAddressZero(address addr_) internal pure {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

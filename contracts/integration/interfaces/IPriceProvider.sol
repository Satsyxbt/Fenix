// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IPriceProvider Interface
 * @dev Interface for the price provider that defines a function to retrieve the USD to FNX price.
 */
interface IPriceProvider {
    /**
     * @notice Retrieves the current price of 1 USD in FNX tokens
     * @return Price of 1 USD in FNX tokens.
     */
    function getUsdToFNXPrice() external view returns (uint256);
}

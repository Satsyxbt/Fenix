// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IPriceProvider Interface
 * @dev Interface for the price provider that defines a function to retrieve the USD to TOKEN price.
 */
interface IPriceProvider {
    /**
     * @notice Retrieves the current price of 1 USD in TOKEN tokens
     * @return Price of 1 USD in TOKEN tokens.
     */
    function getUsdToTokenPrice() external view returns (uint256);
}

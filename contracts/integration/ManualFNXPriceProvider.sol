// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IPriceProvider} from "./interfaces/IPriceProvider.sol";
import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ManualFNXPriceProvider
 * @notice This contract allows for manually setting the price of the FNX token in USD.
 *
 * It is intended for use cases where the price needs to be controlled or set by an authorized account.
 * Unlike automatic price feeds, this contract requires an administrator to provide the price.
 * *
 * @dev Inherits from `BlastGovernorClaimableSetup` for integration with blast.
 * Inherits from `Ownable` for access control, allowing only the owner to set the price.
 */
contract ManualFNXPriceProvider is IPriceProvider, Ownable, BlastGovernorClaimableSetup {
    /**
     * @dev Emitted when the price is updated.
     * @param oldPrice The previous price of 1 USD in FNX tokens.
     * @param newPrice The new price of 1 USD in FNX tokens.
     */
    event SetPrice(uint256 indexed oldPrice, uint256 indexed newPrice);

    /**
     * @dev The current price of 1 USD in FNX tokens.
     */
    uint256 public price;

    /**
     * @dev Thrown when attempting to retrieve the price before it has been set.
     */
    error PriceNotSetup();

    /**
     * @notice Initializes the contract with the given Blast Governor address and initial price.
     * @dev Disables further initializers to prevent re-initialization.
     * @param blastGovernor_ The address of the Blast Governor contract.
     * @param price_ The initial price of 1 USD in FNX tokens.
     */
    constructor(address blastGovernor_, uint256 price_) Ownable() {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        price = price_;
    }

    /**
     * @notice Sets the price of 1 USD in FNX tokens.
     * @dev Only callable by the owner of the contract.
     * @param price_ The new price of 1 USD in FNX tokens.
     */
    function setFnxPrice(uint256 price_) external onlyOwner {
        uint256 oldPrice = price;
        price = price_;
        emit SetPrice(oldPrice, price_);
    }

    /**
     * @notice Retrieves the current price of 1 USD in FNX tokens.
     * @dev Reverts if the price has not been set.
     * @return The price of 1 USD in FNX tokens.
     */
    function getUsdToFNXPrice() external view override returns (uint256) {
        uint256 priceCache = price;
        if (priceCache == 0) {
            revert PriceNotSetup();
        }
        return priceCache;
    }
}

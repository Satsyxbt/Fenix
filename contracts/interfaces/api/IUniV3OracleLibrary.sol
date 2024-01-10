// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IUniV3OracleLibrary {
    function getQuoteAtTick(
        int24 tick,
        uint128 baseAmount,
        address baseToken,
        address quoteToken
    ) external pure returns (uint256 quoteAmount);
}

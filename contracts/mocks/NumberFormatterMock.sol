// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {NumberFormatter} from "../core/libraries/NumberFormatter.sol";

contract NumberFormatterMock {
    function formatNumber(uint256 number_, uint8 decimals_, uint8 limitFactionNumbers_) external pure returns (string memory) {
        return NumberFormatter.formatNumber(number_, decimals_, limitFactionNumbers_);
    }

    function withThousandSeparators(uint256 value_) external pure returns (string memory) {
        return NumberFormatter.withThousandSeparators(value_);
    }

    function toStringWithLeadingZeros(uint256 value_, uint8 decimals_) external pure returns (string memory) {
        return NumberFormatter.toStringWithLeadingZeros(value_, decimals_);
    }

    function limitFactionNumbers(string memory strValue, uint8 limit) external pure returns (string memory) {
        return NumberFormatter.limitFactionNumbers(strValue, limit);
    }
}

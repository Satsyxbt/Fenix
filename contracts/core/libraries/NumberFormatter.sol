// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

library NumberFormatter {
    using Strings for uint256;

    function formatNumber(uint256 number, uint8 decimals) internal pure returns (string memory) {
        uint256 integerPart = number / 10 ** decimals;
        uint256 fractionalPart = number % 10 ** decimals;
        if (decimals == 0) {
            return withThousandSeparators(integerPart);
        }
        return string(abi.encodePacked(withThousandSeparators(integerPart), ".", toStringWithLeadingZeros(fractionalPart, decimals)));
    }

    function withThousandSeparators(uint256 value) internal pure returns (string memory) {
        string memory strValue = value.toString();
        bytes memory strBytes = bytes(strValue);
        uint256 length = strBytes.length;
        uint256 separatorCount = (length - 1) / 3;
        bytes memory result = new bytes(length + separatorCount);

        uint256 j = 1;
        for (uint256 i; i < length; ) {
            if (i != 0 && (length - i) % 3 == 0) {
                result[j - 1] = ",";
                unchecked {
                    j++;
                }
            }
            result[j - 1] = strBytes[i];
            unchecked {
                j++;
                i++;
            }
        }

        return string(result);
    }

    function toStringWithLeadingZeros(uint256 value, uint8 decimals) internal pure returns (string memory) {
        if (decimals == 0) {
            return "0";
        }

        string memory strValue = value.toString();
        uint256 length = bytes(strValue).length;

        uint256 requiredZeros = decimals > length ? decimals - length : 0;
        bytes memory result = new bytes(requiredZeros + length);

        for (uint256 i = 0; i < requiredZeros; i++) {
            result[i] = "0";
        }

        for (uint256 i = 0; i < length; i++) {
            result[i + requiredZeros] = bytes(strValue)[i];
        }

        uint256 trimIndex = result.length;
        while (trimIndex > 0 && result[trimIndex - 1] == "0") {
            trimIndex--;
        }

        if (trimIndex == 0) {
            return "0";
        }

        bytes memory trimmedResult = new bytes(trimIndex);
        for (uint256 i = 0; i < trimIndex; i++) {
            trimmedResult[i] = result[i];
        }

        return string(trimmedResult);
    }
}

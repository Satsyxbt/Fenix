// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

import {IVeArtProxyUpgradeable} from "./interfaces/IVeArtProxyUpgradeable.sol";

/**
 * @title VeArtProxyUpgradeable Contract
 * @author The Fenix Protocol team
 * @dev This contract provides a `tokenURI` function for generating on-chain art for tokens.
 *      The art is generated as SVG images and encoded in base64 format, making each token
 *      have a unique representation.
 */
contract VeArtProxyUpgradeable is IVeArtProxyUpgradeable {
    using Strings for uint256;

    /**
     * @dev Generates a {ERC721.tokenURI} with on-chain generated art.
     *
     * This function generates an SVG image representing the state of the token.
     * The SVG includes visual representations of the token's current voting power,
     * the timestamp of when the token's lock ends, and the amount of tokens locked.
     * This SVG image is encoded in base64 and included in a JSON metadata structure,
     * which is also encoded in base64. This metadata provides a unique, on-chain
     * representation for each token, enhancing its traceability and uniqueness.
     *
     * @param tokenId_ The ID of the token. Used to uniquely identify the token for which the URI is being generated.
     * @param balanceOf_ Current voting power associated with the token.
     * @param lockedEnd_ The timestamp indicating when the token's lock period will end.
     * @param value_ The amount of tokens that are locked under this `tokenId_`.
     * @return output The base64 encoded JSON metadata for the token
     */
    function tokenURI(
        uint256 tokenId_,
        uint256 balanceOf_,
        uint256 lockedEnd_,
        uint256 value_
    ) external pure virtual override returns (string memory output) {
        output = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.base { fill: white; font-family: serif; font-size: 14px; }</style><rect width="100%" height="100%" fill="black" /><text x="10" y="20" class="base">',
            "token ",
            tokenId_.toString(),
            '</text><text x="10" y="40" class="base">',
            "balanceOf ",
            balanceOf_.toString(),
            '</text><text x="10" y="60" class="base">',
            "locked_end ",
            lockedEnd_.toString(),
            '</text><text x="10" y="80" class="base">',
            "value ",
            value_.toString(),
            "</text></svg>"
        );
        output = string.concat(
            "data:application/json;base64,",
            Base64.encode(
                bytes(
                    string.concat(
                        '{"name": "lock #',
                        tokenId_.toString(),
                        '", "description": "Thena locks, can be used to boost gauge yields, vote on token emission, and receive bribes", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '"}'
                    )
                )
            )
        );
    }
}

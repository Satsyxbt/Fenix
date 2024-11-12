// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IVeArtProxy Interface
 * @author Fenix Protocol team
 * @dev Interface for the VeArtProxyUpgradeable contract.
 *      This interface outlines the tokenURI function which is responsible
 *      for generating on-chain art in the form of SVG images, encoded in base64 format,
 *      providing a unique visual representation for each token.
 */
interface IVeArtProxy {
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
     * @return output The base64 encoded JSON metadata for the token
     */
    function tokenURI(uint256 tokenId_) external view returns (string memory output);
}

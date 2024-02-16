// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

import {DateTime} from "./libraries/DateTime.sol";
import {NumberFormatter, Strings} from "./libraries/NumberFormatter.sol";

import {IVeArtProxyUpgradeable} from "./interfaces/IVeArtProxyUpgradeable.sol";

/**
 * @title VeArtProxyUpgradeable Contract
 * @author The Fenix Protocol team
 * @dev This contract provides a `tokenURI` function for generating on-chain art for tokens.
 *      The art is generated as SVG images and encoded in base64 format, making each token
 *      have a unique representation.
 */
contract VeArtProxyUpgradeable is IVeArtProxyUpgradeable {
    using DateTime for uint256;
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
     * @param / The amount of tokens that are locked under this `tokenId_`.
     * @return output The base64 encoded JSON metadata for the token
     */
    function tokenURI(
        uint256 tokenId_,
        uint256 balanceOf_,
        uint256 lockedEnd_,
        uint256 /*value_*/
    ) external pure virtual override returns (string memory output) {
        return
            string.concat(
                "data:application/json;base64,",
                Base64.encode(
                    bytes(
                        string.concat(
                            '{"name": "lock #',
                            tokenId_.toString(),
                            '", "description": "Fenix locks, can be used to boost gauge yields, vote on token emission, and receive bribes", "image": "data:image/svg+xml;base64,',
                            Base64.encode(bytes(generateSVG(tokenId_, balanceOf_, lockedEnd_))),
                            '"}'
                        )
                    )
                )
            );
    }

    function generateSVG(uint256 tokenId_, uint256 balanceOf_, uint256 lockedEnd_) public pure returns (string memory svg) {
        return
            string.concat(
                '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" fill="none"><style><![CDATA[.B{font-family:Poppins}.C{color-interpolation-filters:sRGB}.D{flood-opacity:0}.E{fill-opacity:.2}.F{fill:#8f9fa8}]]></style><path fill="#2b2d32" d="M0 0h512v512H0z"/><rect width="512" height="512" rx="23.704" fill="#212631"/><g stroke-width=".474"><path d="M253.63 323.793V188.057L362.667 133.215V268.95L253.63 323.793Z" stroke="url(#F)"/><path d="M253.63 323.793V188.057L145.067 133.215V268.95L253.63 323.793Z" stroke="url(#G)"/><path d="M362.667 132.495L253.639 187.733L145.304 132.741L252.726 76.8L362.667 132.495Z" stroke="url(#H)"/><path d="M362.43 268.554L253.402 323.793L145.067 268.8L252.489 212.859L362.43 268.554Z" stroke="url(#I)"/></g><path d="M362.43 268.554l-109.028 55.239L145.067 268.8l107.422-55.941 109.941 55.695z" fill="url(#J)"/><path d="M253.867 268.326c32.335 0 58.548-26.213 58.548-58.548s-26.213-58.548-58.548-58.548-58.549 26.213-58.549 58.548 26.213 58.548 58.549 58.548z" fill="#fff"/><path d="M225.05 200.172c9.972 5.947 24.609 14.18 24.609 14.18l-2.653-7.867s-27.262-13.174-31.013-18.754c0 .091-.914 6.495 9.057 12.441z" fill="url(#K)"/><path d="M275.913 206.119l-17.838 10.795-4.209 10.428-4.116-10.246-17.839-10.794s-21.407-12.808-22.962-17.839c0 0 .366 9.788 8.416 15.277s29 17.29 29 17.29l7.501 19.486v.274l.092-.183.091.366v-.64l7.502-19.486s21.041-11.801 28.999-17.29c8.051-5.489 8.417-15.277 8.417-15.277-1.738 5.031-23.054 17.839-23.054 17.839z" fill="url(#L)"/><path d="M282.683 199.989c9.972-5.946 9.057-12.35 9.057-12.35-3.751 5.489-31.012 18.754-31.012 18.754l-2.653 7.868c0-.092 14.637-8.234 24.608-14.272z" fill="url(#M)"/><path d="M259.173 206.485l-5.398-9.789-5.306 9.789 5.306 18.022 5.398-18.022z" fill="url(#N)"/><path d="M245.999 223.775l-21.224-12.625s-.365 12.808 21.224 12.625z" fill="url(#O)"/><path d="M261.643 223.775c21.589.183 21.223-12.625 21.223-12.625l-21.223 12.625z" fill="url(#P)"/><g filter="url(#A)" class="E"><path d="M362.667 132.969l-109.028 55.238-108.335-54.992 107.422-55.941 109.941 55.695z" fill="url(#Q)"/></g><g filter="url(#B)" class="E"><path d="M471.467 324.495l-109.028 55.238-108.335-54.992L361.526 268.8l109.941 55.695z" fill="url(#R)"/></g><g opacity=".2" filter="url(#C)" class="E"><path d="M362.43 379.488l-109.028 55.238-108.335-54.993 107.422-55.94 109.941 55.695z" fill="url(#S)"/></g><g opacity=".2" filter="url(#D)" class="E"><path d="M257.185 324.021l-109.028 55.238-108.335-54.992 107.423-55.941 109.94 55.695z" fill="url(#T)"/></g><g filter="url(#E)"><path d="M253.63 323.793V188.057L145.067 133.215V268.95L253.63 323.793Z" fill="url(#U)"/></g><path d="M52.148 71.252c10.997 0 19.911-8.915 19.911-19.911S63.145 31.43 52.148 31.43s-19.911 8.914-19.911 19.911 8.915 19.911 19.911 19.911z" fill="url(#V)"/><path d="M42.348 48.074l8.369 4.822-.902-2.676s-9.271-4.48-10.547-6.378c0 .031-.311 2.209 3.08 4.231zm17.298 2.022l-6.067 3.671-1.431 3.547-1.4-3.485-6.067-3.671s-7.28-4.356-7.809-6.067c0 0 .125 3.329 2.862 5.196s9.862 5.88 9.862 5.88l2.551 6.627v.093l.031-.062.031.124v-.218l2.551-6.627s7.156-4.013 9.862-5.88c2.738-1.867 2.862-5.196 2.862-5.196-.591 1.711-7.84 6.067-7.84 6.067zm2.302-2.084c3.391-2.022 3.08-4.2 3.08-4.2-1.276 1.867-10.547 6.378-10.547 6.378l-.902 2.676c0-.031 4.978-2.8 8.369-4.853zm-7.995 2.209l-1.836-3.329-1.804 3.329 1.804 6.129 1.836-6.129zm-4.48 5.88l-7.218-4.293s-.124 4.355 7.218 4.293zm5.32 0c7.342.062 7.218-4.293 7.218-4.293l-7.218 4.293z" fill="#fff"/><text xml:space="preserve" style="white-space:pre" font-size="12" letter-spacing="0em" class="B F"><tspan x="83.437" y="43.541">Value</tspan></text><text fill="#fff" xml:space="preserve" style="white-space:pre" font-size="16" font-weight="500" letter-spacing="0em" class="B"><tspan x="83.437" y="65.941">',
                NumberFormatter.formatNumber(balanceOf_, 18),
                '</tspan></text><path d="M54.064 450.374H43.793v-2.568c-.002-.762.223-1.508.645-2.143a3.85 3.85 0 0 1 1.727-1.423 3.86 3.86 0 0 1 2.227-.222c.748.148 1.435.515 1.975 1.053a3.96 3.96 0 0 1 1.002 1.772 1.28 1.28 0 0 0 .218.452 1.29 1.29 0 0 0 .848.501 1.3 1.3 0 0 0 .501-.028c.164-.042.317-.116.452-.218s.249-.229.334-.374.142-.306.166-.474.014-.337-.028-.501c-.293-1.111-.873-2.125-1.682-2.94-.898-.896-2.042-1.505-3.287-1.751s-2.534-.118-3.706.368a6.42 6.42 0 0 0-3.959 5.928v2.568c-1.022 0-2.001.406-2.724 1.128s-1.128 1.702-1.128 2.724v8.988a3.85 3.85 0 0 0 3.852 3.851h12.84a3.85 3.85 0 0 0 3.852-3.851v-8.988c0-1.022-.406-2.001-1.128-2.724s-1.702-1.128-2.724-1.128zm1.284 12.84c0 .34-.135.667-.376.908s-.567.376-.908.376h-12.84c-.34 0-.667-.136-.908-.376s-.376-.568-.376-.908v-8.988c0-.341.135-.667.376-.908s.567-.376.908-.376h12.84c.34 0 .667.135.908.376s.376.567.376.908v8.988z" fill="url(#W)"/><text xml:space="preserve" style="white-space:pre" font-size="12" letter-spacing="0em" class="B F"><tspan x="71.585" y="447.926">Unlocks</tspan></text><text fill="#fff" xml:space="preserve" style="white-space:pre" font-size="14" font-weight="600" letter-spacing="0em" class="B"><tspan x="71.585" y="468.126">',
                toDateString(lockedEnd_),
                '</tspan></text><text xml:space="preserve" style="white-space:pre" font-size="12" letter-spacing="0em" class="B F"><tspan x="428.563" y="447.926">Token ID</tspan></text><text fill="#fff" xml:space="preserve" style="white-space:pre" font-size="14" font-weight="600" letter-spacing="0em" class="B"><tspan x="443.563" y="468.126">',
                tokenId_.toString(),
                '</tspan></text><defs><filter id="A" x="131.081" y="63.052" width="245.807" height="139.378" filterUnits="userSpaceOnUse" class="C"><feFlood class="D"/><feGaussianBlur stdDeviation="7.111"/><feComposite in2="SourceAlpha" operator="in"/><feBlend in="SourceGraphic"/></filter><filter id="B" x="239.881" y="254.578" width="245.807" height="139.378" filterUnits="userSpaceOnUse" class="C"><feFlood class="D"/><feGaussianBlur stdDeviation="7.111"/><feComposite in2="SourceAlpha" operator="in"/><feBlend in="SourceGraphic"/></filter><filter id="C" x="130.844" y="309.57" width="245.807" height="139.378" filterUnits="userSpaceOnUse" class="C"><feFlood class="D"/><feGaussianBlur stdDeviation="7.111"/><feComposite in2="SourceAlpha" operator="in"/><feBlend in="SourceGraphic"/></filter><filter id="D" x="25.6" y="254.104" width="245.807" height="139.378" filterUnits="userSpaceOnUse" class="C"><feFlood class="D"/><feGaussianBlur stdDeviation="7.111"/><feComposite in2="SourceAlpha" operator="in"/><feBlend in="SourceGraphic"/></filter><filter id="E" x="130.844" y="118.993" width="137.007" height="219.022" filterUnits="userSpaceOnUse" class="C"><feFlood class="D"/><feGaussianBlur stdDeviation="7.111"/><feComposite in2="SourceAlpha" operator="in"/><feBlend in="SourceGraphic"/></filter><linearGradient id="F" x1="308.148" y1="133.215" x2="308.148" y2="323.793" xlink:href="#X"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="G" x1="199.348" y1="133.215" x2="199.348" y2="323.793" xlink:href="#X"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="H" x1="253.985" y1="76.8" x2="253.985" y2="187.733" xlink:href="#X"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="I" x1="253.748" y1="212.859" x2="253.748" y2="323.793" xlink:href="#X"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="J" x1="253.748" y1="212.859" x2="253.748" y2="323.793" xlink:href="#X"><stop stop-color="#b5c9db"/><stop offset=".695" stop-color="#b5c9db" stop-opacity="0"/></linearGradient><linearGradient id="K" x1="216.82" y1="209.645" x2="282.569" y2="174.552" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="L" x1="222.203" y1="219.73" x2="287.951" y2="184.637" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="M" x1="226.069" y1="226.973" x2="291.818" y2="191.88" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".065" stop-color="#e92305"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="N" x1="225.403" y1="225.726" x2="291.152" y2="190.633" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="O" x1="223.959" y1="223.547" x2="289.708" y2="188.455" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="P" x1="233.148" y1="240.763" x2="298.897" y2="205.67" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="Q" x1="253.985" y1="77.274" x2="253.985" y2="188.207" xlink:href="#X"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".53" stop-color="#fff" stop-opacity=".53"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="R" x1="362.785" y1="268.8" x2="362.785" y2="379.733" xlink:href="#X"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".53" stop-color="#fff" stop-opacity=".53"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="S" x1="253.748" y1="323.793" x2="253.748" y2="434.726" xlink:href="#X"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".53" stop-color="#fff" stop-opacity=".53"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="T" x1="148.504" y1="268.326" x2="148.504" y2="379.259" xlink:href="#X"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".53" stop-color="#fff" stop-opacity=".53"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="U" x1="199.348" y1="133.215" x2="199.348" y2="323.793" xlink:href="#X"><stop stop-color="#fff" stop-opacity="0"/><stop offset=".53" stop-color="#fff" stop-opacity=".53"/><stop offset="1" stop-color="#fff"/></linearGradient><linearGradient id="V" x1="32.242" y1="51.343" x2="72.065" y2="51.343" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="W" x1="9.804" y1="501.55" x2="86.61" y2="482.015" xlink:href="#X"><stop stop-color="#e71505"/><stop offset=".732" stop-color="#ffb400"/><stop offset="1" stop-color="#fff888"/></linearGradient><linearGradient id="X" gradientUnits="userSpaceOnUse"/></defs></svg>'
            );
    }

    function toDateString(uint256 timestamp) public pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day) = timestamp.timestampToDate();
        string[12] memory monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return string.concat(day.toString(), " ", monthNames[month - 1], ", ", year.toString());
    }
}

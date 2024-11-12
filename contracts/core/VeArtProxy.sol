// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {Base64Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/Base64Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

import {LibVotingEscrowUtils} from "./libraries/LibVotingEscrowUtils.sol";

import {DateTime} from "./libraries/DateTime.sol";
import {NumberFormatter, Strings} from "./libraries/NumberFormatter.sol";

import {IVeArtProxy} from "./interfaces/IVeArtProxy.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";
import {IManagedNFTManager} from "../nest/interfaces/IManagedNFTManager.sol";
import {ICompoundVeFNXManagedNFTStrategy} from "../nest/interfaces/ICompoundVeFNXManagedNFTStrategy.sol";
import "./interfaces/IVeArtProxyStatic.sol";

/**
 * @title VeArtProxy Contract
 * @author The Fenix Protocol team
 * @notice This contract provides a `tokenURI` function for generating on-chain art for tokens.
 * @dev The art is generated as SVG images and encoded in base64 format, making each token have a unique representation.
 */
contract VeArtProxy is IVeArtProxy {
    using DateTime for uint256;
    using Strings for uint256;

    address public artProxyStatic;
    address public votingEscrow;
    address public managedNftManager;

    /**
     * @notice Constructor to initialize the VeArtProxy contract.
     * @param artProxyStatic_ Address of the static art proxy contract.
     * @param votingEscrow_ Address of the voting escrow contract.
     * @param managedNftManager_ Address of the managed NFT manager contract.
     */
    constructor(address artProxyStatic_, address votingEscrow_, address managedNftManager_) {
        artProxyStatic = artProxyStatic_;
        votingEscrow = votingEscrow_;
        managedNftManager = managedNftManager_;
    }

    /**
     * @notice Generates the token URI for a given token ID.
     * @dev This function generates an SVG image representing the state of the token.
     *      The SVG includes visual representations of the token's current voting power,
     *      the timestamp of when the token's lock ends, and the amount of tokens locked.
     *      This SVG image is encoded in base64 and included in a JSON metadata structure,
     *      which is also encoded in base64. This metadata provides a unique, on-chain
     *      representation for each token, enhancing its traceability and uniqueness.
     * @param tokenId_ The ID of the token for which the URI is being generated.
     * @return output The base64 encoded JSON metadata for the token.
     */
    function tokenURI(uint256 tokenId_) external view virtual override returns (string memory output) {
        IVotingEscrow votingEscrowCache = IVotingEscrow(votingEscrow);
        IVotingEscrow.TokenState memory state = votingEscrowCache.getNftState(tokenId_);

        string memory strategyName;
        uint256 balance;
        uint256 votingPower;
        bool isTransferable = votingEscrowCache.isTransferable(tokenId_);
        uint256 lockedEnd = (state.isAttached || state.locked.isPermanentLocked)
            ? LibVotingEscrowUtils.maxUnlockTimestamp()
            : state.locked.end;
        if (state.isAttached) {
            address strategy = IERC721Upgradeable(address(votingEscrowCache)).ownerOf(
                IManagedNFTManager(managedNftManager).getAttachedManagedTokenId(tokenId_)
            );
            ICompoundVeFNXManagedNFTStrategy strategyTyped = ICompoundVeFNXManagedNFTStrategy(strategy);
            balance = strategyTyped.balanceOf(tokenId_);
            votingPower = balance;
            strategyName = strategyTyped.name();
        } else {
            balance = uint256(int256(state.locked.amount));
            votingPower = votingEscrowCache.balanceOfNftIgnoreOwnershipChange(tokenId_);
        }
        return
            string.concat(
                "data:application/json;base64,",
                Base64Upgradeable.encode(
                    bytes(
                        string.concat(
                            '{"name": "lock #',
                            tokenId_.toString(),
                            '", "description": "Fenix locks, can be used to boost gauge yields, vote on token emission, and receive bribes", "image": "data:image/svg+xml;base64,',
                            Base64Upgradeable.encode(
                                bytes(
                                    generateSVG(
                                        tokenId_,
                                        balance,
                                        votingPower,
                                        lockedEnd,
                                        state.locked.isPermanentLocked,
                                        isTransferable,
                                        state.isAttached,
                                        strategyName
                                    )
                                )
                            ),
                            '"}'
                        )
                    )
                )
            );
    }

    /**
     * @notice Generates an SVG image representing the state of a given token.
     * @dev This function generates an SVG representation of the token's balance, voting power,
     *      locked end date, and other attributes.
     * @param tokenId_ The ID of the token for which the SVG is being generated.
     * @param balance_ The balance of the token.
     * @param votingPower_ The voting power of the token.
     * @param lockedEnd_ The timestamp when the token's lock ends.
     * @param isPermanentLock_ Indicates if the token is permanently locked.
     * @param isTransferable_ Indicates if the token is transferable.
     * @param isAttached_ Indicates if the token is attached to a strategy.
     * @param nestStrategyName_ The name of the strategy the token is attached to (if applicable).
     * @return svg The SVG representation of the token.
     */
    function generateSVG(
        uint256 tokenId_,
        uint256 balance_,
        uint256 votingPower_,
        uint256 lockedEnd_,
        bool isPermanentLock_,
        bool isTransferable_,
        bool isAttached_,
        string memory nestStrategyName_
    ) public view returns (string memory svg) {
        IVeArtProxyStatic artStatic = IVeArtProxyStatic(artProxyStatic);
        return
            string.concat(
                IVeArtProxyStatic(artProxyStatic).startPart(),
                '<text x="68" y="61" class="prefix__font-poppins" fill="#fff">',
                NumberFormatter.formatNumber(balance_, 18, 2),
                '</text><text x="68" y="95" class="prefix__font-poppins" fill="#fff">',
                NumberFormatter.formatNumber(votingPower_, 18, 2),
                '</text><text x="61" y="399" class="prefix__font-poppins prefix__fp-600" fill="#fff">',
                toDateString(lockedEnd_),
                '</text><text x="424" y="399" class="prefix__font-poppins prefix__fp-600" text-anchor="end" fill="#fff">',
                tokenId_.toString(),
                "</text>",
                isAttached_
                    ? string.concat(
                        '<path fill="#8F9FA8" d="M312.15 382h-.895l-3.602-5.461V382h-.895v-6.869h.895l3.602 5.452v-5.452h.895V382zm6.447-2.903c0 .171-.01.351-.03.541h-4.31c.033.532.213.948.541 1.25a1.77 1.77 0 001.211.443c.387 0 .708-.089.964-.266.263-.184.446-.426.551-.728h.965a2.345 2.345 0 01-.866 1.269c-.433.322-.971.483-1.614.483a2.75 2.75 0 01-1.378-.345 2.446 2.446 0 01-.944-.974c-.23-.426-.345-.918-.345-1.476 0-.558.112-1.046.335-1.466.223-.42.534-.742.935-.965a2.795 2.795 0 011.397-.344c.512 0 .964.111 1.358.335.393.223.695.531.905.924.217.388.325.827.325 1.319zm-.925-.187c0-.341-.076-.633-.226-.876a1.432 1.432 0 00-.62-.561 1.854 1.854 0 00-.857-.196c-.452 0-.839.144-1.161.433-.315.288-.495.688-.541 1.2h3.405zm4.016 3.179c-.413 0-.784-.069-1.112-.207a1.921 1.921 0 01-.777-.591 1.58 1.58 0 01-.315-.875h.925a.912.912 0 00.374.659c.229.171.528.256.895.256.341 0 .61-.076.807-.226a.692.692 0 00.295-.571.554.554 0 00-.315-.522c-.21-.118-.534-.233-.974-.344-.4-.105-.728-.21-.984-.315a1.868 1.868 0 01-.649-.482c-.178-.217-.266-.499-.266-.846 0-.276.082-.529.246-.758.164-.23.397-.41.699-.541a2.455 2.455 0 011.033-.207c.597 0 1.079.151 1.446.453.368.301.565.715.591 1.239h-.896a.917.917 0 00-.344-.679c-.204-.17-.479-.255-.827-.255-.321 0-.577.069-.767.206a.638.638 0 00-.286.542c0 .177.056.324.168.442.118.112.262.204.433.276.177.065.419.141.728.226.387.105.702.21.944.315.243.098.45.249.62.453.178.203.269.469.276.797 0 .295-.082.561-.246.797a1.673 1.673 0 01-.699.561 2.5 2.5 0 01-1.023.197zm4.324-4.743v3.178c0 .262.056.449.168.561.111.105.305.157.58.157h.659V382h-.806c-.499 0-.873-.115-1.122-.344-.25-.23-.374-.607-.374-1.132v-3.178h-.699v-.739h.699v-1.357h.895v1.357h1.407v.739h-1.407zm7.291 4.723c-.453 0-.86-.079-1.221-.236a2.082 2.082 0 01-.836-.669 1.745 1.745 0 01-.315-.994h.955c.032.321.164.593.393.816.236.217.578.325 1.024.325.426 0 .761-.105 1.003-.315.25-.216.374-.492.374-.826 0-.263-.072-.476-.216-.64a1.388 1.388 0 00-.541-.374 8.521 8.521 0 00-.876-.275 7.9 7.9 0 01-1.092-.355 1.808 1.808 0 01-.699-.551c-.19-.256-.286-.597-.286-1.023 0-.374.096-.705.286-.994.19-.289.456-.512.797-.669a2.848 2.848 0 011.191-.236c.642 0 1.167.16 1.574.482.413.321.646.748.699 1.279h-.984c-.033-.262-.171-.492-.414-.689-.242-.203-.564-.305-.964-.305-.374 0-.679.099-.915.295-.236.191-.354.46-.354.807 0 .25.069.453.206.61.145.158.318.279.522.365.21.078.502.17.876.275.452.125.816.249 1.092.374.275.118.512.305.708.561.197.249.296.59.296 1.023 0 .335-.089.65-.266.945-.177.295-.44.535-.787.718-.348.184-.758.276-1.23.276zm4.693-4.723v3.178c0 .262.055.449.167.561.111.105.305.157.58.157h.66V382h-.807c-.499 0-.873-.115-1.122-.344-.249-.23-.374-.607-.374-1.132v-3.178h-.699v-.739h.699v-1.357h.896v1.357h1.407v.739h-1.407zm3.387.137c.158-.308.381-.547.669-.718.296-.171.653-.256 1.073-.256v.925h-.236c-1.004 0-1.506.545-1.506 1.634V382h-.895v-5.393h.895v.876zm2.441 1.801c0-.551.112-1.033.335-1.446.223-.42.528-.745.915-.975.393-.229.83-.344 1.309-.344.472 0 .882.102 1.23.305.347.203.606.459.777.768v-.985h.905V382h-.905v-1.004a2.138 2.138 0 01-.797.788c-.348.203-.754.305-1.22.305-.479 0-.912-.119-1.299-.355a2.48 2.48 0 01-.915-.994 3.092 3.092 0 01-.335-1.456zm4.566.01c0-.407-.082-.761-.246-1.063a1.696 1.696 0 00-.669-.689 1.758 1.758 0 00-.915-.246c-.335 0-.64.079-.915.236a1.72 1.72 0 00-.66.689c-.164.302-.246.656-.246 1.063 0 .413.082.774.246 1.083.164.301.384.534.66.698.275.158.58.236.915.236.334 0 .639-.078.915-.236.282-.164.505-.397.669-.698.164-.309.246-.666.246-1.073zm3.511-1.948v3.178c0 .262.056.449.167.561.112.105.305.157.581.157h.659V382h-.807c-.498 0-.872-.115-1.122-.344-.249-.23-.374-.607-.374-1.132v-3.178h-.698v-.739h.698v-1.357h.896v1.357h1.407v.739h-1.407zm7.412 1.751c0 .171-.01.351-.029.541h-4.31c.032.532.213.948.541 1.25.334.295.738.443 1.21.443.387 0 .709-.089.965-.266.262-.184.446-.426.551-.728h.964a2.34 2.34 0 01-.866 1.269c-.433.322-.971.483-1.614.483-.512 0-.971-.115-1.377-.345a2.442 2.442 0 01-.945-.974c-.23-.426-.345-.918-.345-1.476 0-.558.112-1.046.335-1.466.223-.42.535-.742.935-.965a2.798 2.798 0 011.397-.344c.512 0 .965.111 1.358.335.394.223.696.531.905.924.217.388.325.827.325 1.319zm-.925-.187c0-.341-.075-.633-.226-.876a1.432 1.432 0 00-.62-.561 1.85 1.85 0 00-.856-.196c-.453 0-.84.144-1.161.433-.315.288-.496.688-.542 1.2h3.405zm4.331-2.391c.466 0 .873.102 1.22.305.355.203.617.459.788.768v-.985h.905v5.511c0 .492-.105.928-.315 1.309-.21.387-.512.689-.905.905-.387.217-.84.325-1.358.325-.709 0-1.299-.167-1.772-.502a1.96 1.96 0 01-.836-1.368h.886c.098.328.301.591.61.787.308.204.679.306 1.112.306.492 0 .892-.155 1.2-.463.315-.308.473-.741.473-1.299v-1.132c-.178.315-.44.578-.788.788-.347.21-.754.315-1.22.315a2.5 2.5 0 01-1.309-.355 2.48 2.48 0 01-.915-.994c-.223-.426-.334-.911-.334-1.456 0-.551.111-1.033.334-1.446.223-.42.528-.745.915-.975.394-.229.83-.344 1.309-.344zm2.008 2.775c0-.407-.082-.761-.247-1.063a1.696 1.696 0 00-.669-.689 1.753 1.753 0 00-.915-.246 1.725 1.725 0 00-1.574.925c-.164.302-.246.656-.246 1.063 0 .413.082.774.246 1.083.164.301.384.534.659.698.276.158.581.236.915.236.335 0 .64-.078.915-.236.282-.164.505-.397.669-.698.165-.309.247-.666.247-1.073zm7.063-2.687l-3.248 7.932h-.925l1.063-2.598-2.175-5.334h.994l1.693 4.37 1.673-4.37h.925z"/><text x="368" y="399" class="prefix__font-poppins prefix__fp-600" text-anchor="end" fill="#fff" font-size="10">',
                        nestStrategyName_,
                        "</text>"
                    )
                    : "",
                artStatic.getIsTransferablePart(isTransferable_),
                artStatic.getLockIcon(isPermanentLock_ || isAttached_),
                artStatic.endPart()
            );
    }

    function toDateString(uint256 timestamp) public pure returns (string memory) {
        (uint256 year, uint256 month, uint256 day) = timestamp.timestampToDate();
        string[12] memory monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return string.concat(day.toString(), " ", monthNames[month - 1], ", ", year.toString());
    }
}

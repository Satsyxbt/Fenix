// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {IBlastERC20RebasingManage} from "../integration/interfaces/IBlastERC20RebasingManage.sol";
import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";
import {IBlastRebasingTokensGovernor} from "./interfaces/IBlastRebasingTokensGovernor.sol";
import {IERC20Rebasing, YieldMode} from "./interfaces/IERC20Rebasing.sol";

/**
 * @title BlastRebasingTokensGovernorUpgradeable
 * @dev Manages rebasing token holders and allows claiming tokens in various ways.
 */
contract BlastRebasingTokensGovernorUpgradeable is IBlastRebasingTokensGovernor, BlastGovernorClaimableSetup, AccessControlUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

    /**
     * @dev Role identifier for adding token holders.
     */
    bytes32 public constant TOKEN_HOLDER_ADDER_ROLE = keccak256("TOKEN_HOLDER_ADDER_ROLE");

    /**
     * @dev Role identifier for withdrawing tokens.
     */
    bytes32 public constant TOKEN_WITHDRAWER_ROLE = keccak256("TOKEN_WITHDRAWER_ROLE");

    /**
     * @dev Mapping of rebasing tokens to their holders.
     */
    mapping(address => EnumerableSetUpgradeable.AddressSet) internal _rebasingTokensHolders;

    /**
     * @dev Error thrown when the token holder is already registered.
     */
    error AlreadyRegistered();

    /**
     * @dev Error thrown when the token holder was not registered before.
     */
    error NotRegisteredBefore();

    /**
     * @dev Modifier to check if the address is not zero.
     * @param addr_ The address to be checked.
     */
    modifier onlyNotZeroAddress(address addr_) {
        _checkAddressZero(addr_);
        _;
    }

    /**
     * @dev Initializes the contract by disabling the initializer of the inherited upgradeable contract.
     * @param blastGovernor_ The address of the Blast Governor contract.
     */
    constructor(address blastGovernor_) {
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract by setting up roles and inherited contracts.
     * @param blastGovernor_ The address of the Blast Governor contract.
     */
    function initialize(address blastGovernor_) external virtual initializer {
        __AccessControl_init();
        __BlastGovernorClaimableSetup_init(blastGovernor_);
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /**
     * @notice Adds a token holder.
     * @dev Adds a contract to the list of token holders.
     * @param token_ The address of the token.
     * @param contractAddress_ The address of the token holder contract.
     */
    function addTokenHolder(
        address token_,
        address contractAddress_
    ) external virtual override onlyNotZeroAddress(token_) onlyNotZeroAddress(contractAddress_) onlyRole(TOKEN_HOLDER_ADDER_ROLE) {
        if (!_rebasingTokensHolders[token_].add(contractAddress_)) {
            revert AlreadyRegistered();
        }

        IERC20Rebasing token = IERC20Rebasing(token_);

        if (token.getConfiguration(contractAddress_) != YieldMode.CLAIMABLE) {
            IBlastERC20RebasingManage(contractAddress_).configure(token_, YieldMode.CLAIMABLE);
        }

        emit AddRebasingTokenHolder(token_, contractAddress_);
    }

    /**
     * @notice Claims from specified token holders.
     * @param token_ The address of the token.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the token holders.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claimFromSpecifiedTokenHolders(
        address token_,
        address recipient_,
        address[] memory holders_
    ) external virtual override onlyRole(TOKEN_WITHDRAWER_ROLE) returns (uint256 totalClaimedAmount) {
        return _claim(token_, recipient_, holders_);
    }

    /**
     * @notice Claims tokens for a recipient within the specified range.
     * @param token_ The address of the token.
     * @param recipient_ The address of the recipient.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claim(
        address token_,
        address recipient_,
        uint256 offset_,
        uint256 limit_
    ) external virtual override onlyRole(TOKEN_WITHDRAWER_ROLE) returns (uint256 totalClaimedAmount) {
        return _claim(token_, recipient_, listRebasingTokenHolders(token_, offset_, limit_));
    }

    /**
     * @notice Reads claimable amounts within the specified range.
     * @param token_ The address of the token.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return tokenHoldersClamableAmounts The claimable amounts of the token holders.
     */
    function readClaimableAmounts(
        address token_,
        uint256 offset_,
        uint256 limit_
    ) external view virtual override returns (ClaimableAmountsResult[] memory tokenHoldersClamableAmounts) {
        return _readClaimableAmounts(token_, listRebasingTokenHolders(token_, offset_, limit_));
    }

    /**
     * @notice Reads claimable amounts from specified token holders.
     * @param token_ The address of the token.
     * @param holders_ The addresses of the token holders.
     * @return tokenHoldersClamableAmounts The claimable amounts of the token holders.
     */
    function readClaimableAmountsFromSpecifiedTokenHolders(
        address token_,
        address[] memory holders_
    ) external view virtual override returns (ClaimableAmountsResult[] memory tokenHoldersClamableAmounts) {
        return _readClaimableAmounts(token_, holders_);
    }

    /**
     * @notice Checks if a contract is a registered token holder.
     * @param token_ The address of the token.
     * @param contractAddress_ The address of the contract.
     * @return isRegistered Whether the contract is a registered token holder.
     */
    function isRegisteredTokenHolder(address token_, address contractAddress_) external view virtual override returns (bool isRegistered) {
        return _rebasingTokensHolders[token_].contains(contractAddress_);
    }

    /**
     * @notice Lists token holders within the specified range.
     * @param token_ The address of the token.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return tokenHolders The addresses of the token holders.
     */
    function listRebasingTokenHolders(
        address token_,
        uint256 offset_,
        uint256 limit_
    ) public view virtual override returns (address[] memory tokenHolders) {
        uint256 size = _rebasingTokensHolders[token_].length();
        if (offset_ >= size) {
            return new address[](0);
        }
        size -= offset_;
        if (size > limit_) {
            size = limit_;
        }
        address[] memory list = new address[](size);
        for (uint256 i; i < size; ) {
            list[i] = _rebasingTokensHolders[token_].at(i + offset_);
            unchecked {
                i++;
            }
        }
        return list;
    }

    /**
     * @dev Internal function to claim tokens from specified token holders.
     * @param token_ The address of the token.
     * @param recipient_ The address of the recipient.
     * @param holders_ The addresses of the token holders.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function _claim(address token_, address recipient_, address[] memory holders_) internal virtual returns (uint256 totalClaimedAmount) {
        IERC20Rebasing token = IERC20Rebasing(token_);
        for (uint256 i; i < holders_.length; ) {
            uint256 toClaim = token.getClaimableAmount(holders_[i]);
            if (toClaim > 0) {
                totalClaimedAmount += IBlastERC20RebasingManage(holders_[i]).claim(token_, recipient_, toClaim);
            }
            unchecked {
                i++;
            }
        }
        emit Claim(_msgSender(), recipient_, token_, holders_, totalClaimedAmount);
    }

    /**
     * @dev Internal function to read claimable amounts from specified token holders.
     * @param token_ The address of the token.
     * @param holders_ The addresses of the token holders.
     * @return tokenHoldersClamableAmounts The claimable amounts of the token holders.
     */
    function _readClaimableAmounts(
        address token_,
        address[] memory holders_
    ) internal view virtual returns (ClaimableAmountsResult[] memory tokenHoldersClamableAmounts) {
        IERC20Rebasing token = IERC20Rebasing(token_);
        tokenHoldersClamableAmounts = new ClaimableAmountsResult[](holders_.length);
        for (uint256 i; i < holders_.length; ) {
            YieldMode mode = token.getConfiguration(holders_[i]);
            uint256 amount;
            if (mode == YieldMode.CLAIMABLE) {
                amount = token.getClaimableAmount(holders_[i]);
            }
            tokenHoldersClamableAmounts[i] = ClaimableAmountsResult({contractAddress: holders_[i], claimableAmount: amount, mode: mode});
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Checks if the provided address is zero and reverts with AddressZero error if it is.
     * @param addr_ The address to check.
     */
    function _checkAddressZero(address addr_) internal pure virtual {
        if (addr_ == address(0)) {
            revert AddressZero();
        }
    }

    /**
     * @dev Reserved space for future variable additions without shifting down storage.
     */
    uint256[50] private __gap;
}

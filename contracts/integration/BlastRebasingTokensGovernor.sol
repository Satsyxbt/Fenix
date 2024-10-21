// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.19;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {IBlastERC20RebasingManage} from "../integration/interfaces/IBlastERC20RebasingManage.sol";
import {BlastGovernorClaimableSetup} from "./BlastGovernorClaimableSetup.sol";
import {IBlastRebasingTokensGovernor} from "./interfaces/IBlastRebasingTokensGovernor.sol";
import {IERC20Rebasing, YieldMode} from "./interfaces/IERC20Rebasing.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@cryptoalgebra/integral-periphery/contracts/interfaces/ISwapRouter.sol";

/**
 * @title BlastRebasingTokensGovernorUpgradeable
 * @dev Manages rebasing token holders and allows claiming tokens in various ways.
 */
contract BlastRebasingTokensGovernorUpgradeable is IBlastRebasingTokensGovernor, BlastGovernorClaimableSetup, AccessControlUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using SafeERC20Upgradeable for IERC20Upgradeable;

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
     * @dev Address of the token to be used as the target for swaps.
     */
    address internal _swapTargetToken;

    /**
     * @dev Address of the router contract used for token swaps.
     */
    address internal _swapRouter;

    /**
     * @dev Error thrown when the token holder is already registered.
     */
    error AlreadyRegistered();

    /**
     * @dev Error thrown when the token holder was not registered before.
     */
    error NotRegisteredBefore();

    /**
     * @notice Reverts when an invalid address key is provided.
     */
    error InvalidAddressKey();

    /**
     * @notice Reverts when the source token address is the same as the swap target token.
     */
    error InvalidSwapSourceToken();

    /**
     * @notice Reverts when the swap target token or swap router is not properly set up.
     */
    error AddressNotSetupForSupportSwap();

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
     * @notice Updates the address of a specified contract.
     * @dev Only callable by an address with the VOTER_ADMIN_ROLE.
     * @param key_ The key representing the contract.
     * @param value_ The new address of the contract.
     * @custom:event UpdateAddress Emitted when a contract address is updated.
     * @custom:error InvalidAddressKey Thrown when an invalid key is provided.
     */
    function updateAddress(string memory key_, address value_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bytes32 key = keccak256(abi.encodePacked(key_));
        if (key == 0x8a0633860f1d41166e68f6907597e1c9757371c3ac8a1415136009b533dad165) {
            // id('swapTargetToken')
            _swapTargetToken = value_;
        } else if (key == 0x885b8950407e4dfe65c138144a8dabb9f50ea14dbf711eb2010a07b941b01a51) {
            // id('swapRouter')
            _swapRouter = value_;
        } else {
            revert InvalidAddressKey();
        }
        emit UpdateAddress(key_, value_);
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

        if (IERC20Rebasing(token_).getConfiguration(contractAddress_) != YieldMode.CLAIMABLE) {
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
     * @notice Performs a direct token swap using the V3 router.
     * @dev Swaps a specified amount of tokens for a target token using the V3 router.
     * Requires the caller to have the TOKEN_WITHDRAWER_ROLE.
     * Reverts if the swap target token or swap router is not set up.
     * Reverts if the source token address is the same as the swap target token.
     * @param token_ The address of the input token being swapped.
     * @param recipient_ The address of the recipient receiving the swapped tokens.
     * @param amount_ The amount of input tokens to be swapped.
     * @param minAmountOut_ The minimum amount of output tokens expected.
     * @param deadline_ The deadline by which the swap must be completed.
     * @custom:event DirectV3Swap Emitted when a swap is performed using the V3 router.
     * @custom:error AddressNotSetupForSupportSwap Thrown if the swap target token or swap router is not properly set up.
     * @custom:error InvalidSwapSourceToken Thrown if the source token address is equal to the swap target token.
     */
    function directV3Swap(
        address token_,
        address recipient_,
        uint256 amount_,
        uint256 minAmountOut_,
        uint160 limitSqrtPrice_,
        uint256 deadline_
    ) external onlyRole(TOKEN_WITHDRAWER_ROLE) {
        address swapTargetTokenCache = _swapTargetToken;
        address swapRouterCache = _swapRouter;

        if (swapTargetTokenCache == address(0) || swapRouterCache == address(0)) {
            revert AddressNotSetupForSupportSwap();
        }
        if (token_ == swapTargetTokenCache) {
            revert InvalidSwapSourceToken();
        }

        IERC20Upgradeable(token_).safeApprove(swapRouterCache, amount_);

        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams(
            token_,
            swapTargetTokenCache,
            recipient_,
            deadline_,
            amount_,
            minAmountOut_,
            limitSqrtPrice_
        );
        uint256 amountOut = ISwapRouter(swapRouterCache).exactInputSingle(swapParams);
        emit DirectV3Swap(_msgSender(), recipient_, token_, swapTargetTokenCache, amount_, amountOut);
    }

    /**
     * @notice Withdraws a specified amount of tokens to a recipient.
     * @dev Transfers tokens from the contract to the specified recipient.
     * Requires the caller to have the TOKEN_WITHDRAWER_ROLE.
     * @param token_ The address of the token to be withdrawn.
     * @param recipient_ The address of the recipient receiving the tokens.
     * @param amount_ The amount of tokens to be withdrawn.
     * @custom:event Withdraw Emitted when tokens are withdrawn by an authorized address.
     */
    function withdraw(address token_, address recipient_, uint256 amount_) external onlyRole(TOKEN_WITHDRAWER_ROLE) {
        IERC20Upgradeable(token_).safeTransfer(recipient_, amount_);
        emit Withdraw(_msgSender(), recipient_, token_, amount_);
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
     * @notice Provides information about the current swap settings.
     * @dev Returns the target token and swap router addresses used for swaps.
     * @return targetToken The address of the target token for swaps.
     * @return swapRouter The address of the swap router.
     */
    function swapInfo() external view returns (address targetToken, address swapRouter) {
        return (_swapTargetToken, _swapRouter);
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

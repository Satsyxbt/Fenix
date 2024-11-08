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
 * @dev This contract manages rebasing token holders and allows users to claim tokens in various ways.
 * It inherit the functionalities from the BlastGovernorClaimableSetup and AccessControlUpgradeable.
 */
contract BlastRebasingTokensGovernorUpgradeable is IBlastRebasingTokensGovernor, BlastGovernorClaimableSetup, AccessControlUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @dev Role identifier for adding token holders.
     */
    bytes32 public constant TOKEN_HOLDER_ADDER_ROLE = keccak256("TOKEN_HOLDER_ADDER_ROLE");

    /**
     * @dev Role identifier for claiming tokens.
     */
    bytes32 public constant TOKEN_CLAIMER_ROLE = keccak256("TOKEN_CLAIMER_ROLE");

    /**
     * @dev Role identifier for swapping tokens.
     */
    bytes32 public constant TOKEN_SWAPER_ROLE = keccak256("TOKEN_SWAPER_ROLE");

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
     * @notice Contains information for yield distribution for each direction.
     */
    mapping(YieldDistributionDirection => YieldDistributionInfo) public yieldDistributionDirectionInfo;

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
     * @dev Error thrown when attempting to claim zero tokens.
     */
    error ZeroTokensToClaim();

    /**
     * @dev Error thrown when the percentage sum is invalid (must equal 100%).
     */
    error InvalidPercentageSum();

    /**
     * @dev Error thrown when the amount requested exceeds what is available to swap.
     */
    error AmountMoreThenAvailabelToSwapByThisDirection();

    /**
     * @dev Error thrown when attempting to withdraw more than the available balance.
     */
    error InsufficientAvailableAmountToWithdraw();

    /**
     * @dev Error thrown when swap is not available for the specified direction.
     */
    error SwapNotAvailableForDirection();

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
    function updateAddress(string memory key_, address value_) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
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
     * @custom:error AlreadyRegistered Thrown when the token holder is already registered.
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
     * @notice Sets whether a direction is available to swap to the target token.
     * @param yieldDirectionType_ The direction type of the yield.
     * @param isAvailableToSwapToTargetTokens_ Whether swapping to the target token is allowed.
     * @custom:event UpdateDirectionAvailableToSwapToTargetToken Emitted when availability of swapping to target token is updated.
     */
    function setDirectionAvailableToSwapToTargetToken(
        YieldDistributionDirection yieldDirectionType_,
        bool isAvailableToSwapToTargetTokens_
    ) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        yieldDistributionDirectionInfo[yieldDirectionType_].isAvailableToSwapToTargetTokens = isAvailableToSwapToTargetTokens_;
        emit UpdateDirectionAvailableToSwapToTargetToken(yieldDirectionType_, isAvailableToSwapToTargetTokens_);
    }

    /**
     * @notice Sets the percentage allocation for each yield distribution direction.
     * @param toOthersPercentage_ The percentage for the 'Others' yield direction.
     * @param toIncentivesPercentage_ The percentage for the 'Incentives' yield direction.
     * @param toRisePercentage_ The percentage for the 'Rise' yield direction.
     * @param toBribesPercentage_ The percentage for the 'Bribes' yield direction.
     * @custom:error InvalidPercentageSum Thrown if the total percentage does not equal 100% (1e18).
     */
    function setYieldDistributionDirectionsPercentage(
        uint256 toOthersPercentage_,
        uint256 toIncentivesPercentage_,
        uint256 toRisePercentage_,
        uint256 toBribesPercentage_
    ) external virtual override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (toOthersPercentage_ + toIncentivesPercentage_ + toRisePercentage_ + toBribesPercentage_ != 1e18) {
            revert InvalidPercentageSum();
        }

        yieldDistributionDirectionInfo[YieldDistributionDirection.Others].distributionPercentage = toOthersPercentage_;
        yieldDistributionDirectionInfo[YieldDistributionDirection.Incentives].distributionPercentage = toIncentivesPercentage_;
        yieldDistributionDirectionInfo[YieldDistributionDirection.Rise].distributionPercentage = toRisePercentage_;
        yieldDistributionDirectionInfo[YieldDistributionDirection.Bribes].distributionPercentage = toBribesPercentage_;

        emit UpdateYieldDistributionPercentage(toOthersPercentage_, toIncentivesPercentage_, toRisePercentage_, toBribesPercentage_);
    }

    /**
     * @notice Claims tokens from specified token holders.
     * @param token_ The address of the token.
     * @param holders_ The addresses of the token holders.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claimFromSpecifiedTokenHolders(
        address token_,
        address[] memory holders_
    ) external virtual override onlyRole(TOKEN_CLAIMER_ROLE) returns (uint256 totalClaimedAmount) {
        return _claim(token_, holders_);
    }

    /**
     * @notice Claims tokens for a recipient within the specified range.
     * @param token_ The address of the token.
     * @param offset_ The offset to start from.
     * @param limit_ The maximum number of token holders to process.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function claim(
        address token_,
        uint256 offset_,
        uint256 limit_
    ) external virtual override onlyRole(TOKEN_CLAIMER_ROLE) returns (uint256 totalClaimedAmount) {
        return _claim(token_, listRebasingTokenHolders(token_, offset_, limit_));
    }

    /**
     * @notice Performs a direct swap of tokens using a Uniswap V3 router.
     * @param yieldDirectionType_ The yield direction type for which the swap is performed.
     * @param token_ The address of the token to be swapped.
     * @param amount_ The amount of tokens to be swapped.
     * @param minAmountOut_ The minimum amount of target tokens expected to receive.
     * @param limitSqrtPrice_ The limit on the sqrt price during the swap.
     * @param deadline_ The deadline by which the swap must be completed.
     * @custom:error AddressNotSetupForSupportSwap Thrown if the swap router or target token is not properly set up.
     * @custom:error InvalidSwapSourceToken Thrown if the source token is the same as the swap target token.
     * @custom:error SwapNotAvailableForDirection Thrown if swapping is not available for the specified direction.
     * @custom:error AmountMoreThenAvailabelToSwapByThisDirection Thrown if the requested amount exceeds the available amount for swap in the specified direction.
     * @custom:event DirectV3Swap Emitted when a swap is performed successfully.
     */
    function directV3Swap(
        YieldDistributionDirection yieldDirectionType_,
        address token_,
        uint256 amount_,
        uint256 minAmountOut_,
        uint160 limitSqrtPrice_,
        uint256 deadline_
    ) external virtual override onlyRole(TOKEN_SWAPER_ROLE) {
        address swapTargetTokenCache = _swapTargetToken;
        address swapRouterCache = _swapRouter;

        if (swapTargetTokenCache == address(0) || swapRouterCache == address(0)) {
            revert AddressNotSetupForSupportSwap();
        }
        if (token_ == swapTargetTokenCache) {
            revert InvalidSwapSourceToken();
        }

        if (!yieldDistributionDirectionInfo[yieldDirectionType_].isAvailableToSwapToTargetTokens) {
            revert SwapNotAvailableForDirection();
        }

        uint256 amountToSwap = yieldDistributionDirectionInfo[yieldDirectionType_].tokensInfo[token_].available;

        if (amount_ > amountToSwap) {
            revert AmountMoreThenAvailabelToSwapByThisDirection();
        }

        yieldDistributionDirectionInfo[yieldDirectionType_].tokensInfo[token_].available -= amount_;

        IERC20Upgradeable(token_).safeApprove(swapRouterCache, amount_);
        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams(
            token_,
            swapTargetTokenCache,
            address(this),
            deadline_,
            amount_,
            minAmountOut_,
            limitSqrtPrice_
        );
        uint256 amountOut = ISwapRouter(swapRouterCache).exactInputSingle(swapParams);
        yieldDistributionDirectionInfo[yieldDirectionType_].tokensInfo[swapTargetTokenCache].totalAccumulated += amountOut;
        yieldDistributionDirectionInfo[yieldDirectionType_].tokensInfo[swapTargetTokenCache].available += amountOut;

        emit DirectV3Swap(_msgSender(), yieldDirectionType_, token_, swapTargetTokenCache, amount_, amountOut);
    }

    /**
     * @notice Withdraws tokens to a specified recipient.
     * @param yieldDirectionType_ The yield direction type for which the withdrawal is made.
     * @param token_ The address of the token to be withdrawn.
     * @param recipient_ The address of the recipient to receive the tokens.
     * @param amount_ The amount of tokens to be withdrawn.
     * @custom:error ZeroTokensToClaim Thrown if there are no tokens available to withdraw.
     * @custom:error InsufficientAvailableAmountToWithdraw Thrown if the requested withdrawal amount exceeds the available amount.
     * @custom:event Withdraw Emitted when tokens are withdrawn successfully.
     */
    function withdraw(
        YieldDistributionDirection yieldDirectionType_,
        address token_,
        address recipient_,
        uint256 amount_
    ) external virtual override onlyRole(TOKEN_WITHDRAWER_ROLE) {
        uint256 availableToClaim = yieldDistributionDirectionInfo[yieldDirectionType_].tokensInfo[token_].available;
        if (availableToClaim == 0) {
            revert ZeroTokensToClaim();
        }
        if (amount_ > availableToClaim) {
            revert InsufficientAvailableAmountToWithdraw();
        }
        yieldDistributionDirectionInfo[yieldDirectionType_].tokensInfo[token_].available -= amount_;

        IERC20Upgradeable(token_).safeTransfer(recipient_, amount_);
        emit Withdraw(_msgSender(), recipient_, yieldDirectionType_, token_, amount_);
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
    function swapInfo() external view virtual override returns (address targetToken, address swapRouter) {
        return (_swapTargetToken, _swapRouter);
    }

    /**
     * @notice Gets information about yield distribution for a specific direction and token.
     * @param direction_ The yield distribution direction.
     * @param token_ The address of the token.
     * @return TokenAccountingInfo Struct containing accounting information for the token.
     */
    function getYieldDirectionTokenInfo(
        YieldDistributionDirection direction_,
        address token_
    ) external view virtual override returns (TokenAccountingInfo memory) {
        return yieldDistributionDirectionInfo[direction_].tokensInfo[token_];
    }

    /**
     * @notice Gets information about yield distribution for multiple directions and tokens.
     * @param tokens_ The addresses of the tokens to get information about.
     * @return array An array of YieldDistributionDiresctionsInfoView structs containing the yield distribution information for each direction.
     */
    function getYieldDirectionsInfo(
        address[] calldata tokens_
    ) external view virtual override returns (YieldDistributionDiresctionsInfoView[] memory array) {
        array = new YieldDistributionDiresctionsInfoView[](4);
        for (uint8 i; i < 4; ) {
            YieldDistributionDirection direction = YieldDistributionDirection(i);
            array[i].direction = direction;
            array[i].distributionPercentage = yieldDistributionDirectionInfo[direction].distributionPercentage;
            array[i].isAvailableToSwapToTargetTokens = yieldDistributionDirectionInfo[direction].isAvailableToSwapToTargetTokens;
            array[i].tokensInfo = new TokenAccountingInfoView[](tokens_.length);
            for (uint256 j; j < tokens_.length; ) {
                address token = tokens_[j];
                array[i].tokensInfo[j].token = token;
                array[i].tokensInfo[j].totalAccumulated = yieldDistributionDirectionInfo[direction].tokensInfo[token].totalAccumulated;
                array[i].tokensInfo[j].available = yieldDistributionDirectionInfo[direction].tokensInfo[token].available;
                unchecked {
                    j++;
                }
            }
            unchecked {
                i++;
            }
        }
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
     * @dev Distributes yield to a specific direction.
     * @param direction_ The yield distribution direction.
     * @param token_ The address of the token.
     * @param totalClaimed_ The total claimed amount of tokens.
     * @return toDirectionClaimed The amount distributed to the specified direction.
     */
    function _distributeYield(
        YieldDistributionDirection direction_,
        address token_,
        uint256 totalClaimed_
    ) internal returns (uint256 toDirectionClaimed) {
        toDirectionClaimed = (yieldDistributionDirectionInfo[direction_].distributionPercentage * totalClaimed_) / 1e18;
        if (toDirectionClaimed > 0) {
            yieldDistributionDirectionInfo[direction_].tokensInfo[token_].totalAccumulated += toDirectionClaimed;
            yieldDistributionDirectionInfo[direction_].tokensInfo[token_].available += toDirectionClaimed;
        }
    }

    /**
     * @dev Internal function to claim tokens from specified token holders.
     * @param token_ The address of the token.
     * @param holders_ The addresses of the token holders.
     * @return totalClaimedAmount The total amount of tokens claimed.
     */
    function _claim(address token_, address[] memory holders_) internal virtual returns (uint256 totalClaimedAmount) {
        IERC20Rebasing token = IERC20Rebasing(token_);
        for (uint256 i; i < holders_.length; ) {
            uint256 toClaim = token.getClaimableAmount(holders_[i]);
            if (toClaim > 0) {
                totalClaimedAmount += IBlastERC20RebasingManage(holders_[i]).claim(token_, address(this), toClaim);
            }
            unchecked {
                i++;
            }
        }

        uint256 toOthers = _distributeYield(YieldDistributionDirection.Others, token_, totalClaimedAmount);
        uint256 toBribes = _distributeYield(YieldDistributionDirection.Bribes, token_, totalClaimedAmount);
        uint256 toIncentives = _distributeYield(YieldDistributionDirection.Incentives, token_, totalClaimedAmount);
        uint256 toRise = _distributeYield(YieldDistributionDirection.Rise, token_, totalClaimedAmount);
        emit Claim(_msgSender(), token_, totalClaimedAmount, toOthers, toIncentives, toRise, toBribes);
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

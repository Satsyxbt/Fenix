// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {IUniV3OracleLibrary} from "./interfaces/api/IUniV3OracleLibrary.sol";
import {IVeEarlyExitManagerUpgradeable} from "./interfaces/IVeEarlyExitManagerUpgradeable.sol";
import {IEmissionManagerUpgradeable} from "./interfaces/IEmissionManagerUpgradeable.sol";

/**
 * @title VeEarlyExitManagerUpgradeable
 * @author The Fenix Protocol team
 * @dev Controls the function of early withdrawal from VotinEscrow and blocks them for a specified number of periods.
 * Inherits from OwnableUpgradeable for ownership control.
 */
contract VeEarlyExitManagerUpgradeable is IVeEarlyExitManagerUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    uint256 public FEE_PRECISION = 1 ether;

    address public fenix;
    address public emissionManager;
    address public uniV3util;

    uint256 public vestedPeriodCount;
    uint256 public maxFee;
    uint32 public timeWindow;

    mapping(address => address) internal _supportedFeeTokenToPair;
    mapping(address => VestedInfo[]) internal _userVestings;

    /**
     * @dev Initializes the contract with default values.
     * @param fenix_ Address of the FENIX token.
     * @param emissionManager_ Address of the emission manager contract.
     */
    function initialize(address fenix_, address emissionManager_, address uniV3OracleLibrary) external initializer {
        __Ownable_init();

        fenix = fenix_;
        emissionManager = emissionManager_;
        uniV3util = uniV3OracleLibrary;

        vestedPeriodCount = 4;
        maxFee = 0.75e18;
        timeWindow = 360;
    }

    /**
     * @dev Removes support for fee payment token.
     * Requirements:
     * - Only callable by the owner.
     * @param token_ Address of the fee payment token.
     */
    function removeFeePaymentTokenSupport(address token_) external onlyOwner {
        if (_supportedFeeTokenToPair[token_] == address(0)) {
            revert FeePaymentTokenNotSupported();
        }
        delete _supportedFeeTokenToPair[token_];
        emit RemoveFeePaymentToken(token_);
    }

    /**
     * @dev Adds support for fee payment token.
     * Requirements:
     * - Only callable by the owner.
     * @param token_ Address of the fee payment token.
     * @param pair_ Address of the Uniswap pair for the fee payment token.
     */
    function addFeePaymentTokenSupport(address token_, address pair_) external onlyOwner {
        address token0 = IUniswapV3Pool(pair_).token0();
        address token1 = IUniswapV3Pool(pair_).token1();
        address fenixTemp = fenix;
        if ((token0 == fenixTemp && token1 == token_) || (token0 == token_ && token1 == fenixTemp)) {
            _supportedFeeTokenToPair[token_] = pair_;
            emit AddFeePaymentToken(token_, pair_);
            return;
        }
        revert IncorrectPair();
    }

    /**
     * @dev Sets the maximum exit fee.
     * Requirements:
     * - Only callable by the owner.
     * @param maxFee_ New maximum exit fee.
     */
    function setMaxFee(uint256 maxFee_) external onlyOwner {
        if (maxFee_ > FEE_PRECISION) {
            revert FeeTooMuch();
        }
        maxFee = maxFee_;
        emit SetMaxFee(maxFee_);
    }

    function setTimeWindow(uint32 timeWindow_) external onlyOwner {
        timeWindow = timeWindow_;
        emit SetTimeWindow(timeWindow);
    }

    /**
     * @dev Sets the number of vested periods.
     * Requirements:
     * - Only callable by the owner.
     * @param vestedPeriodCount_ New number of vested periods.
     */
    function setVestedPeriodCount(uint256 vestedPeriodCount_) external onlyOwner {
        vestedPeriodCount = vestedPeriodCount_;
        emit SetVestedPeriodCount(vestedPeriodCount_);
    }

    /**
     * @dev Vesting function for recipients.
     * @param recipient_ Address of the recipient.
     * @param amount_ Amount to be vested.
     */
    function vestedFor(address recipient_, uint256 amount_) external {
        IERC20(fenix).safeTransferFrom(msg.sender, address(this), amount_);
        uint256 currentPeriod = IEmissionManagerUpgradeable(emissionManager).period();
        uint256 unlockPeriod = currentPeriod + vestedPeriodCount;
        _userVestings[recipient_].push(VestedInfo(amount_, unlockPeriod));
        emit Vested(msg.sender, amount_, unlockPeriod);
    }

    /**
     * @dev Claims vested tokens by index.
     * @param index_ Index of the vested tokens.
     */
    function claimByIndex(uint256 index_) external {
        VestedInfo memory vesting = _userVestings[msg.sender][index_];
        uint256 currentPeriod = IEmissionManagerUpgradeable(emissionManager).period();
        if (vesting.unlockPeriod > currentPeriod) {
            revert NotUnlock();
        }

        _deleteFromArray(msg.sender, index_);
        IERC20(fenix).safeTransfer(msg.sender, vesting.amount);
        emit Claim(msg.sender, vesting.amount);
        return;
    }

    /**
     * @dev Claims all unlocked tokens for the caller.
     */
    function claim() external {
        VestedInfo[] memory vestings = _userVestings[msg.sender];
        uint256 currentPeriod = IEmissionManagerUpgradeable(emissionManager).period();

        for (uint256 i; i < vestings.length; ) {
            if (vestings[i].unlockPeriod <= currentPeriod) {
                _deleteFromArray(msg.sender, i);
                IERC20(fenix).transfer(msg.sender, vestings[i].amount);
                emit Claim(msg.sender, vestings[i].amount);
            }
            unchecked {
                i++;
            }
        }
    }

    /**
     * @dev Gets the vested information for a user.
     * @param user_ Address of the user.
     * @return VestedInfo array containing the vested information.
     */
    function getUserVestings(address user_) external view returns (VestedInfo[] memory) {
        return _userVestings[user_];
    }

    /**
     * @dev Calculates the fee token amount for early unlock.
     * @param feePaymentToken_ Address of the fee payment token.
     * @param fnxValue_ Amount of FENIX tokens.
     * @param lockedStart_ Start timestamp of the locked period.
     * @param lockedEnd_ End timestamp of the locked period.
     * @return Fee token amount for early unlock.
     */
    function getFeeTokenAmountForEarlyUnlock(
        address feePaymentToken_,
        uint256 fnxValue_,
        uint256 lockedStart_,
        uint256 lockedEnd_
    ) external view returns (uint256) {
        if (_supportedFeeTokenToPair[feePaymentToken_] == address(0)) {
            revert FeePaymentTokenNotSupported();
        }
        uint256 penaltyRate = ((lockedEnd_ - block.timestamp) * maxFee) / (lockedEnd_ - lockedStart_);
        uint256 penaltyAmount = (fnxValue_ * penaltyRate) / FEE_PRECISION;

        return convertFenixToFeeToken(penaltyAmount, feePaymentToken_);
    }

    /**
     * @dev Converts FENIX tokens to fee payment tokens.
     * @param fnxValue_ Amount of FENIX tokens to convert.
     * @param feePaymentToken_ Address of the fee payment token.
     * @return Fee payment token amount.
     */
    function convertFenixToFeeToken(uint256 fnxValue_, address feePaymentToken_) public view returns (uint256) {
        address pair = _supportedFeeTokenToPair[feePaymentToken_];
        if (pair == address(0)) {
            revert FeePaymentTokenNotSupported();
        }
        int24 tick = _getTick(pair, timeWindow);
        uint256 pairPrice = IUniV3OracleLibrary(uniV3util).getQuoteAtTick(tick, uint128(1e18), fenix, feePaymentToken_); // @TODO call from perhipheral contracts for get pair

        return (fnxValue_ * pairPrice) / 1e18;
    }

    function _getRange(uint32 secondsAgo) internal pure returns (uint32[] memory) {
        uint32[] memory range = new uint32[](2);
        range[0] = secondsAgo;
        range[1] = 0;
        return range;
    }

    function _getTick(address pair, uint32 timeWindow_) internal view returns (int24) {
        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(pair).observe(_getRange(timeWindow_));
        return int24((tickCumulatives[1] - tickCumulatives[0]) / int32(timeWindow_));
    }

    /**
     * @dev Internal function to delete an element from the array.
     * @param user_ Address of the user.
     * @param index_ Index of the element to be deleted.
     */
    function _deleteFromArray(address user_, uint256 index_) internal {
        uint256 count = _userVestings[user_].length;
        if (count > 1) {
            _userVestings[user_][index_] = _userVestings[user_][count - 1];
        }
        _userVestings[user_].pop();
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}

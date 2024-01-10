// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IVeEarlyExitManagerUpgradeable {
    event AddFeePaymentToken(address token_, address pair_);
    event RemoveFeePaymentToken(address token_);
    event SetTimeWindow(uint256 timeWindow);
    event SetMaxFee(uint256 maxFee);
    event SetVestedPeriodCount(uint256 vestedPeriodCount);
    event Claim(address user, uint256 amount);
    event Vested(address user, uint256 amount, uint256 unlockPeriod);

    error IncorrectPair();
    error FeePaymentTokenNotSupported();
    error FeeTooMuch();
    error NotUnlock();

    struct VestedInfo {
        uint256 amount;
        uint256 unlockPeriod;
    }

    function getFeeTokenAmountForEarlyUnlock(
        address feePaymentToken_,
        uint256 fnxValue_,
        uint256 lockedStart,
        uint256 lockedEnd_
    ) external view returns (uint256);

    function vestedFor(address recipient_, uint256 amount_) external;
}

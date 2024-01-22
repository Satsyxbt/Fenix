// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPairFees} from "./interfaces/IPairFees.sol";

// Pair Fees contract is used as a 1:1 pair relationship to split out fees, this ensures that the curve does not need to be modified for LP shares
contract PairFees is IPairFees {
    using SafeERC20 for IERC20;

    address public immutable override pair; // The pair it is bonded to
    address public immutable override token0; // token0 of pair, saved localy and statically for gas optimization
    address public immutable override token1; // Token1 of pair, saved localy and statically for gas optimization

    constructor(address token0_, address token1_) {
        pair = msg.sender;
        token0 = token0_;
        token1 = token1_;
    }

    // Allow the pair to transfer fees to users
    function claimFeesFor(address recipient_, uint256 amount0_, uint256 amount1_) external virtual override {
        if (msg.sender != pair) {
            revert AccessDenied();
        }
        if (amount0_ > 0) IERC20(token0).safeTransfer(recipient_, amount0_);
        if (amount1_ > 0) IERC20(token1).safeTransfer(recipient_, amount1_);
    }
}

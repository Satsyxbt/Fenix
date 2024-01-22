// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IPairFees {
    error AccessDenied();

    function token0() external returns (address);

    function token1() external returns (address);

    function pair() external returns (address);

    function claimFeesFor(address recipient_, uint256 amount0_, uint256 amount1_) external;
}

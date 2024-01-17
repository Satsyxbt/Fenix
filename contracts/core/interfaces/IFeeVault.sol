// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IFeeVault {
    function claimFees() external returns (uint256 claimed0, uint256 claimed1);
}

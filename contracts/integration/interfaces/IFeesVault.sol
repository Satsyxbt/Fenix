// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IFeesVault {
    event Fees(address indexed pool, address indexed token0, address indexed token1, uint256 totalAmount0, uint256 totalAmount1);
    event Fees0(address indexed token0, uint256 toGaugeAmount0, uint256 toProtocolAmount0, uint256 toPartnerAmount0);
    event Fees1(address indexed token1, uint256 toGaugeAmount1, uint256 toProtocolAmount1, uint256 toPartnerAmount1);
    event SetDistributionConfig(uint256 toGaugeRate, uint256 toProtocolRate, uint256 toPartnerRate);

    error AccessDenied();
    error IncorectDistributionConfig();
    error RecipientNotSetuped();

    function claimFees() external returns (uint256 gauge0, uint256 gauge1);

    function setDistributionConfig(uint256 toGaugeRate_, uint256 toProtocolRate_, uint256 toPartnerRate_) external;

    function calculateFee(uint256 amount_) external view returns (uint256 toGaugeAmount, uint256 toProtocolAmount, uint256 toPartnerAmount);

    function initialize(address blastGovernor_, address factory_, address pool_, address voter_) external;
}

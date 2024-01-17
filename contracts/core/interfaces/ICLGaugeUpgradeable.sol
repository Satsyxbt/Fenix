// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface ICLGaugeUpgradeable {
    function initialize(
        address rewardToken_,
        address votingEscrow_,
        address token_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        address feeVault_
    ) external;

    function activateEmergencyMode() external;

    function stopEmergencyMode() external;

    function setGaugeRewarder(address) external;

    function setDistribution(address) external;

    function setInternalBribe(address) external;

    function setFeeVault(address) external;

    function setRewarderPid(uint256) external;

    function notifyRewardAmount(address token, uint amount) external;

    function getReward(address account) external;

    function claimFees() external returns (uint claimed0, uint claimed1);

    function balanceOf(address _account) external view returns (uint);

    function totalSupply() external view returns (uint);
}

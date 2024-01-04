// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IGaugeUpgradeable {
    function setDistribution(address newDistribution_) external;

    function initialize(
        address rewardToken_,
        address votingEscrow_,
        address token_,
        address distribution_,
        address internalBribe_,
        address externalBribe_,
        bool isPair_
    ) external;

    function notifyRewardAmount(address token, uint amount) external;

    function getReward(address account, address[] memory tokens) external;

    function getReward(address account) external;

    function claimFees() external returns (uint claimed0, uint claimed1);

    function left(address token) external view returns (uint);

    function rewardRate(address _pair) external view returns (uint);

    function balanceOf(address _account) external view returns (uint);

    function isForPair() external view returns (bool);

    function totalSupply() external view returns (uint);

    function earned(address token, address account) external view returns (uint);
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IGauge {
    function TOKEN() external view returns (address);

    function notifyRewardAmount(address token, uint amount) external;

    function getReward(address account) external;

    function claimFees() external returns (uint claimed0, uint claimed1);

    function balanceOf(address _account) external view returns (uint);

    function totalSupply() external view returns (uint);

    function setDistribution(address _distro) external;

    function activateEmergencyMode() external;

    function stopEmergencyMode() external;

    function setInternalBribe(address intbribe) external;

    function setGaugeRewarder(address _gr) external;

    function setFeeVault(address _feeVault) external;

    function initialize(
        address _governor,
        address _rewardToken,
        address _ve,
        address _token,
        address _distribution,
        address _internal_bribe,
        address _external_bribe,
        bool _isToMerkleDistributor,
        address _merklGaugeMiddleman,
        address _feeVault
    ) external;
}

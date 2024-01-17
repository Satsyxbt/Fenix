// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IBaseGaugeUpgradeable {
    event RewardAdded(uint256 reward);
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Harvest(address indexed user, uint256 reward);
    event ClaimFees(address indexed from, uint256 claimed0, uint256 claimed1);
    event SetDistribution(address indexed oldDistribution, address indexed newDistribution);
    event SetGaugeRewarder(address indexed oldRewarder, address indexed newRewarder);
    event SetInternalBribe(address indexed oldInternalBribe, address indexed newInternalBribe);
    event EmergencyModeActivated();
    event EmergencyModeDeactivated();

    error ZeroAdress();
    error AccessDenied();
    error ZeroAmount();
    error IncorrectRewardToken();
    error NotTokenOwnerOrApproved();
    error DisableDuringEmergencyMode();
    error OnlyDuringEmergencyMode();

    function activateEmergencyMode() external;

    function stopEmergencyMode() external;

    function setGaugeRewarder(address) external;

    function setDistribution(address) external;

    function setInternalBribe(address) external;

    function setRewarderPid(uint256) external;

    function notifyRewardAmount(address token, uint amount) external;

    function claimFees() external returns (uint claimed0, uint claimed1);

    function balanceOf(address _account) external view returns (uint);

    function totalSupply() external view returns (uint);

    function rewardForDuration() external view returns (uint256);

    function depositAll() external;

    function deposit(uint256 amount_) external;

    function withdrawAll() external;

    function withdraw(uint256 amount_) external;

    function emergencyWithdraw() external;

    function emergencyWithdrawAmount(uint256 amount_) external;

    function withdrawAllAndHarvest() external;

    function getReward() external;

    function getReward(address account) external;
}

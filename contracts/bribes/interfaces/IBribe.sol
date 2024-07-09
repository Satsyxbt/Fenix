// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IBribe {
    /* ========== EVENTS ========== */

    event RewardAdded(address indexed rewardToken, uint256 reward, uint256 startTimestamp);
    event Staked(uint256 indexed tokenId, uint256 amount);
    event Withdrawn(uint256 indexed tokenId, uint256 amount);
    event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);
    event Recovered(address indexed token, uint256 amount);
    event AddRewardToken(address indexed token);

    function deposit(uint amount, uint tokenId) external;

    function withdraw(uint amount, uint tokenId) external;

    function getRewardTokens() external view returns (address[] memory);

    function getSpecificRewardTokens() external view returns (address[] memory);

    function getRewardForOwner(uint tokenId, address[] memory tokens) external;

    function getRewardForAddress(address _owner, address[] memory tokens) external;

    function notifyRewardAmount(address token, uint amount) external;

    function addRewardToken(address) external;

    function addRewardTokens(address[] memory) external;

    function initialize(address, address, address, string memory) external;
}

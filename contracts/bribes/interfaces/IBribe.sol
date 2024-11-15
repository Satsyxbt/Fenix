// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IBribe {
    struct Reward {
        uint256 periodFinish;
        uint256 rewardsPerEpoch;
        uint256 lastUpdateTime;
    }
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

    function firstBribeTimestamp() external view returns (uint256);

    function totalSupplyAt(uint256 timestamp) external view returns (uint256);

    function rewardData(address, uint256) external view returns (uint256 periodFinish, uint256 rewardsPerEpoch, uint256 lastUpdateTime);

    function rewardsListLength() external view returns (uint256);

    function getEpochStart() external view returns (uint256);

    function earned(uint256 tokenId, address _rewardToken) external view returns (uint256);

    function earned(address _owner, address _rewardToken) external view returns (uint256);

    function balanceOfAt(uint256 tokenId, uint256 _timestamp) external view returns (uint256);

    function balanceOf(uint256 tokenId) external view returns (uint256);

    function getNextEpochStart() external view returns (uint256);
}

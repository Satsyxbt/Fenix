// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IBribeUpgradeable {
    struct Reward {
        uint256 periodFinish;
        uint256 rewardsPerEpoch;
        uint256 lastUpdateTime;
    }

    event RewardAdded(address indexed rewardToken, uint256 reward, uint256 startTimestamp);
    event Staked(uint256 indexed tokenId, uint256 amount);
    event Withdrawn(uint256 indexed tokenId, uint256 amount);
    event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);
    event Recovered(address indexed token, uint256 amount);
    event SetOwner(address indexed _owner);

    error ZeroAdress();
    error AccessDenied();
    error ZeroAmount();
    error IncorrectRewardToken();
    error NotTokenOwnerOrApproved();

    function initialize(address _owner, address _voter, address _bribeFactory, string memory _type) external;

    function deposit(uint256 amount_, uint256 tokenId_) external;

    function withdraw(uint256 amount_, uint256 tokenId_) external;

    function getReward(uint256 tokenId_, address[] calldata tokens_) external;

    function getReward(address[] calldata tokens_) external;

    function getRewardForTokenOwner(uint256 tokenId_, address[] calldata tokens_) external;

    function getRewardForAddress(address owner_, address[] calldata tokens_) external;

    function notifyRewardAmount(address token_, uint256 amount_) external;

    function setVoter(address voter_) external;

    function setEmissionManager(address) external;

    function setOwner(address owner_) external;

    function addRewardToken(address) external;

    function addRewardTokens(address[] calldata) external;

    function emergencyRecoverERC20(address token_, uint256 amount_) external;

    function recoverERC20AndUpdateData(address token_, uint256 amount_) external;

    function votingEscrow() external view returns (address);

    function emissionManager() external view returns (address);

    function bribeFactory() external view returns (address);

    function voter() external view returns (address);

    function owner() external view returns (address);

    function TYPE() external view returns (string memory);
}

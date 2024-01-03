// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

interface IBribeUpgradeable {
    function deposit(uint256 amount_, uint256 tokenId_) external;
    function withdraw(uint256 amount_, uint256 tokenId_) external;
    function getRewardForOwner(uint256 tokenId_, address[] calldata tokens_) external;
    function getRewardForAddress(address owner_, address[] calldata tokens_) external;
    function notifyRewardAmount(address token_, uint256 amount_) external;
    function left(address token_) external view returns (uint256);

    function addReward(address token_) external;
    function addRewards(address[] calldata tokens_) external;

    function setVoter(address voter_) external;
    function setMinter(address minter_) external;
    function setOwner(address owner_) external;
    function emergencyRecoverERC20(address token_, uint256 amount_) external;
    function recoverERC20AndUpdateData(address token_, uint256 amount_) external;
}

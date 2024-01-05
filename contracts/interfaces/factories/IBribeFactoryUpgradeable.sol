// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBaseFactoryUpgradeable} from "./IBaseFactoryUpgradeable.sol";

interface IBribeFactoryUpgradeable is IBaseFactoryUpgradeable {
    event BribeCreated(address indexed bribe);
    event AddedDefaultRewardToken(address indexed token);
    event RemoveDefaultRewardToken(address indexed token);

    error ZeroAddress();
    error TokenIsMissing();
    error TokenAlreadyAdded();
    error MismatchArrayLen();
    error AccessDenied();
    error RewardTokenExist();
    error RewardTokenNotExist();

    function initialize(
        address voter_,
        address permissionsRegistry_,
        address bribeImeplementation_,
        address[] calldata defaultRewardTokens_
    ) external;

    function upgradeProxiesTo(address newImplementation_) external;

    function createBribe(address owner_, address token0_, address token1_, string memory type_) external returns (address);

    function addRewardTokenToBribe(address token_, address bribe_) external;

    function addRewardTokensToBribe(address[] calldata token_, address bribe_) external;

    function addRewardTokenToBribes(address token_, address[] calldata bribes_) external;

    function addRewardTokensToBribes(address[][] calldata token_, address[] calldata bribes_) external;

    function setBribesVoter(address[] calldata bribes_, address voter_) external;

    function setBribesMinter(address[] memory bribes_, address minter_) external;

    function setBribesOwner(address[] memory bribes_, address _owner) external;

    function setVoter(address voter_) external;

    function recoverERC20From(address[] memory bribes_, address[] memory tokens_, uint256[] memory amounts_) external;

    function recoverERC20AndUpdateData(address[] calldata bribes_, address[] calldata tokens_, uint256[] calldata amounts_) external;

    function pushDefaultRewardToken(address token_) external;

    function removeDefaultRewardToken(address token_) external;

    function setPermissionsRegistry(address permissionsRegistry_) external;

    function lastBribe() external view returns (address);

    function voter() external view returns (address);

    function getDefaultRewardTokens() external view returns (address[] memory);

    function isDefaultRewardToken(address token_) external view returns (bool);

    function length() external view returns (uint256);

    function list(uint256 offset_, uint256 limit_) external view returns (address[] memory);
}

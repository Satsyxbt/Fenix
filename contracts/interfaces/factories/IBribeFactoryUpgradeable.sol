// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {IBeacon} from "@openzeppelin/contracts/proxy/beacon/IBeacon.sol";

interface IBribeFactoryUpgradeable is IBeacon {
    event Upgraded(address indexed implementation);
    event BribeCreated(address indexed bribe);

    error ZeroAddress();
    error TokenIsMissing();
    error TokenAlreadyAdded();
    error MismatchLen();

    function lastBribe() external returns (address);

    function voter() external returns (address);

    function isDefaultRewardToken(address) external returns (bool);

    function initialize(address voter_, address bribeImplementation_, address[] calldata defaultRewardTokens_) external;

    function upgradeTo(address newImplementation_) external;

    function createBribe(address owner_, address token0_, address token1_, string memory type_) external returns (address);

    function addRewardToBribe(address token_, address bribe_) external;

    function addRewardsToBribe(address[] calldata token_, address bribe_) external;

    function addRewardToBribes(address token_, address[] calldata bribes_) external;

    function addRewardsToBribes(address[][] calldata token_, address[] calldata bribes_) external;

    function setBribeVoter(address[] calldata bribes_, address voter_) external;

    function setBribeMinter(address[] memory bribes_, address minter_) external;

    function setBribeOwner(address[] memory bribes_, address _owner) external;

    function setVoter(address voter_) external;

    function recoverERC20From(address[] memory bribes_, address[] memory tokens_, uint256[] memory amounts_) external;

    function recoverERC20AndUpdateData(address[] calldata bribes_, address[] calldata tokens_, uint256[] calldata amounts_) external;

    function pushDefaultRewardToken(address token_) external;

    function removeDefaultRewardToken(address token_) external;
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import {YieldMode} from "../../integration/interfaces/IERC20Rebasing.sol";

interface IPairFactory {
    event PairCreated(address indexed token0, address indexed token1, bool stable, address pair, uint);
    event SetPaused(bool state);
    event SetDefaultBlastGovernor(address indexed defaultBlastGovernor);
    event SetCommunityVaultFactory(address indexed communityVaultFactory);
    event SetIsPublicPoolCreationMode(bool mode);
    event SetProtocolFee(uint256 fee);
    event SetCustomProtocolFee(address indexed pair, uint256 fee);
    event SetCustomFee(address indexed pair, uint256 fee);
    event SetFee(bool stable, uint256 fee);
    event SetConfigurationForRebaseToken(address indexed token, bool isRebase, YieldMode mode);

    error IncorrcectFee();
    error IncorrectPair();
    error IdenticalAddress();
    error PairExist();

    function PAIRS_ADMINISTRATOR_ROLE() external view returns (bytes32);

    function FEES_MANAGER_ROLE() external view returns (bytes32);

    function PAIRS_CREATOR_ROLE() external view returns (bytes32);

    function hasRole(bytes32 role, address user) external view returns (bool);

    function allPairsLength() external view returns (uint);

    function isPair(address pair) external view returns (bool);

    function allPairs(uint index) external view returns (address);

    function getPair(address tokenA, address token, bool stable) external view returns (address);

    function createPair(address tokenA, address tokenB, bool stable) external returns (address pair);

    function pairs() external view returns (address[] memory);

    function getFee(address pair_, bool stable_) external view returns (uint256);

    function getHookTarget(address pair_) external view returns (address);

    function getProtocolFee(address pair_) external view returns (uint256);

    function isPaused() external view returns (bool);

    function isPublicPoolCreationMode() external view returns (bool);
}

// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IPairFactory {
    function allPairsLength() external view returns (uint);

    function isPair(address pair) external view returns (bool);

    function allPairs(uint index) external view returns (address);

    function pairCodeHash() external pure returns (bytes32);

    function getPair(address tokenA, address token, bool stable) external view returns (address);

    function createPair(address tokenA, address tokenB, bool stable) external returns (address pair);

    function getInitializable() external view returns (address, address, address, bool);

    function getFee(address pair_, bool stable_) external view returns (uint256);

    function getHookTarget(address pair_) external view returns (address);

    function getProtocolFee(address pair_) external view returns (uint256);

    function isPaused() external view returns (bool);
}

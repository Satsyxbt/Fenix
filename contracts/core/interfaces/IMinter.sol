// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IMinter {
    event Mint(address indexed sender, uint256 weekly, uint256 circulating_supply);

    function update_period() external returns (uint);

    function check() external view returns (bool);

    function period() external view returns (uint);

    function active_period() external view returns (uint);
}

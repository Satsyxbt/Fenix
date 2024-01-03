// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;


interface IVotingEscrow {
    function token() external view returns (address);
    function create_lock_for(uint256 _value, uint256 _lock_duration, address _to) external returns (uint256);

}
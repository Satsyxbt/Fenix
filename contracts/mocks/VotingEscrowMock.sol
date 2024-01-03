// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

contract VotingEscrowMock  {

    address internal _token;
    
    function setToken(address a) external returns(address){
        _token = a;
    }

    function token() external view returns(address) {
        return _token;
    }

    function create_lock_for(uint256, uint256, address) external returns(uint256){
        return 0;
    }
}
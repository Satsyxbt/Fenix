// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VoterEscrowMock {
    address public token;

    function setToken(address token_) external {
        token = token_;
    }
}

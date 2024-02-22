// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract VoterMock {
    mapping(address => bool) public isGauge;
    mapping(address => address) public poolForGauge;
    address public token;

    function setGauge(address gauge_, address pool_) external {
        isGauge[gauge_] = true;
        poolForGauge[gauge_] = pool_;
    }

    function setToken(address token_) external {
        token = token_;
    }

    function notifyRewardAmount(uint256 amount_) external {
        ERC20(token).transferFrom(msg.sender, address(this), amount_);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20Mock} from "./ERC20Mock.sol";

enum YieldMode {
    AUTOMATIC,
    VOID,
    CLAIMABLE
}

contract ERC20RebasingMock is ERC20Mock {
    mapping(address => YieldMode) private _yieldMode;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20Mock(name_, symbol_, decimals_) {}

    function getConfiguration(address account) external view returns (YieldMode) {
        return _yieldMode[account];
    }

    function configure(YieldMode newYieldMode) external returns (uint256) {
        _yieldMode[msg.sender] = newYieldMode;
        return 0;
    }

    function claim(address recipient, uint256 amount) external returns (uint256) {
        return amount;
    }
}

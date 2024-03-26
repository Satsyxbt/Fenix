// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

enum YieldMode {
    AUTOMATIC,
    VOID,
    CLAIMABLE
}

contract ERC20RebasingMock {
    mapping(address => YieldMode) private _yieldMode;

    function getConfiguration(address account) public view returns (YieldMode) {
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

// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20RebasingMock} from "./ERC20RebasingMock.sol";

contract MockRebasingHolder {
    function claim(address erc20Rebasing_, address recipient_, uint256 amount_) external returns (uint256) {
        return ERC20RebasingMock(erc20Rebasing_).claim(recipient_, amount_);
    }
}

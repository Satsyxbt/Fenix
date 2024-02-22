// SPDX-License-Identifier: MIT
pragma solidity =0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IPairIntegrationInfo} from "../integration/interfaces/IPairIntegrationInfo.sol";

contract ICHIMock is ERC20 {
    address public pool;

    uint8 internal _decimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        _decimals = decimals_;
    }

    function setPool(address pool_) external {
        pool = pool_;
    }

    function token0() external returns (address) {
        return IPairIntegrationInfo(pool).token0();
    }

    function token1() external returns (address) {
        return IPairIntegrationInfo(pool).token1();
    }
}
